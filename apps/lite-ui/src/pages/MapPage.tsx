import { useState } from 'react';
import { useApi } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import { Database, ArrowRight, Sparkles, Bug, Copy, Check, FileText } from 'lucide-react';

export const MapPage: React.FC = () => {
  const { client } = useApi();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const handleMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setSelectedUrls(new Set());
    try {
      const response = await client.post('/map', { url });
      setResult(response);
      // Auto-select all by default if links are found
      if (response.links && Array.isArray(response.links)) {
        setSelectedUrls(new Set(response.links));
      } else if (response.data && Array.isArray(response.data)) {
         // Handle v1 structure where links might be in data
         setSelectedUrls(new Set(response.data));
      }
    } catch (err) {
      setResult({ error: 'Failed to map website' });
    } finally {
      setLoading(false);
    }
  };

  const getLinks = (): string[] => {
    if (!result) return [];
    if (Array.isArray(result.links)) return result.links;
    if (Array.isArray(result.data)) return result.data;
    return [];
  };

  const toggleUrl = (link: string) => {
    const newSet = new Set(selectedUrls);
    if (newSet.has(link)) {
      newSet.delete(link);
    } else {
      newSet.add(link);
    }
    setSelectedUrls(newSet);
  };

  const toggleAll = () => {
    const links = getLinks();
    if (selectedUrls.size === links.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(links));
    }
  };

  const sendToAgent = () => {
    navigate('/', { state: { contextUrls: Array.from(selectedUrls) } });
  };

  const sendToExtract = () => {
    navigate('/extract', { state: { urls: Array.from(selectedUrls).join(', ') } });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(Array.from(selectedUrls).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const links = getLinks();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
      <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
            Map Website
          </h3>
          <form onSubmit={handleMap} className="space-y-5">
            <div>
              <label htmlFor="url">Base URL</label>
              <input
                id="url"
                type="text"
                className="w-full font-mono text-sm"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full primary group"
            >
              {loading ? 'Mapping...' : (
                <>Map URL <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 flex-1">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Database size={16} /> Discovery
          </h4>
          <p className="leading-relaxed opacity-90">
            Mapping discovers all accessible pages on a website without downloading their content. 
            Use the results to feed the Agent or Extractor.
          </p>
        </div>
      </div>

      <div className="lg:col-span-8 h-full flex flex-col min-h-[500px]">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              Results 
              {links.length > 0 && <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{links.length}</span>}
            </h3>
            
            {links.length > 0 && (
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="secondary py-1 text-xs" title="Copy selected">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <div className="h-6 w-px bg-slate-200 my-auto"></div>
                <button 
                  onClick={sendToExtract}
                  disabled={selectedUrls.size === 0}
                  className="secondary py-1 text-xs text-blue-700 hover:bg-blue-50 border-blue-200"
                >
                  <Bug size={14} className="mr-1" /> Send to Extract
                </button>
                <button 
                  onClick={() => navigate('/scrape', { state: { urls: Array.from(selectedUrls).join(', ') } })}
                  disabled={selectedUrls.size === 0}
                  className="secondary py-1 text-xs text-green-700 hover:bg-green-50 border-green-200"
                >
                  <FileText size={14} className="mr-1" /> Send to Scrape
                </button>
                <button 
                  onClick={sendToAgent}
                  disabled={selectedUrls.size === 0}
                  className="secondary py-1 text-xs text-orange-700 hover:bg-orange-50 border-orange-200"
                >
                  <Sparkles size={14} className="mr-1" /> Send to Agent
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto bg-slate-50 p-0 relative">
            {links.length > 0 ? (
              <div className="divide-y divide-slate-100">
                <div className="bg-slate-100/50 px-6 py-2 border-b border-slate-200 flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={selectedUrls.size === links.length && links.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select All</span>
                </div>
                {links.map((link, i) => (
                  <label key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-white cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      checked={selectedUrls.has(link)}
                      onChange={() => toggleUrl(link)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-mono text-slate-600 group-hover:text-slate-900 truncate">{link}</span>
                  </label>
                ))}
              </div>
            ) : result ? (
               <div className="p-8 text-center text-slate-500">
                 <p>No links found or raw output:</p>
                 <pre className="mt-4 text-xs bg-slate-100 p-4 rounded text-left overflow-auto max-h-60">
                   {JSON.stringify(result, null, 2)}
                 </pre>
               </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-50">
                <Database size={48} strokeWidth={1} />
                <p className="mt-4 text-sm font-medium">Ready to map</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
