import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CandidatesPage from './pages/CandidatesPage';
import ManualPostPage from './pages/ManualPostPage';
import AutomationPage from './pages/AutomationPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="manual" element={<ManualPostPage />} />
          <Route path="automation" element={<AutomationPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
