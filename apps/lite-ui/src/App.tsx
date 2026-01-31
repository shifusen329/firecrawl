import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApiProvider } from './context/ApiContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ScrapePage } from './pages/ScrapePage';
import { CrawlPage } from './pages/CrawlPage';
import { MapPage } from './pages/MapPage';
import { SearchPage } from './pages/SearchPage';
import { ExtractPage } from './pages/ExtractPage';

function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="scrape" element={<ScrapePage />} />
            <Route path="crawl" element={<CrawlPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="extract" element={<ExtractPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ApiProvider>
  );
}

export default App;