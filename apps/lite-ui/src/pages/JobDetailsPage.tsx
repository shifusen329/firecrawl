import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { ArrowLeft, Download, RefreshCw, FileText, Code, CheckCircle, XCircle, Clock, Archive } from 'lucide-react';
import JSZip from 'jszip';

export const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { client, pollingInterval } = useApi();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const fetchJob = async () => {
    setLoading(true);
    try {
      // Try batch scrape endpoint first, then crawl endpoint if that fails or returns 404
      // Actually, they often share the same underlying storage, but let's try batch first as it's our focus
      let response = await client.get(`/batch/scrape/${id}`);
      
      if (response.status === 404 || response.error) {
         response = await client.get(`/crawl/${id}`);
      }
      
      setJob(response);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, pollingInterval);
    return () => clearInterval(interval);
  }, [id, pollingInterval]);

  const downloadJSON = () => {
    if (!job?.data) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(job.data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `firecrawl_job_${id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const downloadCSV = () => {
    if (!job?.data || !Array.isArray(job.data)) return;
    
    // Flatten metadata for CSV
    const items = job.data.map((item: any) => {
      const { metadata, ...rest } = item;
      return { url: item.url, ...metadata, ...rest };
    });

    if (items.length === 0) return;

    const replacer = (_key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(items[0]);
    const csv = [
      header.join(','),
      ...items.map((row: any) => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `firecrawl_job_${id}.csv`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const downloadZip = async () => {
    if (!job?.data || !Array.isArray(job.data)) return;

    const zip = new JSZip();
    const folder = zip.folder(`firecrawl_job_${id}`);

    job.data.forEach((doc: any, index: number) => {
      // Create a filename from title or url
      let filename = `doc_${index + 1}.md`;
      if (doc.metadata?.title) {
        filename = doc.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.md';
      } else if (doc.url) {
        try {
            const urlObj = new URL(doc.url);
            const path = urlObj.pathname.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            filename = (path || 'index') + '.md';
        } catch (e) {}
      }

      // Clean content
      const content = doc.markdown || doc.html || '';
      // Add a header with source URL for LLM context
      const fileContent = `---
url: ${doc.url}
title: ${doc.metadata?.title || 'Unknown'}
---

${content}`;

      folder?.file(filename, fileContent);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", `firecrawl_job_${id}.zip`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!job && loading) return <div className="p-8 text-center">Loading job details...</div>;
  if (!job) return <div className="p-8 text-center">Job not found</div>;

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Job Details
              <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{id}</span>
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize border ${ 
                job.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                job.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {job.status === 'completed' ? <CheckCircle size={12} /> : 
                 job.status === 'failed' ? <XCircle size={12} /> : <Clock size={12} />}
                {job.status}
              </span>
              <span className="text-xs text-slate-500">
                {job.completed} / {job.total} pages processed
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadZip} className="secondary py-1.5 text-xs flex items-center gap-2 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100">
            <Archive size={14} /> ZIP (Markdown)
          </button>
          <button onClick={downloadJSON} className="secondary py-1.5 text-xs flex items-center gap-2">
            <FileText size={14} /> JSON
          </button>
          <button onClick={downloadCSV} className="secondary py-1.5 text-xs flex items-center gap-2">
            <Download size={14} /> CSV
          </button>
          <button onClick={fetchJob} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* URL List */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-medium text-sm text-slate-700">
            Pages ({job.data?.length || 0})
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {job.data?.map((doc: any, i: number) => (
              <button
                key={i}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${ 
                  selectedDoc === doc 
                    ? 'bg-orange-50 border-orange-200 text-orange-900' 
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-medium truncate">{doc.metadata?.title || 'No Title'}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{doc.url}</div>
              </button>
            ))}
            {(!job.data || job.data.length === 0) && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No data available yet...
              </div>
            )}
          </div>
        </div>

        {/* Content Viewer */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {selectedDoc ? (
            <>
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className="text-slate-400 flex-shrink-0" />
                  <a href={selectedDoc.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate">
                    {selectedDoc.url}
                  </a>
                </div>
                <div className="flex gap-2">
                   {/* Format toggles could go here */}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-0 bg-slate-900">
                <pre className="p-6 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedDoc.markdown || selectedDoc.html || JSON.stringify(selectedDoc, null, 2)}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Code size={48} strokeWidth={1} className="mb-4 opacity-50" />
              <p>Select a page to view its content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
