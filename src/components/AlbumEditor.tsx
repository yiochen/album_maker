import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Album, PageElement, PoolImage, TemplateId } from '../types';
import { APP_CONFIG } from '../config';
import { useAlbum } from '../hooks/useAlbum';
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

interface AlbumEditorProps {
  initialAlbum: Album;
}

export const AlbumEditor: React.FC<AlbumEditorProps> = ({ initialAlbum }) => {
  // Album state management
  const {
    album,
    setAlbum,
    setName,
    setSettings,
    addSpreads,
    deleteSpread,
    addElement,
    updateElement,
    updateSpread,
    deleteElement,
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

  // Get current spread
  const currentSpread = useMemo(() => {
    return album.spreads[currentSpreadIndex];
  }, [album.spreads, currentSpreadIndex]);

  // Selected element
  const selectedElement = useMemo(() => {
    if (!selectedElementId || !currentSpread) return null;
    return currentSpread.elements.find(e => e.id === selectedElementId) || null;
  }, [currentSpread, selectedElementId]);

  // Ensure currentSpreadIndex is valid when spreads change
  const maxSpreadIndex = Math.max(0, album.spreads.length - 1);
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
  useKeyboardShortcuts({ undo, redo, canUndo, canRedo });

  // Handle image drop on canvas
  // Handle image drop on canvas - using Absolute Coordinates
  const handleImageDrop = useCallback((
    spreadId: string,
    image: PoolImage,
    position: { x: number; y: number },
    // pagePixelDimensions is deprecated/unused in absolute mode
  ) => {
    const imageWidth = image.width || 300;
    const imageHeight = image.height || (imageWidth / 1); // Default to square if height missing
    const aspectRatio = imageWidth / imageHeight;

    // Center image at drop position
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
    setSelectedPageId(spreadId); // renaming state var later? keeping 'selectedPageId' as 'selectedSpreadId' for now
  }, [addElement]);

  // Handle element update
  const handleElementUpdate = useCallback((spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
    updateElement(spreadId, elementId, updates, groupId);
  }, [updateElement]);

  // Handle element delete
  const handleElementDelete = useCallback((spreadId: string, elementId: string) => {
    deleteElement(spreadId, elementId);
    setSelectedElementId(null);
    setSelectedPageId(null);
  }, [deleteElement]);

  const handleCanvasChange = useCallback(async (dataUrl: string) => {
    if (!album || !currentSpread) return;

    // Use current spread for hashing
    const contentHash = generateSpreadContentHash(currentSpread);
    try {
      await spreadThumbnailDB.set(album.id, currentSpread.id, dataUrl, contentHash);
    } catch (error) {
      console.warn('Failed to save thumbnail:', error);
    }
  }, [album, currentSpread]);

  // Handle spread delete
  const handleDeleteSpread = useCallback((spreadId: string) => {
    deleteSpread(spreadId);
  }, [deleteSpread]);

  // Handle multiple spread deletion
  const handleDeleteSpreads = useCallback((spreadIndices: number[]) => {
    const sortedIndices = [...spreadIndices].sort((a, b) => b - a);

    for (const spreadIndex of sortedIndices) {
      const spread = album.spreads[spreadIndex];
      if (spread) deleteSpread(spread.id);
    }
  }, [album.spreads, deleteSpread]);

  // Handle album selection
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
        imported.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
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

  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Early return if no spreads
  if (!currentSpread) {
    return <LoadingScreen message="No spreads in album" showSpinner={false} />;
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
        <PageNavigator
          spreads={album.spreads}
          currentSpreadIndex={currentSpreadIndex}
          maxSpreads={album.settings.maxPages / 2} // Conversion?
          albumId={album.id}
          settings={album.settings}
          onSpreadSelect={setCurrentSpreadIndex}
          onAddSpread={() => addSpreads(1)}
          onDeleteSpread={handleDeleteSpread}
          onDeleteSpreads={handleDeleteSpreads}
        />

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
            onClose={() => setIsImagePoolOpen(false)}
          />
        )}
      </main>

      {isSettingsOpen && (
        <Modal
          title="Album Settings"
          onClose={handleSettingsClose}
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
