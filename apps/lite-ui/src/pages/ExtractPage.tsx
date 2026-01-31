import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

export const ExtractPage: React.FC = () => {
  const { client } = useApi();
  const location = useLocation();
  const [urls, setUrls] = useState(location.state?.urls || '');
  const [prompt, setPrompt] = useState('');
  const [schema, setSchema] = useState('');
  const [translate, setTranslate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    
    let parsedSchema = undefined;
    if (schema.trim()) {
        try {
            parsedSchema = JSON.parse(schema);
        } catch (e) {
            alert("Invalid JSON Schema");
            return;
        }
    }

    let finalPrompt = prompt;
    if (translate) {
      finalPrompt = (finalPrompt ? finalPrompt + "\n\n" : "") + "IMPORTANT: Translate all extracted content into English.";
    }

    try {
      const urlList = urls.split(',').map((u: string) => u.trim()).filter((u: string) => u);
      const response = await client.post('/extract', {
        urls: urlList,
        prompt: finalPrompt || undefined,
        schema: parsedSchema
      });
      setResult(response);
    } catch (err) {
      setResult({ error: 'Failed to extract' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Extract Data</h3>
          <form onSubmit={handleExtract} className="space-y-4">
            <div>
              <label htmlFor="urls">URLs (comma separated)</label>
              <textarea
                id="urls"
                className="w-full h-20"
                placeholder="https://example.com, https://another.com"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="prompt">Prompt (Optional)</label>
              <input
                id="prompt"
                type="text"
                className="w-full"
                placeholder="Extract the main article content..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="mt-2 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="translate" 
                  checked={translate} 
                  onChange={(e) => setTranslate(e.target.checked)}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="translate" className="!mb-0 !text-slate-600 font-normal normal-case cursor-pointer select-none">
                  Translate content to English
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="schema">JSON Schema (Optional)</label>
              <textarea
                id="schema"
                className="w-full h-32 font-mono text-xs"
                placeholder='{"type": "object", "properties": {"title": {"type": "string"}}}'
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full primary"
            >
              {loading ? 'Extracting...' : 'Start Extraction'}
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
