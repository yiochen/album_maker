import React from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { AlbumEditor } from './components/AlbumEditor';
import { useAppInitialization } from './hooks/useAppInitialization';
import './index.css';

const App: React.FC = () => {
  const { isLoading } = useAppInitialization();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <AlbumEditor />;
};

export default App;
