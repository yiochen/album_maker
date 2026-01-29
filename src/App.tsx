import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Album, PageElement, PoolImage, TemplateId } from './types';
import { useAlbum } from './hooks/useAlbum';
import { useAutoSave } from './hooks/useAutoSave';
import {
  albumStorage,
  createNewAlbum,
  exportAlbumAsJson,
  importAlbumFromJson,
  loadFromLocalStorage,
  clearLocalStorage,
} from './services/storage';
import { initializeSources } from './sources';
import { PageNavigator } from './components/PageNavigator';
import { Canvas } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ImagePool } from './components/ImagePool';
import { AlbumSelector } from './components/AlbumSelector';
import './index.css';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialAlbum, setInitialAlbum] = useState<Album | null>(null);

  // Initialize app and load album
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize photo sources
        await initializeSources();

        // Check for legacy localStorage data and migrate
        const legacyAlbum = loadFromLocalStorage();
        if (legacyAlbum) {
          // Migrate to IndexedDB
          const migrated: Album = {
            ...legacyAlbum,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await albumStorage.saveAlbum(migrated);
          await albumStorage.setCurrentAlbumId(migrated.id);
          clearLocalStorage();
          setInitialAlbum(migrated);
        } else {
          // Load from IndexedDB
          const album = await albumStorage.loadCurrentAlbum();
          setInitialAlbum(album);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        // Fallback to new album
        setInitialAlbum(createNewAlbum());
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  if (isLoading || !initialAlbum) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return <AlbumEditor initialAlbum={initialAlbum} />;
};

interface AlbumEditorProps {
  initialAlbum: Album;
}

const AlbumEditor: React.FC<AlbumEditorProps> = ({ initialAlbum }) => {
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

  // Auto-save to IndexedDB
  useAutoSave(album);

  // UI state
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isImagePoolOpen, setIsImagePoolOpen] = useState(true);

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
      thumbnailUrl: image.thumbnailUrl || image.baseUrl,
      sourceId: image.sourceId,
      sourceImageId: image.sourceImageId,
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

  // Handle page delete
  const handleDeletePage = useCallback((pageId: string) => {
    const pageIndex = album.pages.findIndex(p => p.id === pageId);
    if (pageIndex <= currentPageIndex && currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
    deletePage(pageId);
  }, [album.pages, currentPageIndex, deletePage]);

  // Handle album selection
  const handleSelectAlbum = useCallback(async (id: string) => {
    const newAlbum = await albumStorage.loadAlbum(id);
    if (newAlbum) {
      await albumStorage.setCurrentAlbumId(id);
      setAlbum(newAlbum);
      setCurrentPageIndex(0);
      setSelectedElementId(null);
    }
  }, [setAlbum]);

  // Handle create new album
  const handleCreateAlbum = useCallback(async (name: string) => {
    const newAlbum = createNewAlbum(name);
    await albumStorage.saveAlbum(newAlbum);
    await albumStorage.setCurrentAlbumId(newAlbum.id);
    setAlbum(newAlbum);
    setCurrentPageIndex(0);
    setSelectedElementId(null);
  }, [setAlbum]);

  // Handle delete album
  const handleDeleteAlbum = useCallback(async (id: string) => {
    await albumStorage.deleteAlbum(id);
  }, []);

  // Handle import album
  const handleImportAlbum = useCallback(async () => {
    try {
      const imported = await importAlbumFromJson();
      setAlbum(imported);
      setCurrentPageIndex(0);
      setSelectedElementId(null);
    } catch (error) {
      console.error('Failed to import album:', error);
    }
  }, [setAlbum]);

  // Handle export album
  const handleExportAlbum = useCallback(() => {
    exportAlbumAsJson(album);
  }, [album]);

  // Early return if no current page
  if (!currentPage) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <span>No pages in album</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-section">
          <AlbumSelector
            currentAlbumId={album.id}
            onSelectAlbum={handleSelectAlbum}
            onCreateAlbum={handleCreateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
          />
          <input
            type="text"
            className="toolbar-title"
            value={album.name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="toolbar-section">
          <button className="btn btn-secondary btn-sm" onClick={handleImportAlbum}>
            Import
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportAlbum}>
            Export
          </button>
          <div className="toolbar-divider" />
          <button
            className={`btn btn-ghost btn-icon ${isImagePoolOpen ? 'active' : ''}`}
            onClick={() => setIsImagePoolOpen(!isImagePoolOpen)}
            title="Toggle Image Pool"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

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
            onImport={addToPool}
            onClose={() => setIsImagePoolOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
