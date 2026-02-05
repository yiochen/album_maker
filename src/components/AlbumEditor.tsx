import React, { useCallback, useMemo } from 'react';
import type { TemplateId } from '../types';
import { useAlbumStore } from '../states/albumStore';
import { useUIStore } from '../states/uiStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAlbumActions } from '../hooks/useAlbumActions';
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
    setName,
    setSettings,
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

  const {
      handleImageDrop,
      handleElementUpdate,
      handleElementDelete,
      handleCanvasChange,
      handleSelectAlbum,
      handleCreateAlbum,
      handleDeleteAlbum,
      handleImportAlbum,
      handleExportAlbum,
      updateSpread
  } = useAlbumActions();

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

  const toCanvasPx = useCallback(
    (value: number) => value * (APP_CONFIG.SCREEN_PPI / APP_CONFIG.PPI),
    []
  );
  const toModelPx = useCallback(
    (value: number) => value * (APP_CONFIG.PPI / APP_CONFIG.SCREEN_PPI),
    []
  );

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
          ppi={APP_CONFIG.PPI}
          toCanvasPx={toCanvasPx}
          toModelPx={toModelPx}
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
