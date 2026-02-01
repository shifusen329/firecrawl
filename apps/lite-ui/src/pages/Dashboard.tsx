import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { RefreshCw, Trash2, Activity, FileText, Globe, Database, Search, Bug, Sparkles } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { client, pollingInterval } = useApi();
  const [activeCrawls, setActiveCrawls] = useState<any[]>([]);
  const [completedCrawls, setCompletedCrawls] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    
    try {
      const [active, completed] = await Promise.all([
        client.get('/crawl/active'),
        client.get('/crawl/completed'),
      ]);
      if (active.success) {
        setActiveCrawls(active.crawls || []);
      } else {
        setError(active.error || 'Failed to fetch active crawls');
      }
      if (completed.success) {
        setCompletedCrawls(completed.crawls || []);
      } else {
        setError(completed.error || 'Failed to fetch completed crawls');
      }
      
    } catch (err) {
      console.error("Dashboard error:", err);
      setError('Could not connect to Firecrawl API. Please check your configuration.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, pollingInterval);
    return () => clearInterval(interval);
  }, [pollingInterval]);

  const cancelCrawl = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this crawl?')) return;
    await client.delete(`/crawl/${id}`);
    fetchData();
  };

  const getJobType = (crawl: any) => {
    const hasScrapeUrls = Array.isArray(crawl?.options?.scrapeOptions?.urls);
    return hasScrapeUrls ? 'scrape' : 'crawl';
  };

  const jobs = [
    ...activeCrawls.map(c => ({ ...c, status: c.status || 'active', type: getJobType(c) })),
    ...completedCrawls.map(c => ({ ...c, status: c.status || 'completed', type: getJobType(c) })),
  ]
    .filter(job => job && job.id)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const jobTypeIcon = (type: string) => {
    switch (type) {
      case 'scrape':
        return <FileText size={14} className="text-slate-500" />;
      case 'map':
        return <Database size={14} className="text-slate-500" />;
      case 'search':
        return <Search size={14} className="text-slate-500" />;
      case 'extract':
        return <Bug size={14} className="text-slate-500" />;
      case 'agent':
        return <Sparkles size={14} className="text-slate-500" />;
      case 'crawl':
      default:
        return <Globe size={14} className="text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-slate-500 mt-1">Overview of your local Firecrawl instance.</p>
        </div>
        <button 
          onClick={fetchData} 
          disabled={refreshing}
          className="secondary"
        >
          <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} /> 
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500"></div>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatsCard 
          title="Total Jobs" 
          value={activeCrawls.length + completedCrawls.length} 
          icon={<Activity size={24} className="text-blue-600" />}
          loading={refreshing && activeCrawls.length === 0}
        />
        <StatsCard 
          title="Completed" 
          value={completedCrawls.length} 
          icon={<div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">✓</div>}
          loading={refreshing && activeCrawls.length === 0}
        />
        <StatsCard 
          title="Processing / Failed" 
          value={activeCrawls.length} 
          icon={<div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">⚡</div>}
          loading={refreshing && activeCrawls.length === 0}
        />
      </div>

      {/* Unified Jobs List */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Jobs</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            {jobs.length} Total
          </span>
        </div>
        <ul role="list" className="divide-y divide-slate-100">
          {jobs.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Activity size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No jobs found</p>
              <p className="text-slate-400 text-sm mt-1">Start a new job from the navigation tabs</p>
            </li>
          ) : (
            jobs.map((job) => (
              <li key={job.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Link to={`/job/${job.id}`} className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-colors">
                        {job.id.substring(0, 8)}...
                      </Link>
                      <a href={job.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 hover:text-orange-600 transition-colors truncate max-w-md">
                        {job.url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {jobTypeIcon(job.type)}
                      <span className="capitalize">{job.type}</span>
                      <span className="text-slate-300">•</span>
                      <span>{new Date(job.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={job.status} />
                    {job.status !== 'completed' && (
                      <button 
                        onClick={() => cancelCrawl(job.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel Crawl"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="text-center text-xs text-slate-400 mt-8">
        Connected to: <span className="font-mono">{client.getEndpointBaseUrl()}</span>
      </div>
    </div>
  );
};

const StatsCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; loading?: boolean }> = ({ title, value, icon, loading }) => (
  <div className="bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl p-6 relative group hover:border-orange-200 transition-colors">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="mt-2 flex items-baseline">
          {loading ? (
             <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-semibold text-slate-900">{value}</p>
          )}
        </div>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-100">
        {icon}
      </div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    active: 'bg-blue-50 text-blue-700 border-blue-200',
    scraping: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const defaultStyle = 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${styles[status] || defaultStyle}`}>
      {status}
    </span>
  );
};
