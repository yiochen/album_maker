import React, { useMemo } from 'react';
import type { PageElement, TemplateId, PoolImage } from '../types';
import {
  useAlbum,
  useSetName,
  useSetSettings,
  useAddToPool,
  useUndo,
  useRedo,
  useCanUndo,
  useCanRedo,
  useUpdateSpread
} from '../states/albumStore';
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
  useSetSnappingEnabled
} from '../states/uiStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useElementActions } from '../hooks/useElementActions';
import { useAlbumLifecycle } from '../hooks/useAlbumLifecycle';
import { useThumbnailSync } from '../hooks/useThumbnailSync';
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
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const updateSpread = useUpdateSpread();

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

  // Auto-save
  useAutoSave();

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Element actions (drop, update, delete)
  const { handleImageDrop: originalHandleImageDrop, handleElementUpdate, handleElementDelete } = useElementActions();

  const handleImageDrop = (spreadId: string, image: PoolImage, position: { x: number; y: number }) => {
    originalHandleImageDrop(spreadId, image, position);
    setImagePoolOpen(false);
  };

  // Album lifecycle (CRUD, import/export)
  const {
    handleSelectAlbum,
    handleCreateAlbum,
    handleDeleteAlbum,
    handleImportAlbum,
    handleExportAlbum,
  } = useAlbumLifecycle();

  // Thumbnail sync
  const { handleCanvasChange } = useThumbnailSync();

  // Derived state
  const currentSpread = useMemo(() => {
    return album?.spreads[currentSpreadIndex];
  }, [album, currentSpreadIndex]);

  const selectedElement = useMemo(() => {
    if (!selectedElementId || !currentSpread) return null;
    return currentSpread.elements.find((e: PageElement) => e.id === selectedElementId) || null;
  }, [currentSpread, selectedElementId]);

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
        onExport={handleExportAlbum}
        onSettingsClick={() => setSettingsOpen(!isSettingsOpen)}
      />

      <Toolbar
        isSnappingEnabled={isSnappingEnabled}
        onSnappingToggle={() => setSnappingEnabled(!isSnappingEnabled)}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isImagePoolOpen={isImagePoolOpen}
        onImagePoolToggle={() => setImagePoolOpen(!isImagePoolOpen)}
      />

      <DndWrapper className="main-content">
        <PageNavigator />

        <Canvas
          onImageDrop={handleImageDrop}
          onCanvasChange={handleCanvasChange}
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
              selectedPageId={selectedPageId}
              onTemplateChange={(spreadId, templateId) => {
                updateSpread(spreadId, { templateId: templateId as TemplateId });
              }}
              onElementUpdate={(updates, groupId) => {
                if (selectedElementId && selectedPageId) {
                  handleElementUpdate(selectedPageId, selectedElementId, updates, groupId);
                }
              }}
              onElementDelete={() => {
                if (selectedElementId && selectedPageId) {
                  handleElementDelete(selectedPageId, selectedElementId);
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
            currentPageCount={album.spreads.length}
          />
        </Modal>
      )}
    </div>
  );
};
