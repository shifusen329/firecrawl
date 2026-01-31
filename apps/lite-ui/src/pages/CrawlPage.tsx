import { useState, useEffect } from 'react';
import { useApi } from '../context/ApiContext';

export const CrawlPage: React.FC = () => {
  const { client } = useApi();
  const [url, setUrl] = useState('');
  const [limit, setLimit] = useState(10);
  const [maxDepth, setMaxDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(() => localStorage.getItem('active_crawl_id'));
  const [jobStatus, setJobStatus] = useState<any>(null);

  useEffect(() => {
    if (jobId) {
      localStorage.setItem('active_crawl_id', jobId);
    } else {
      localStorage.removeItem('active_crawl_id');
    }
  }, [jobId]);

  useEffect(() => {
    let interval: any;
    if (jobId) {
      checkStatus(jobId);
      interval = setInterval(() => checkStatus(jobId), 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId]);

  const checkStatus = async (id: string) => {
    try {
      const response = await client.get(`/crawl/${id}`);
      setJobStatus(response);
      
      // If completed or failed, we could stop polling, but for "lite" we keep it simple
      if (response.status === 'completed' || response.status === 'failed') {
          // keep it for display
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  };

  const startCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setJobId(null);
    setJobStatus(null);
    try {
      const response = await client.post('/crawl', {
        url,
        limit,
        maxDepth,
        scrapeOptions: { formats: ['markdown'] }
      });
      console.log("Crawl Response:", response);
      if (response.id) {
        setJobId(response.id);
      } else if (response.success === false) {
        setJobStatus(response);
      }
    } catch (err) {
      setJobStatus({ error: 'Failed to start crawl', details: err });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Start New Crawl</h3>
          <form onSubmit={startCrawl} className="space-y-4">
            <div>
              <label htmlFor="url">Base URL</label>
              <input
                id="url"
                type="text"
                className="w-full"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            
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

            <button
              type="submit"
              disabled={loading}
              className="w-full primary"
            >
              {loading ? 'Starting...' : 'Start Crawl'}
            </button>
          </form>
        </div>

        {jobId && (
            <div className="bg-white shadow sm:rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-2">Job Control</h4>
                <div className="flex gap-2">
                    <button onClick={() => checkStatus(jobId)} className="secondary text-sm">Refresh Status</button>
                    <button onClick={() => setJobId(null)} className="secondary text-sm">Clear</button>
                </div>
            </div>
        )}
      </div>

      <div className="bg-white shadow sm:rounded-lg p-6 h-[calc(100vh-8rem)] overflow-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Job Status</h3>
        {jobStatus ? (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(jobStatus, null, 2)}
          </pre>
        ) : (
          <div className="text-gray-400 text-sm italic">
            Start a crawl to see status updates...
          </div>
        )}
      </div>
    </div>
  );
};
