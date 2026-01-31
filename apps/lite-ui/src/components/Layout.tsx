import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useApi } from '../context/ApiContext';
import { Settings, Activity, Search, FileText, Globe, Database, Bug, ChevronDown } from 'lucide-react';

export const Layout: React.FC = () => {
  const { apiKey, setApiKey, baseUrl, setBaseUrl } = useApi();
  const [showSettings, setShowSettings] = useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'bg-orange-50 text-orange-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              {/* Brand */}
              <div className="flex-shrink-0 flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-sm flex items-center justify-center">
                   <span className="text-white font-bold text-lg">F</span>
                </div>
                <span className="text-xl font-bold text-slate-900">
                  Firecrawl
                </span>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex md:space-x-2">
                <NavLink to="/" className={navClass} end>
                  <Activity size={18} />
                  <span>Dashboard</span>
                </NavLink>
                <div className="h-6 w-px bg-slate-200 my-auto mx-2"></div>
                <NavLink to="/scrape" className={navClass}>
                  <FileText size={18} />
                  <span>Scrape</span>
                </NavLink>
                <NavLink to="/crawl" className={navClass}>
                  <Globe size={18} />
                  <span>Crawl</span>
                </NavLink>
                <NavLink to="/map" className={navClass}>
                  <Database size={18} />
                  <span>Map</span>
                </NavLink>
                <NavLink to="/search" className={navClass}>
                  <Search size={18} />
                  <span>Search</span>
                </NavLink>
                <NavLink to="/extract" className={navClass}>
                  <Bug size={18} />
                  <span>Extract</span>
                </NavLink>
              </nav>
            </div>

            {/* Settings Toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showSettings 
                    ? 'bg-slate-100 text-slate-900' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Settings size={18} />
                <span className="hidden sm:inline">Config</span>
                <ChevronDown size={14} className={`transform transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-50 border-b border-slate-200 shadow-inner">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl">
                <div>
                  <label>API Base URL</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://localhost:3002"
                  />
                  <p className="mt-1 text-xs text-slate-400">The address of your local Firecrawl instance.</p>
                </div>
                <div>
                  <label>API Key (Optional)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="fc-..."
                  />
                  <p className="mt-1 text-xs text-slate-400">Required if your instance has authentication enabled.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};