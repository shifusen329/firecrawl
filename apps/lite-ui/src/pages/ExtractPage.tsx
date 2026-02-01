import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApi } from '../context/ApiContext';

export const ExtractPage: React.FC = () => {
  const { client } = useApi();
  const location = useLocation();
  const [urls, setUrls] = useState(location.state?.urls || '');
  const [prompt, setPrompt] = useState('');
  const [schema, setSchema] = useState('');
  const [optimize, setOptimize] = useState(false);
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
    if (optimize) {
      const instructions = `
IMPORTANT INSTRUCTIONS FOR LLM CONTEXT OPTIMIZATION:
1. Translate all content to English.
2. Format output as clean, concise Markdown.
3. REMOVE all hyperlinks (keep the anchor text, strip the URL).
4. Fix broken formatting, weird whitespace, and artifacts.
5. Correctly handle nested code blocks (e.g. use 4 backticks for outer blocks if inner blocks exist).
6. Optimize for Token Efficiency: Remove navigation menus, footers, ads, and redundant filler. Keep only context-relevant information.
`;
      finalPrompt = (finalPrompt ? finalPrompt + "\n" : "") + instructions;
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
              <div className="mt-3 flex items-start gap-2 p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <input 
                  type="checkbox" 
                  id="optimize" 
                  checked={optimize} 
                  onChange={(e) => setOptimize(e.target.checked)}
                  className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <div>
                  <label htmlFor="optimize" className="!mb-0 !text-orange-900 font-medium cursor-pointer select-none">
                    Optimize for LLM Context
                  </label>
                  <p className="text-xs text-orange-700/80 mt-0.5 leading-relaxed">
                    Translates to English, removes links, fixes nested code blocks, and strips token-wasting fluff.
                  </p>
                </div>
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
