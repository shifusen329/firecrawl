import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  pollingInterval: number;
  setPollingInterval: (interval: number) => void;
  client: {
    get: (endpoint: string) => Promise<any>;
    post: (endpoint: string, body: any) => Promise<any>;
    delete: (endpoint: string) => Promise<any>;
    getEndpointBaseUrl: () => string;
  };
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('firecrawl_api_key') || import.meta.env.VITE_DEFAULT_API_KEY || '');
  const [pollingInterval, setPollingInterval] = useState(() => {
    const stored = localStorage.getItem('firecrawl_polling_interval');
    return stored ? parseInt(stored, 10) : 5000;
  });
  
  const [baseUrl, setBaseUrl] = useState(() => {
    const stored = localStorage.getItem('firecrawl_base_url');
    const computed = `http://${window.location.hostname}:3002/v1`;
    
    // Smart override: If stored value is localhost but we are accessing via IP/Network, update it.
    if (stored === 'http://localhost:3002' && window.location.hostname !== 'localhost') {
        return computed;
    }
    
    return stored || computed;
  });

  useEffect(() => {
    // Force update if we are on a network IP but stored URL is localhost
    if (window.location.hostname !== 'localhost' && baseUrl.includes('localhost')) {
        const newUrl = `http://${window.location.hostname}:3002/v1`;
        setBaseUrl(newUrl);
        localStorage.setItem('firecrawl_base_url', newUrl);
        console.log(`Auto-corrected API Base URL to: ${newUrl}`);
    } else if (!baseUrl.endsWith('/v1')) {
        // Ensure /v1 is present
        const newUrl = baseUrl.replace(/\/$/, '') + '/v1';
        setBaseUrl(newUrl);
        localStorage.setItem('firecrawl_base_url', newUrl);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('firecrawl_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('firecrawl_base_url', baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    localStorage.setItem('firecrawl_polling_interval', pollingInterval.toString());
  }, [pollingInterval]);

  const request = async (endpoint: string, method: string, body?: any) => {
    const url = `${baseUrl.replace(/\/$/, '')}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      return { status: response.status, ...data };
    } catch (error) {
      console.error('API Request Error:', error);
      return { error: 'Network Error', details: error };
    }
  };

  const client = {
    get: (endpoint: string) => request(endpoint, 'GET'),
    post: (endpoint: string, body: any) => request(endpoint, 'POST', body),
    delete: (endpoint: string) => request(endpoint, 'DELETE'),
    getEndpointBaseUrl: () => baseUrl,
  };

  return (
    <ApiContext.Provider value={{ apiKey, setApiKey, baseUrl, setBaseUrl, pollingInterval, setPollingInterval, client }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
