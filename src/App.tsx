import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Album, Page, PageElement, PoolImage } from './types';
import { DEFAULT_ALBUM_SETTINGS } from './types';
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
import { spreadThumbnailDB, generateSpreadContentHash } from './db';
import { initializeSources } from './sources';
import { Toolbar } from './components/Toolbar';
import { AlbumSettingsPanel } from './components/AlbumSettingsPanel';
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
          // Migrate to IndexedDB with settings
          const migrated: Album = {
            ...legacyAlbum,
            id: crypto.randomUUID(),
            settings: legacyAlbum.settings || { ...DEFAULT_ALBUM_SETTINGS },
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
          // Ensure settings exist
          if (!album.settings) {
            album.settings = { ...DEFAULT_ALBUM_SETTINGS };
          }
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
    setSettings,
    addPages,
    deletePage,
    addElement,
    updateElement,
    deleteElement,
    moveElement,
    addToPool,
    undo,
    redo,
    canUndo,
    canRedo
  } = useAlbum(initialAlbum);

  // Auto-save to IndexedDB
  useAutoSave(album);

  // UI state
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isImagePoolOpen, setIsImagePoolOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);

  // Get current spread (pair of pages)
  const currentSpread = useMemo(() => {
    const leftIndex = currentSpreadIndex * 2;
    const left = album.pages[leftIndex];
    const right = album.pages[leftIndex + 1];
    return [left, right].filter(Boolean) as Page[];
  }, [album.pages, currentSpreadIndex]);

  // Selected element
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    for (const page of currentSpread) {
      const element = page.elements.find(e => e.id === selectedElementId);
      if (element) return element;
    }
    return null;
  }, [currentSpread, selectedElementId]);

  // Ensure currentSpreadIndex is valid when pages change
  const maxSpreadIndex = Math.max(0, Math.floor((album.pages.length - 1) / 2));
  if (currentSpreadIndex > maxSpreadIndex) {
    setCurrentSpreadIndex(maxSpreadIndex);
  }

  // Clear selection when switching spreads
  useEffect(() => {
    // eslint-disable-next-line
    setSelectedElementId(null);
    setSelectedPageId(null);
  }, [currentSpreadIndex]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Undo: Ctrl+Z or Meta+Z
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                // Redo: Ctrl+Shift+Z
                if (canRedo) redo();
            } else {
                if (canUndo) undo();
            }
        }
        // Redo: Ctrl+Y or Meta+Y
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
             e.preventDefault();
             if (canRedo) redo();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Handle image drop on canvas
  const handleImageDrop = useCallback((pageId: string, image: PoolImage, position: { x: number; y: number }) => {
    const aspectRatio = image.width && image.height ? image.width / image.height : 1;

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
        height: 30 / aspectRatio,
      },
      originalAspectRatio: aspectRatio,
      lockAspectRatio: true,
    };

    addElement(pageId, newElement);
    setSelectedElementId(newElement.id);
    setSelectedPageId(pageId);
  }, [addElement]);

  // Handle element update
  const handleElementUpdate = useCallback((pageId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
    updateElement(pageId, elementId, updates, groupId);
  }, [updateElement]);

  // Handle element delete
  const handleElementDelete = useCallback((pageId: string, elementId: string) => {
    deleteElement(pageId, elementId);
    setSelectedElementId(null);
    setSelectedPageId(null);
  }, [deleteElement]);

  const handleCanvasChange = useCallback(async (dataUrl: string) => {
    if (!album) return;

    const startIndex = currentSpreadIndex * 2;
    const pages = album.pages.slice(startIndex, startIndex + 2);

    if (pages.length === 0) return;

    const contentHash = generateSpreadContentHash(pages);
    try {
      await spreadThumbnailDB.set(album.id, currentSpreadIndex, dataUrl, contentHash);
    } catch (error) {
      console.warn('Failed to save thumbnail:', error);
    }
  }, [album, currentSpreadIndex]);

  // Handle spread delete (delete both pages)
  const handleDeleteSpread = useCallback((leftPageId: string, rightPageId: string) => {
    deletePage(leftPageId);
    deletePage(rightPageId);
  }, [deletePage]);

  // Handle album selection
  const handleSelectAlbum = useCallback(async (id: string) => {
    const newAlbum = await albumStorage.loadAlbum(id);
    if (newAlbum) {
      if (!newAlbum.settings) {
        newAlbum.settings = { ...DEFAULT_ALBUM_SETTINGS };
      }
      await albumStorage.setCurrentAlbumId(id);
      setAlbum(newAlbum);
      setCurrentSpreadIndex(0);
      setSelectedElementId(null);
    }
  }, [setAlbum]);

  // Handle create new album
  const handleCreateAlbum = useCallback(async (name: string) => {
    const newAlbum = createNewAlbum(name);
    await albumStorage.saveAlbum(newAlbum);
    await albumStorage.setCurrentAlbumId(newAlbum.id);
    setAlbum(newAlbum);
    setCurrentSpreadIndex(0);
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
      if (!imported.settings) {
        imported.settings = { ...DEFAULT_ALBUM_SETTINGS };
      }
      setAlbum(imported);
      setCurrentSpreadIndex(0);
      setSelectedElementId(null);
    } catch (error) {
      console.error('Failed to import album:', error);
    }
  }, [setAlbum]);

  // Handle export album
  const handleExportAlbum = useCallback(() => {
    exportAlbumAsJson(album);
  }, [album]);

  // Early return if no pages
  if (currentSpread.length === 0) {
    return (
      <div className="app-container">
        <div className="loading-screen">
          <span>No pages in album</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" data-testid="album-editor">
      <Toolbar
        albumName={album.name}
        onAlbumNameChange={setName}
        isSnappingEnabled={isSnappingEnabled}
        onSnappingToggle={() => setIsSnappingEnabled(!isSnappingEnabled)}
        onImport={handleImportAlbum}
        onExport={handleExportAlbum}
        onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      {/* Album selector bar */}
      <div className="album-bar">
        <AlbumSelector
          currentAlbumId={album.id}
          onSelectAlbum={handleSelectAlbum}
          onCreateAlbum={handleCreateAlbum}
          onDeleteAlbum={handleDeleteAlbum}
        />
        <button
          className={`btn btn-ghost btn-icon ${isImagePoolOpen ? 'active' : ''}`}
          onClick={() => setIsImagePoolOpen(!isImagePoolOpen)}
          title="Toggle Image Pool"
          data-testid="toggle-image-pool-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
            <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <main className={`main-content ${isImagePoolOpen ? 'image-pool-open' : ''}`}>
        {/* Settings Panel (left sidebar when open) */}
        {isSettingsOpen && (
          <aside className="settings-sidebar">
            <AlbumSettingsPanel
              settings={album.settings}
              onSettingsChange={setSettings}
              currentPageCount={album.pages.length}
            />
          </aside>
        )}

        <PageNavigator
          pages={album.pages}
          currentSpreadIndex={currentSpreadIndex}
          maxPages={album.settings.maxPages}
          albumId={album.id}
          settings={album.settings}
          onSpreadSelect={setCurrentSpreadIndex}
          onAddPages={() => addPages(2)}
          onDeleteSpread={handleDeleteSpread}
        />

        <Canvas
          pages={currentSpread}
          pageIndex={currentSpreadIndex * 2}
          settings={album.settings}
          selectedElementId={selectedElementId}
          isSnappingEnabled={isSnappingEnabled}
          onElementSelect={(id) => {
            setSelectedElementId(id);
            if (id) {
              // Find which page contains this element
              for (const page of currentSpread) {
                if (page.elements.some(e => e.id === id)) {
                  setSelectedPageId(page.id);
                  break;
                }
              }
            } else {
              setSelectedPageId(null);
            }
          }}
          onElementUpdate={handleElementUpdate}
          onElementDelete={handleElementDelete}
          onImageDrop={handleImageDrop}
          onMoveElementToPage={moveElement}
          onCanvasChange={handleCanvasChange}
        />

        <PropertiesPanel
          pages={currentSpread}
          settings={album.settings}
          selectedElement={selectedElement}
          onElementUpdate={(updates) => {
            if (selectedElementId && selectedPageId) {
              handleElementUpdate(selectedPageId, selectedElementId, updates);
            }
          }}
          onElementDelete={() => {
            if (selectedElementId && selectedPageId) {
              handleElementDelete(selectedPageId, selectedElementId);
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
