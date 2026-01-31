import React, { createContext, useContext, useState, useEffect } from 'react';

interface ApiContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  client: {
    get: (endpoint: string) => Promise<any>;
    post: (endpoint: string, body: any) => Promise<any>;
    delete: (endpoint: string) => Promise<any>;
  };
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('firecrawl_api_key') || '');
  const [baseUrl, setBaseUrl] = useState(() => {
    return localStorage.getItem('firecrawl_base_url') || `http://${window.location.hostname}:3002`;
  });

  useEffect(() => {
    localStorage.setItem('firecrawl_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('firecrawl_base_url', baseUrl);
  }, [baseUrl]);

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
  };

  return (
    <ApiContext.Provider value={{ apiKey, setApiKey, baseUrl, setBaseUrl, client }}>
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
