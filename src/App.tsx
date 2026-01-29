import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Album, PageElement, PoolImage, TemplateId } from './types';
import { useAlbum } from './hooks/useAlbum';
import { useAutoSave } from './hooks/useAutoSave';
import { loadFromLocalStorage, createNewAlbum } from './services/storage';
import { Toolbar } from './components/Toolbar';
import { PageNavigator } from './components/PageNavigator';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ImagePool } from './components/ImagePool';
import './index.css';

const App: React.FC = () => {
  // Load initial album from localStorage or create new
  const initialAlbum = useMemo(() => {
    try {
      const saved = loadFromLocalStorage();
      return saved || createNewAlbum();
    } catch (e) {
      console.error('Failed to load album:', e);
      return createNewAlbum();
    }
  }, []);

  // Album state management
  const {
    album,
    setAlbum,
    setName,
    addPage,
    deletePage,
    updatePage,
    addElement,
    updateElement,
    deleteElement,
    addToPool,
  } = useAlbum(initialAlbum);

  // Auto-save to localStorage
  useAutoSave(album);

  // UI state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isImagePoolOpen, setIsImagePoolOpen] = useState(true);

  // Google Photos state (simplified for now)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Current page
  const currentPage = album.pages[currentPageIndex];

  // Selected element
  const selectedElement = useMemo(() => {
    if (!selectedElementId || !currentPage) return null;
    return currentPage.elements.find(e => e.id === selectedElementId) || null;
  }, [currentPage, selectedElementId]);

  // Ensure currentPageIndex is valid when pages change
  useEffect(() => {
    if (currentPageIndex >= album.pages.length) {
      setCurrentPageIndex(Math.max(0, album.pages.length - 1));
    }
  }, [album.pages.length, currentPageIndex]);

  // Clear selection when switching pages
  useEffect(() => {
    setSelectedElementId(null);
  }, [currentPageIndex]);

  // Handle image drop on canvas
  const handleImageDrop = useCallback((image: PoolImage, position: { x: number; y: number }) => {
    if (!currentPage) return;

    const newElement: PageElement = {
      id: crypto.randomUUID(),
      type: 'image',
      imageUrl: image.baseUrl,
      thumbnailUrl: image.baseUrl,
      googleMediaId: image.googleMediaId,
      position: {
        x: Math.max(0, position.x - 15),
        y: Math.max(0, position.y - 15),
      },
      size: {
        width: 30,
        height: 30,
      },
    };

    addElement(currentPage.id, newElement);
    setSelectedElementId(newElement.id);
  }, [currentPage, addElement]);

  // Handle template change
  const handleTemplateChange = useCallback((templateId: TemplateId) => {
    if (!currentPage) return;
    updatePage(currentPage.id, { templateId });
  }, [currentPage, updatePage]);

  // Handle element update
  const handleElementUpdate = useCallback((elementId: string, updates: Partial<PageElement>) => {
    if (!currentPage) return;
    updateElement(currentPage.id, elementId, updates);
  }, [currentPage, updateElement]);

  // Handle element delete
  const handleElementDelete = useCallback((elementId: string) => {
    if (!currentPage) return;
    deleteElement(currentPage.id, elementId);
    setSelectedElementId(null);
  }, [currentPage, deleteElement]);

  // Handle import from Google Photos (placeholder)
  const handleImportPhotos = useCallback(async () => {
    // Placeholder - will integrate with Google Photos later
    alert('Google Photos integration requires OAuth setup. Please configure your Google Cloud credentials.');
  }, []);

  // Handle connect (placeholder)
  const handleConnect = useCallback(async () => {
    alert('To connect Google Photos, you need to:\n1. Create a Google Cloud project\n2. Enable Google Photos API\n3. Configure OAuth credentials\n\nSee the implementation plan for details.');
  }, []);

  // Handle page delete
  const handleDeletePage = useCallback((pageId: string) => {
    const pageIndex = album.pages.findIndex(p => p.id === pageId);
    if (pageIndex <= currentPageIndex && currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
    deletePage(pageId);
  }, [album.pages, currentPageIndex, deletePage]);

  // Early return if no current page
  if (!currentPage) {
    return (
      <div className="app-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'white' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toolbar
        album={album}
        isAuthenticated={isAuthenticated}
        isLoading={isGoogleLoading}
        onConnect={handleConnect}
        onDisconnect={() => setIsAuthenticated(false)}
        onNameChange={setName}
        onImport={setAlbum}
        onToggleImagePool={() => setIsImagePoolOpen(!isImagePoolOpen)}
        isImagePoolOpen={isImagePoolOpen}
      />

      <main className={`main-content ${isImagePoolOpen ? 'image-pool-open' : ''}`}>
        <PageNavigator
          pages={album.pages}
          currentPageIndex={currentPageIndex}
          onPageSelect={setCurrentPageIndex}
          onAddPage={() => addPage()}
          onDeletePage={handleDeletePage}
        />

        <Canvas
          page={currentPage}
          selectedElementId={selectedElementId}
          onElementSelect={setSelectedElementId}
          onElementUpdate={handleElementUpdate}
          onElementDelete={handleElementDelete}
          onImageDrop={handleImageDrop}
        />

        <PropertiesPanel
          page={currentPage}
          selectedElement={selectedElement}
          onTemplateChange={handleTemplateChange}
          onElementUpdate={(updates) => {
            if (selectedElementId) {
              handleElementUpdate(selectedElementId, updates);
            }
          }}
          onElementDelete={() => {
            if (selectedElementId) {
              handleElementDelete(selectedElementId);
            }
          }}
        />

        {isImagePoolOpen && (
          <ImagePool
            images={album.imagePool}
            isAuthenticated={isAuthenticated}
            isLoading={isGoogleLoading}
            onImport={handleImportPhotos}
            onClose={() => setIsImagePoolOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
