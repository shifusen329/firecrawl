import { useState } from 'react';
import { useApi } from '../context/ApiContext';

export const MapPage: React.FC = () => {
  const { client } = useApi();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await client.post('/map', { url });
      setResult(response);
    } catch (err) {
      setResult({ error: 'Failed to map website' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Map Website</h3>
          <form onSubmit={handleMap} className="space-y-4">
            <div>
              <label htmlFor="url">URL</label>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full primary"
            >
              {loading ? 'Mapping...' : 'Map URL'}
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
