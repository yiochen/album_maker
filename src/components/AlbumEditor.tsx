import React, { useCallback, useMemo } from 'react';
import type { PageElement, PoolImage, TemplateId } from '../types';
import { useAlbumStore } from '../states/albumStore';
import { useUIStore } from '../states/uiStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import {
  albumStorage,
  createNewAlbum,
  exportAlbumAsJson,
  importAlbumFromJson,
} from '../services/storage';
import { spreadThumbnailDB, generateSpreadContentHash } from '../db';
import { Toolbar } from './Toolbar';
import { AlbumSettingsPanel } from './AlbumSettingsPanel';
import { PageNavigator } from './PageNavigator';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ImagePool } from './ImagePool';
import { AlbumSelector } from './AlbumSelector';
import { Modal } from './Modal';
import { LoadingScreen } from './LoadingScreen';
import { APP_CONFIG } from '../config';

export const AlbumEditor: React.FC = () => {
  // Global State
  const {
    album,
    setAlbum,
    setName,
    setSettings,
    addElement,
    updateElement,
    updateSpread,
    deleteElement,
    addToPool,
    undo,
    redo,
    canUndo,
    canRedo
  } = useAlbumStore();

  const {
    currentSpreadIndex,
    selectedElementId,
    selectedPageId,
    isImagePoolOpen,
    isSettingsOpen,
    isSnappingEnabled,
    setCurrentSpreadIndex,
    setSelectedElementId,
    setSelectedPageId,
    setImagePoolOpen,
    setSettingsOpen,
    setSnappingEnabled,
  } = useUIStore();

  // Auto-save
  useAutoSave(album);

  // Keyboard shortcuts
  useKeyboardShortcuts({ undo, redo, canUndo, canRedo });

  // Derived state
  const currentSpread = useMemo(() => {
    return album?.spreads[currentSpreadIndex];
  }, [album, currentSpreadIndex]);

  const selectedElement = useMemo(() => {
    if (!selectedElementId || !currentSpread) return null;
    return currentSpread.elements.find(e => e.id === selectedElementId) || null;
  }, [currentSpread, selectedElementId]);

  // Ensure currentSpreadIndex is valid
  if (album && currentSpreadIndex > Math.max(0, album.spreads.length - 1)) {
    setCurrentSpreadIndex(Math.max(0, album.spreads.length - 1));
  }

  // Callbacks
  const handleImageDrop = useCallback((
    spreadId: string,
    image: PoolImage,
    position: { x: number; y: number },
  ) => {
    const imageWidth = image.width || 300;
    const imageHeight = image.height || (imageWidth / 1);
    const aspectRatio = imageWidth / imageHeight;

    const halfWidth = imageWidth / 2;
    const halfHeight = imageHeight / 2;

    const newElement: PageElement = {
      id: crypto.randomUUID(),
      type: 'image',
      imageUrl: image.baseUrl,
      thumbnailUrl: image.thumbnailUrl || image.baseUrl,
      sourceId: image.sourceId,
      sourceImageId: image.sourceImageId,
      position: {
        x: position.x - halfWidth,
        y: position.y - halfHeight,
      },
      size: {
        width: imageWidth,
        height: imageHeight,
      },
      originalAspectRatio: aspectRatio,
      lockAspectRatio: true,
    };

    addElement(spreadId, newElement);
    setSelectedElementId(newElement.id);
    setSelectedPageId(spreadId);
  }, [addElement, setSelectedElementId, setSelectedPageId]);

  const handleElementUpdate = useCallback((spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
    updateElement(spreadId, elementId, updates, groupId);
  }, [updateElement]);

  const handleElementDelete = useCallback((spreadId: string, elementId: string) => {
    deleteElement(spreadId, elementId);
    setSelectedElementId(null);
    setSelectedPageId(null);
  }, [deleteElement, setSelectedElementId, setSelectedPageId]);

  const handleCanvasChange = useCallback(async (dataUrl: string) => {
    if (!album || !currentSpread) return;
    const contentHash = generateSpreadContentHash(currentSpread);
    try {
      await spreadThumbnailDB.set(album.id, currentSpread.id, dataUrl, contentHash);
    } catch (error) {
      console.warn('Failed to save thumbnail:', error);
    }
  }, [album, currentSpread]);

  const handleSelectAlbum = useCallback(async (id: string) => {
    const newAlbum = await albumStorage.loadAlbum(id);
    if (newAlbum) {
      if (!newAlbum.settings) {
        newAlbum.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
      }
      await albumStorage.setCurrentAlbumId(id);
      setAlbum(newAlbum);
      setCurrentSpreadIndex(0);
      setSelectedElementId(null);
    }
  }, [setAlbum, setCurrentSpreadIndex, setSelectedElementId]);

  const handleCreateAlbum = useCallback(async (name: string) => {
    const newAlbum = createNewAlbum(name);
    await albumStorage.saveAlbum(newAlbum);
    await albumStorage.setCurrentAlbumId(newAlbum.id);
    setAlbum(newAlbum);
    setCurrentSpreadIndex(0);
    setSelectedElementId(null);
  }, [setAlbum, setCurrentSpreadIndex, setSelectedElementId]);

  const handleDeleteAlbum = useCallback(async (id: string) => {
    await albumStorage.deleteAlbum(id);
  }, []);

  const handleImportAlbum = useCallback(async () => {
    try {
      const imported = await importAlbumFromJson();
      if (!imported.settings) {
        imported.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
      }
      setAlbum(imported);
      setCurrentSpreadIndex(0);
      setSelectedElementId(null);
    } catch (error) {
      console.error('Failed to import album:', error);
    }
  }, [setAlbum, setCurrentSpreadIndex, setSelectedElementId]);

  const handleExportAlbum = useCallback(() => {
    if (album) exportAlbumAsJson(album);
  }, [album]);

  if (!album || !currentSpread) {
    return <LoadingScreen message="No spreads in album" showSpinner={false} />;
  }

  return (
    <div className="app-container" data-testid="album-editor">
      <Toolbar
        albumName={album.name}
        onAlbumNameChange={setName}
        isSnappingEnabled={isSnappingEnabled}
        onSnappingToggle={() => setSnappingEnabled(!isSnappingEnabled)}
        onImport={handleImportAlbum}
        onExport={handleExportAlbum}
        onSettingsClick={() => setSettingsOpen(!isSettingsOpen)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div className="album-bar">
        <AlbumSelector
          currentAlbumId={album.id}
          onSelectAlbum={handleSelectAlbum}
          onCreateAlbum={handleCreateAlbum}
          onDeleteAlbum={handleDeleteAlbum}
        />
        <button
          className={`btn btn-ghost btn-icon ${isImagePoolOpen ? 'active' : ''}`}
          onClick={() => setImagePoolOpen(!isImagePoolOpen)}
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
        <PageNavigator />

        <Canvas
          spread={currentSpread}
          settings={album.settings}
          selectedElementId={selectedElementId}
          isSnappingEnabled={isSnappingEnabled}
          onElementSelect={(id) => {
            setSelectedElementId(id);
            if (id) {
              setSelectedPageId(currentSpread.id);
            } else {
              setSelectedPageId(null);
            }
          }}
          onElementUpdate={handleElementUpdate}
          onElementDelete={handleElementDelete}
          onImageDrop={handleImageDrop}
          onCanvasChange={handleCanvasChange}
        />

        <PropertiesPanel
          spread={currentSpread}
          settings={album.settings}
          selectedElement={selectedElement}
          selectedPageId={selectedPageId}
          onTemplateChange={(spreadId, templateId) => {
            updateSpread(spreadId, { templateId: templateId as TemplateId });
          }}
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
            onClose={() => setImagePoolOpen(false)}
          />
        )}
      </main>

      {isSettingsOpen && (
        <Modal
          title="Album Settings"
          onClose={() => setSettingsOpen(false)}
          titleTestId="settings-title"
        >
          <AlbumSettingsPanel
            settings={album.settings}
            onSettingsChange={setSettings}
            currentPageCount={album.spreads.length}
          />
        </Modal>
      )}
    </div>
  );
};
