import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { Sparkles, Plus, FileJson, ArrowRight, Loader2, Globe, ListChecks } from 'lucide-react';

export const AgentPage: React.FC = () => {
  const { client, pollingInterval } = useApi();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [contextUrls, setContextUrls] = useState<string[]>(location.state?.contextUrls || []);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const runAgent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setStatus(null);
    
    // Append context URLs to the query if present
    let finalQuery = query;
    if (contextUrls.length > 0) {
      finalQuery += `\n\nContext URLs to consider:\n${contextUrls.map(u => `- ${u}`).join('\n')}`;
    }

    try {
      const response = await client.post('/deep-research', {
        query: finalQuery,
        maxDepth: 3,
        maxUrls: 10,
      });
      if (response.id) {
        setJobId(response.id);
        const newSession = { id: response.id, query, timestamp: new Date().toISOString() };
        setSessions([newSession, ...sessions]);
      } else {
        setStatus(response);
      }
    } catch (err) {
      setStatus({ error: 'Failed to start agent', details: err });
    } finally {
      setLoading(false);
    }
  };

  const addUrl = () => {
    if (urlInput.trim()) {
      setContextUrls([...contextUrls, urlInput.trim()]);
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Simple regex to find URLs in the CSV text
      const urlRegex = /(https?:\/\/[^\s,]+)/g;
      const foundUrls = text.match(urlRegex) || [];
      const uniqueUrls = Array.from(new Set([...contextUrls, ...foundUrls]));
      setContextUrls(uniqueUrls);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  useEffect(() => {
    let interval: any;
    if (jobId) {
      const checkStatus = async () => {
        const response = await client.get(`/deep-research/${jobId}`);
        setStatus(response);
        if (response.data?.status === 'completed' || response.data?.status === 'failed') {
          clearInterval(interval);
        }
      };
      checkStatus();
      interval = setInterval(checkStatus, pollingInterval);
    }
    return () => clearInterval(interval);
  }, [jobId, pollingInterval]);

  const suggestions = [
    "Get the founders of Firecrawl, Pylon, and Mintlify",
    "Market cap, P/E ratio, profit margin for Apple, Microsoft, Google",
    "Top 3 Hacker News stories today, then get me the top 3 comments for each"
  ];

  if (jobId || status) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
            Agent Session
          </h2>
          <button onClick={() => { setJobId(null); setStatus(null); setQuery(''); setContextUrls([]); }} className="secondary py-1 text-xs">
            <Plus size={14} className="mr-1" /> New Session
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Progress Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Sparkles size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Researching Query</p>
                <p className="text-white font-medium">{query}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                 status?.data?.status === 'completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                 status?.data?.status === 'failed' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                 'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
               }`}>
                 {status?.data?.status || 'initializing'}
               </span>
            </div>
          </div>

          <div className="p-0 flex flex-col md:flex-row h-[600px]">
            {/* Sidebar: Activities */}
            <div className="w-full md:w-80 border-r border-slate-800 flex flex-col">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 text-slate-400">
                <ListChecks size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Activities</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {status?.data?.activities?.map((act: any, i: number) => (
                  <div key={i} className="flex gap-3 animate-in slide-in-from-left duration-300">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0"></div>
                    <div>
                      <p className="text-xs text-white leading-relaxed">{act.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{new Date(act.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {!status?.data?.activities && (
                  <div className="flex items-center justify-center h-full text-slate-600 italic text-sm">
                    Waiting for activity logs...
                  </div>
                )}
              </div>
            </div>

            {/* Main Result Area */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-8">
              {status?.data?.finalAnalysis ? (
                <div className="prose prose-invert prose-orange max-w-none">
                  <div className="text-slate-200 leading-relaxed whitespace-pre-wrap font-sans text-lg">
                    {status.data.finalAnalysis}
                  </div>
                  
                  {status.data.sources && status.data.sources.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-slate-800">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Globe size={14} /> Sources
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {status.data.sources.map((source: any, i: number) => (
                          <a key={i} href={source.url} target="_blank" rel="noreferrer" className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 transition-colors group">
                            <p className="text-xs font-medium text-white group-hover:text-orange-500 truncate">{source.title || source.url}</p>
                            <p className="text-[10px] text-slate-500 mt-1 truncate">{source.url}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-20 animate-pulse"></div>
                    <Loader2 size={48} className="text-orange-500 animate-spin relative z-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white">Thinking...</h3>
                    <p className="text-slate-400 mt-2 max-w-md">
                      The Firecrawl Agent is currently analyzing search results and synthesizing your report.
                    </p>
                  </div>
                  
                  {/* Stats during loading */}
                  <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-sm">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Depth</p>
                      <p className="text-xl font-bold text-white mt-1">{status?.data?.currentDepth || 0}</p>
                    </div>
                    <div className="text-center border-x border-slate-800">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">URLs</p>
                      <p className="text-xl font-bold text-white mt-1">{status?.data?.totalUrls || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Time</p>
                      <p className="text-xl font-bold text-white mt-1">{status?.data?.activities?.length || 0}s</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col justify-center animate-in zoom-in-95 duration-700">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          What data do you want to gather?
        </h1>
        <p className="text-slate-500 text-lg">
          Firecrawl Agent will search, scrape, and synthesize the information for you.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto w-full group">
        {/* Input Glow Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000 group-focus-within:duration-200"></div>
        
        <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={runAgent} className="p-2">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-100 relative">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 border border-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={12} /> Deep Research
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              
              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className={`text-slate-400 hover:text-slate-600 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${showUrlInput ? 'bg-slate-100 text-slate-700' : ''}`}
                >
                  <Plus size={14} /> Add URLs
                </button>
                
                {showUrlInput && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full text-xs p-2 rounded border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={addUrl}
                      className="mt-2 w-full bg-orange-500 text-white text-xs font-bold py-1.5 rounded hover:bg-orange-600 transition-colors"
                    >
                      Add URL
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors"
                >
                  <FileJson size={14} /> CSV
                </button>
                <input 
                  id="csv-upload"
                  type="file" 
                  accept=".csv,.txt" 
                  className="hidden" 
                  onChange={handleCsvUpload}
                />
              </div>
            </div>
            
            {contextUrls.length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-2">
                {contextUrls.map((url, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100">
                    <Globe size={10} />
                    <span className="max-w-[150px] truncate">{url}</span>
                    <button 
                      type="button"
                      onClick={() => setContextUrls(contextUrls.filter((_, idx) => idx !== i))}
                      className="hover:text-blue-900 ml-1"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <div className="relative flex items-end">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask agent to get all GitHub repos with 10k+ stars in the AI category..."
                className="w-full border-none shadow-none ring-0 focus:ring-0 text-base md:text-lg resize-none min-h-[120px] p-4 bg-transparent placeholder:text-slate-300"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    runAgent();
                  }
                }}
              />
              <div className="p-3">
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="primary py-3 px-6 rounded-xl text-base font-bold shadow-lg shadow-orange-500/20"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>Run Agent <ArrowRight size={18} className="ml-2" /></>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => setQuery(s)}
            className="p-4 text-left rounded-xl border border-slate-200 bg-white hover:border-orange-500 hover:shadow-md transition-all group"
          >
            <p className="text-sm text-slate-600 group-hover:text-slate-900 line-clamp-2 leading-relaxed">
              {s}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
