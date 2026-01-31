import { useState } from 'react';
import { useApi } from '../context/ApiContext';

export const SearchPage: React.FC = () => {
  const { client } = useApi();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await client.post('/search', { query });
      setResult(response);
    } catch (err) {
      setResult({ error: 'Failed to search' });
    } finally {
      setLoading(false);
    }
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
