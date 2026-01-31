import React, { useEffect, useState } from 'react';
import { useApi } from '../context/ApiContext';
import { RefreshCw, Trash2, Coins, Key, Activity } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { client } = useApi();
  const [creditUsage, setCreditUsage] = useState<any>(null);
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [activeCrawls, setActiveCrawls] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    // Remove setError('') from here to avoid flashing if one succeeds
    
    try {
      // Fetch everything individually so one failure doesn't kill the dashboard
      client.get('/team/credit-usage').then(res => setCreditUsage(res.data)).catch(e => console.warn("Credits fail:", e));
      client.get('/team/token-usage').then(res => setTokenUsage(res.data)).catch(e => console.warn("Tokens fail:", e));
      
      const crawls = await client.get('/crawl/active');
      console.log("Active Crawls:", crawls);
      if (crawls.success) {
         setActiveCrawls(crawls.crawls || []);
      } else {
         setError(crawls.error || 'Failed to fetch active crawls');
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const cancelCrawl = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this crawl?')) return;
    await client.delete(`/crawl/${id}`);
    fetchData();
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
          title="Remaining Credits" 
          value={creditUsage ? creditUsage.remaining_credits?.toLocaleString() : '---'} 
          icon={<Coins size={24} className="text-orange-600" />}
          loading={refreshing && !creditUsage}
        />
        <StatsCard 
          title="Remaining Tokens" 
          value={tokenUsage ? tokenUsage.remaining_tokens?.toLocaleString() : '---'} 
          icon={<Key size={24} className="text-blue-600" />}
          loading={refreshing && !tokenUsage}
        />
        <StatsCard 
          title="Active Crawls" 
          value={activeCrawls.length} 
          icon={<Activity size={24} className="text-green-600" />}
          loading={refreshing && !activeCrawls}
        />
      </div>

      {/* Active Jobs List */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900">Active Crawls</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            {activeCrawls.length} Running
          </span>
        </div>
        <ul role="list" className="divide-y divide-slate-100">
          {activeCrawls.length === 0 ? (
            <li className="px-6 py-12 text-center">
              <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Activity size={24} className="text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No active crawls found</p>
              <p className="text-slate-400 text-sm mt-1">Start a new job from the Crawl tab</p>
            </li>
          ) : (
            activeCrawls.map((crawl) => (
              <li key={crawl.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                        {crawl.id.substring(0, 8)}...
                      </span>
                      <a href={crawl.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 hover:text-orange-600 transition-colors truncate max-w-md">
                        {crawl.url}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={crawl.status} />
                    <button 
                      onClick={() => cancelCrawl(crawl.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancel Crawl"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
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