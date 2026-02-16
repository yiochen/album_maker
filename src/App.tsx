import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadingScreen } from './components/LoadingScreen';
import { AlbumEditor } from './components/AlbumEditor';
import { ExportPage } from './components/ExportPage';
import { useAppInitialization } from './hooks/useAppInitialization';
import './index.css';

const App: React.FC = () => {
  const { isLoading } = useAppInitialization();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/edit" element={<AlbumEditor />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/" element={<Navigate to="/edit" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
