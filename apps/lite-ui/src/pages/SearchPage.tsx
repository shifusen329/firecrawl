import { useEffect, useState } from 'react';
import { useApi } from '../context/ApiContext';
import { RefreshCw } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const { client } = useApi();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch history from API on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await client.get('/search/history');
      if (response.success && Array.isArray(response.data)) {
        setHistory(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch search history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await client.post('/search', { query });
      setResult(response);
      // Refresh history from database after successful search
      fetchHistory();
    } catch (err) {
      setResult({ error: 'Failed to search' });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = (entry: any) => {
    // Pre-fill the query from history entry (results are not stored in DB)
    setQuery(entry.query || '');
    setResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Search & Scrape</h3>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="query">Query</label>
              <input
                id="query"
                type="text"
                className="w-full"
                placeholder="search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full primary"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">History</h3>
            <button
              onClick={fetchHistory}
              disabled={historyLoading}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} />
              {historyLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {historyLoading && history.length === 0 ? (
            <div className="text-gray-400 text-sm italic">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-gray-400 text-sm italic">
              No previous searches yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {history.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => loadHistory(entry)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-colors"
                >
                  <div className="text-xs font-medium text-slate-800 truncate">{entry.query || 'Unknown query'}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-500">{new Date(entry.created_at).toLocaleString()}</span>
                    <span className={`text-[10px] ${entry.is_successful ? 'text-green-500' : 'text-red-500'}`}>
                      {entry.is_successful ? `${entry.num_results || 0} results` : 'failed'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow sm:rounded-lg p-6 h-[calc(100vh-8rem)] overflow-auto">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Result</h3>
        {result ? (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : (
          <div className="text-gray-400 text-sm italic">
            Results will appear here...
          </div>
        )}
      </div>
    </div>
  );
};
