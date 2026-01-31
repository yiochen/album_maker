import React from 'react';
import { LoadingScreen } from './components/LoadingScreen';
import { AlbumEditor } from './components/AlbumEditor';
import { useAppInitialization } from './hooks/useAppInitialization';
import './index.css';

const App: React.FC = () => {
  const { isLoading, initialAlbum } = useAppInitialization();

  if (isLoading || !initialAlbum) {
    return <LoadingScreen />;
  }

  return <AlbumEditor initialAlbum={initialAlbum} />;
};

export default App;
