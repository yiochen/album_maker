import React, { useMemo } from 'react';
import type { PageElement } from '../types';
import {
  useAlbum,
  useSetName,
  useSetSettings,
  useAddToPool,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo
} from '../states/albumStore';
import { useNavigate } from 'react-router-dom';
import {
  useCurrentSpreadIndex,
  useSelectedElementId,
  useSelectedPageId,
  useIsImagePoolOpen,
  useIsSettingsOpen,
  useIsSnappingEnabled,
  useSetCurrentSpreadIndex,
  useSetImagePoolOpen,
  useSetSettingsOpen,
  useSetSnappingEnabled,
  useEditingTextElementId,
} from '../states/uiStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useElementActions } from '../hooks/useElementActions';
import { useAlbumLifecycle } from '../hooks/useAlbumLifecycle';
import { Headerbar } from './Headerbar';
import { AlbumSettingsPanel } from './AlbumSettingsPanel';
import { PageNavigator } from './PageNavigator';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ImagePool } from './ImagePool';
import { AlbumSelector } from './AlbumSelector';
import { DndWrapper } from './DndWrapper';
import { Modal } from './Modal';
import { LoadingScreen } from './LoadingScreen';
import { Toolbar } from './Toolbar';
import { Tabs, TabPane } from './Tabs';

export const AlbumEditor: React.FC = () => {
  // Global State (Album)
  const album = useAlbum();
  const setName = useSetName();
  const setSettings = useSetSettings();
  const addToPool = useAddToPool();
  const navigate = useNavigate();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // UI State
  const currentSpreadIndex = useCurrentSpreadIndex();
  const selectedElementId = useSelectedElementId();
  const selectedPageId = useSelectedPageId();
  const isImagePoolOpen = useIsImagePoolOpen();
  const isSettingsOpen = useIsSettingsOpen();
  const isSnappingEnabled = useIsSnappingEnabled();
  const setCurrentSpreadIndex = useSetCurrentSpreadIndex();
  const setImagePoolOpen = useSetImagePoolOpen();
  const setSettingsOpen = useSetSettingsOpen();
  const setSnappingEnabled = useSetSnappingEnabled();
  const editingTextElementId = useEditingTextElementId();

  // Auto-save
  useAutoSave();

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Element actions (drop, update, delete)
  const { handleImageDrop, handleAddText, handleElementUpdate, handleElementDelete } = useElementActions();

  // Album lifecycle (CRUD, import/export)
  const {
    handleSelectAlbum,
    handleCreateAlbum,
    handleDeleteAlbum,
    handleImportAlbum,
  } = useAlbumLifecycle();


  // Derived state
  const currentSpread = useMemo(() => {
    return album?.spreads[currentSpreadIndex];
  }, [album, currentSpreadIndex]);

  const effectiveSelectedElementId = selectedElementId || editingTextElementId;

  const selectedElement = useMemo(() => {
    if (!effectiveSelectedElementId || !currentSpread) return null;
    return currentSpread.elements.find((e: PageElement) => e.id === effectiveSelectedElementId) || null;
  }, [currentSpread, effectiveSelectedElementId]);

  // Ensure currentSpreadIndex is valid
  if (album && currentSpreadIndex > Math.max(0, album.spreads.length - 1)) {
    setCurrentSpreadIndex(Math.max(0, album.spreads.length - 1));
  }

  if (!album || !currentSpread) {
    return <LoadingScreen message="No spreads in album" showSpinner={false} />;
  }

  return (
    <div className="app-container" data-testid="album-editor">
      <Headerbar
        albumSelector={
          <AlbumSelector
            currentAlbumId={album.id}
            albumName={album.name}
            onAlbumNameChange={setName}
            onSelectAlbum={handleSelectAlbum}
            onCreateAlbum={handleCreateAlbum}
            onDeleteAlbum={handleDeleteAlbum}
          />
        }
        onImport={handleImportAlbum}
        onExport={() => navigate('/export')}
        onSettingsClick={() => setSettingsOpen(!isSettingsOpen)}
      />

      <Toolbar
        isSnappingEnabled={isSnappingEnabled}
        onSnappingToggle={() => setSnappingEnabled(!isSnappingEnabled)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onAddText={() => {
          if (currentSpread) handleAddText(currentSpread.id);
        }}
      />

      <DndWrapper className="main-content">
        <PageNavigator />

        <Canvas
          onImageDrop={handleImageDrop}
        />

        <Tabs
          activeId={isImagePoolOpen ? 'images' : 'properties'}
          onChange={(id) => setImagePoolOpen(id === 'images')}
        >
          <TabPane id="properties" label="Properties">
            <PropertiesPanel
              spread={currentSpread}
              settings={album.settings}
              selectedElement={selectedElement}
              onElementUpdate={(updates, groupId) => {
                if (effectiveSelectedElementId && selectedPageId) {
                  handleElementUpdate(selectedPageId, effectiveSelectedElementId, updates, groupId);
                }
              }}
              onElementDelete={() => {
                if (effectiveSelectedElementId && selectedPageId) {
                  handleElementDelete(selectedPageId, effectiveSelectedElementId);
                }
              }}
            />
          </TabPane>
          <TabPane id="images" label="Images">
            <ImagePool
              images={album.imagePool}
              onImport={addToPool}
              onClose={() => setImagePoolOpen(false)}
            />
          </TabPane>
        </Tabs>
      </DndWrapper>

      {isSettingsOpen && (
        <Modal
          title="Album Settings"
          onClose={() => setSettingsOpen(false)}
          titleTestId="settings-title"
        >
          <AlbumSettingsPanel
            settings={album.settings}
            onSettingsChange={setSettings}
            currentPageCount={album.spreads.length * 2}
          />
        </Modal>
      )}
    </div>
  );
};
