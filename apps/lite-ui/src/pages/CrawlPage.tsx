import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';
import { useNavigate } from 'react-router-dom';
import { Globe, FileText, Copy, Check, Download, Sparkles, ArrowRight } from 'lucide-react';

type CrawlMode = 'standard' | 'llmstxt';

export const CrawlPage: React.FC = () => {
  const { client, pollingInterval } = useApi();
  const navigate = useNavigate();

  // Mode selection
  const [mode, setMode] = useState<CrawlMode>('standard');

  // Common fields
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Standard crawl fields
  const [limit, setLimit] = useState(10);
  const [maxDepth, setMaxDepth] = useState(2);
  const [jobId, setJobId] = useState<string | null>(() => localStorage.getItem('active_crawl_id'));
  const [jobStatus, setJobStatus] = useState<any>(null);

  // LLMs.txt fields
  const [maxUrls, setMaxUrls] = useState(50);
  const [showFullText, setShowFullText] = useState(false);
  const [llmstxtJobId, setLlmstxtJobId] = useState<string | null>(() => localStorage.getItem('active_llmstxt_id'));
  const [llmstxtStatus, setLlmstxtStatus] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Persist job IDs
  useEffect(() => {
    if (jobId) {
      localStorage.setItem('active_crawl_id', jobId);
    } else {
      localStorage.removeItem('active_crawl_id');
    }
  }, [jobId]);

  useEffect(() => {
    if (llmstxtJobId) {
      localStorage.setItem('active_llmstxt_id', llmstxtJobId);
    } else {
      localStorage.removeItem('active_llmstxt_id');
    }
  }, [llmstxtJobId]);

  // Poll standard crawl status
  useEffect(() => {
    let interval: any;
    if (jobId && mode === 'standard') {
      checkCrawlStatus(jobId);
      interval = setInterval(() => checkCrawlStatus(jobId), pollingInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, pollingInterval, mode]);

  // Poll llmstxt status
  useEffect(() => {
    let interval: any;
    if (llmstxtJobId && mode === 'llmstxt') {
      checkLlmstxtStatus(llmstxtJobId);
      interval = setInterval(() => checkLlmstxtStatus(llmstxtJobId), pollingInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [llmstxtJobId, pollingInterval, mode]);

  const checkCrawlStatus = async (id: string) => {
    try {
      const response = await client.get(`/crawl/${id}`);
      setJobStatus(response);
    } catch (err) {
      console.error("Poll error:", err);
    }
  };

  const checkLlmstxtStatus = async (id: string) => {
    try {
      const response = await client.get(`/llmstxt/${id}`);
      setLlmstxtStatus(response);
      // Stop polling if completed or failed
      if (response.status === 'completed' || response.status === 'failed') {
        // Job is done, polling will continue but that's fine for simplicity
      }
    } catch (err) {
      console.error("LLMsTxt poll error:", err);
    }
  };

  const startCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'standard') {
      setJobId(null);
      setJobStatus(null);
      try {
        const response = await client.post('/crawl', {
          url,
          limit,
          maxDepth,
          scrapeOptions: { formats: ['markdown'] }
        });
        if (response.id) {
          setJobId(response.id);
        } else if (response.success === false) {
          setJobStatus(response);
        }
      } catch (err) {
        setJobStatus({ error: 'Failed to start crawl', details: err });
      }
    } else {
      // LLMs.txt mode
      setLlmstxtJobId(null);
      setLlmstxtStatus(null);
      try {
        const response = await client.post('/llmstxt', {
          url,
          maxUrls,
          showFullText
        });
        if (response.id) {
          setLlmstxtJobId(response.id);
        } else if (response.success === false) {
          setLlmstxtStatus(response);
        }
      } catch (err) {
        setLlmstxtStatus({ error: 'Failed to start LLMs.txt generation', details: err });
      }
    }

    setLoading(false);
  };

  const copyToClipboard = () => {
    const text = llmstxtStatus?.data?.llmstxt || '';
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const text = llmstxtStatus?.data?.llmstxt || '';
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llmstxt-output.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendToAgent = () => {
    const text = llmstxtStatus?.data?.llmstxt || '';
    navigate('/agent', { state: { prefillContext: text } });
  };

  const clearJob = () => {
    if (mode === 'standard') {
      setJobId(null);
      setJobStatus(null);
    } else {
      setLlmstxtJobId(null);
      setLlmstxtStatus(null);
    }
  };

  const activeJobId = mode === 'standard' ? jobId : llmstxtJobId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            Crawl Website
          </h3>

          {/* Mode Toggle */}
          <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Output Mode</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('standard')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  mode === 'standard'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={16} className={mode === 'standard' ? 'text-green-600' : 'text-slate-500'} />
                  <span className={`font-medium text-sm ${mode === 'standard' ? 'text-green-700' : 'text-slate-700'}`}>
                    Standard Crawl
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Individual pages as separate documents (async job)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('llmstxt')}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  mode === 'llmstxt'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} className={mode === 'llmstxt' ? 'text-orange-600' : 'text-slate-500'} />
                  <span className={`font-medium text-sm ${mode === 'llmstxt' ? 'text-orange-700' : 'text-slate-700'}`}>
                    LLMs.txt
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Single concatenated markdown for LLM context
                </p>
              </button>
            </div>
          </div>

          <form onSubmit={startCrawl} className="space-y-4">
            <div>
              <label htmlFor="url">Base URL</label>
              <input
                id="url"
                type="text"
                className="w-full font-mono text-sm"
                placeholder="https://docs.example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            {mode === 'standard' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="limit">Page Limit</label>
                  <input
                    id="limit"
                    type="number"
                    className="w-full"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label htmlFor="depth">Max Depth</label>
                  <input
                    id="depth"
                    type="number"
                    className="w-full"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="maxUrls">Max URLs to Process</label>
                  <input
                    id="maxUrls"
                    type="number"
                    className="w-full"
                    value={maxUrls}
                    onChange={(e) => setMaxUrls(Number(e.target.value))}
                    min={1}
                    max={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">Maximum pages to include in output (1-500)</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="showFullText"
                    type="checkbox"
                    checked={showFullText}
                    onChange={(e) => setShowFullText(e.target.checked)}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="showFullText" className="text-sm text-slate-700 cursor-pointer">
                    Include full text (larger output)
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full group ${mode === 'llmstxt' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'primary'}`}
            >
              {loading ? 'Starting...' : (
                <>
                  {mode === 'standard' ? 'Start Crawl' : 'Generate LLMs.txt'}
                  <ArrowRight size={16} className="ml-2 inline group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {activeJobId && (
          <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-4">
            <h4 className="font-medium text-slate-900 mb-2 text-sm">Job Control</h4>
            <div className="flex gap-2">
              <button
                onClick={() => mode === 'standard' ? checkCrawlStatus(activeJobId) : checkLlmstxtStatus(activeJobId)}
                className="secondary text-sm"
              >
                Refresh Status
              </button>
              <button onClick={clearJob} className="secondary text-sm">Clear</button>
            </div>
            <p className="text-xs text-slate-500 mt-2 font-mono">{activeJobId}</p>
          </div>
        )}

        {/* Info box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
          {mode === 'standard' ? (
            <>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Globe size={16} /> Standard Crawl
              </h4>
              <p className="leading-relaxed opacity-90">
                Crawls the website and returns each page as a separate document.
                Results can be exported as a ZIP file from the Dashboard.
              </p>
            </>
          ) : (
            <>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText size={16} /> LLMs.txt Mode
              </h4>
              <p className="leading-relaxed opacity-90">
                Generates a single concatenated markdown document optimized for LLM context windows.
                Perfect for feeding documentation to AI assistants.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-200 rounded-xl h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">
            {mode === 'standard' ? 'Job Status' : 'Generated Output'}
          </h3>

          {mode === 'llmstxt' && llmstxtStatus?.status === 'completed' && llmstxtStatus?.data?.llmstxt && (
            <div className="flex gap-2">
              <button onClick={copyToClipboard} className="secondary py-1 text-xs" title="Copy to clipboard">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button onClick={downloadMarkdown} className="secondary py-1 text-xs" title="Download as .md">
                <Download size={14} />
              </button>
              <button
                onClick={sendToAgent}
                className="secondary py-1 text-xs text-orange-700 hover:bg-orange-50 border-orange-200"
                title="Send to Agent"
              >
                <Sparkles size={14} className="mr-1" /> Agent
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {mode === 'standard' ? (
            // Standard crawl output
            jobStatus ? (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(jobStatus, null, 2)}
              </pre>
            ) : (
              <div className="text-slate-400 text-sm italic">
                Start a crawl to see status updates...
              </div>
            )
          ) : (
            // LLMs.txt output
            llmstxtStatus ? (
              llmstxtStatus.status === 'processing' ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-sm font-medium">Generating LLMs.txt...</p>
                  <p className="text-xs mt-1">This may take a moment depending on site size</p>
                </div>
              ) : llmstxtStatus.status === 'completed' && llmstxtStatus.data?.llmstxt ? (
                <div className="prose prose-sm max-w-none">
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-auto whitespace-pre-wrap font-mono leading-relaxed">
                    {llmstxtStatus.data.llmstxt}
                  </pre>
                  {showFullText && llmstxtStatus.data.llmsfulltxt && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                        Show Full Text
                      </summary>
                      <pre className="bg-slate-800 text-slate-200 p-4 rounded-lg text-xs overflow-auto whitespace-pre-wrap mt-2">
                        {llmstxtStatus.data.llmsfulltxt}
                      </pre>
                    </details>
                  )}
                </div>
              ) : llmstxtStatus.status === 'failed' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">Generation Failed</p>
                  <p className="text-red-600 text-sm mt-1">{llmstxtStatus.error || 'Unknown error'}</p>
                </div>
              ) : (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(llmstxtStatus, null, 2)}
                </pre>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                <FileText size={48} strokeWidth={1} />
                <p className="mt-4 text-sm font-medium">Ready to generate</p>
                <p className="text-xs mt-1">Enter a URL and click Generate LLMs.txt</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
