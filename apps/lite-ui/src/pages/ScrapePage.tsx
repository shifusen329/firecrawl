import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { ArrowRight, Download, Clock, List } from 'lucide-react';

export const ScrapePage: React.FC = () => {
  const { client, pollingInterval } = useApi();
  const location = useLocation();
  const [urls, setUrls] = useState(location.state?.urls || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formats, setFormats] = useState<string[]>(['markdown']);
  const [waitFor, setWaitFor] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setJobId(null);

    const urlList = urls.split(',').map((u: string) => u.trim()).filter((u: string) => u);
    
    try {
      if (urlList.length > 1) {
        // Use Batch Scrape
        const response = await client.post('/batch/scrape', {
          urls: urlList,
          formats,
          waitFor: waitFor > 0 ? waitFor : undefined,
        });
        if (response.id) {
          setJobId(response.id);
        } else {
          setResult(response);
        }
      } else {
        // Use Single Scrape
        const response = await client.post('/scrape', {
          url: urlList[0],
          formats,
          waitFor: waitFor > 0 ? waitFor : undefined,
        });
        setResult(response);
      }
    } catch (err) {
      setResult({ error: 'Failed to scrape. Please check the URL(s) and try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (jobId) {
      const checkStatus = async () => {
        const response = await client.get(`/batch/scrape/${jobId}`);
        setResult(response);
        if (response.status === 'completed' || response.status === 'failed') {
          clearInterval(interval);
        }
      };
      checkStatus();
      interval = setInterval(checkStatus, pollingInterval);
    }
    return () => clearInterval(interval);
  }, [jobId, pollingInterval]);

  const toggleFormat = (format: string) => {
    setFormats(prev => 
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-8rem)]">
      {/* Configuration Panel */}
      <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl p-6 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-500 rounded-full"></span>
            Configure Scrape
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="urls">URLs (comma separated)</label>
              <textarea
                id="urls"
                placeholder="https://example.com, https://another.com"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                required
                className="font-mono text-xs h-32"
              />
            </div>
            
            <div>
              <label>Output Formats</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['markdown', 'html', 'rawHtml', 'links', 'screenshot'].map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => toggleFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      formats.includes(fmt)
                        ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="wait" className="flex items-center gap-2">
                Wait For <span className="text-slate-400 font-normal normal-case text-xs">(milliseconds)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Clock size={14} />
                </div>
                <input
                  id="wait"
                  type="number"
                  placeholder="0"
                  className="pl-9"
                  value={waitFor}
                  onChange={(e) => setWaitFor(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full primary !bg-green-600 hover:!bg-green-700 group"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>Run Scrape <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
          </form>
        </div>

        {jobId && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-sm text-orange-800">
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <Clock size={16} /> Batch Job Active
            </h4>
            <div className="flex items-center justify-between mt-2">
              <span className="opacity-90 text-xs font-mono truncate mr-2">ID: {jobId}</span>
              <Link to={`/job/${jobId}`} className="text-xs font-bold underline hover:text-orange-900">
                View Details
              </Link>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex-1">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <List size={16} /> Workflow
          </h4>
          <p className="leading-relaxed opacity-90 text-xs">
            Passing multiple URLs will automatically trigger a <strong>Batch Scrape</strong>. 
            The system will poll for completion.
          </p>
        </div>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-8 h-full flex flex-col min-h-[500px]">
        <div className="bg-white shadow-sm border border-slate-200 rounded-xl flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Output</h3>
            {result && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                result.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                result.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {result.status || 'Success'}
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-900 p-0 relative">
            {result ? (
              <pre className="p-6 text-xs font-mono text-green-100 leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 opacity-50">
                <Download size={48} strokeWidth={1} />
                <p className="mt-4 text-sm font-medium">Ready to scrape</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};