import React, { useMemo, useState } from 'react';
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
  useSelectedPageSide,
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
import { templates } from '../templates';

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
  const selectedPageSide = useSelectedPageSide();
  const isImagePoolOpen = useIsImagePoolOpen();
  const isSettingsOpen = useIsSettingsOpen();
  const isSnappingEnabled = useIsSnappingEnabled();
  const setCurrentSpreadIndex = useSetCurrentSpreadIndex();
  const setImagePoolOpen = useSetImagePoolOpen();
  const setSettingsOpen = useSetSettingsOpen();
  const setSnappingEnabled = useSetSnappingEnabled();
  const editingTextElementId = useEditingTextElementId();
  const [isLayoutPickerOpen, setLayoutPickerOpen] = useState(false);

  // Auto-save
  useAutoSave();

  // Keyboard shortcuts
  useKeyboardShortcuts();

  // Element actions (drop, update, delete)
  const { handleImageDrop, handleAddImage, handleAddText, handleElementUpdate, handleElementDelete } = useElementActions();

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

  const selectedPageNumber = currentSpreadIndex * 2 + (selectedPageSide === 'left' ? 1 : 2);
  const selectedPageLabel = selectedPageSide === 'left' ? 'Left Page' : 'Right Page';

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
        onAddImage={() => {
          if (currentSpread) handleAddImage(currentSpread.id);
        }}
        onAddText={() => {
          if (currentSpread) handleAddText(currentSpread.id);
        }}
        onLayoutClick={() => setLayoutPickerOpen(true)}
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

      {isLayoutPickerOpen && (
        <Modal
          title={`Apply Layout (${selectedPageLabel} - Page ${selectedPageNumber})`}
          onClose={() => setLayoutPickerOpen(false)}
          titleTestId="layout-picker-title"
        >
          <div className="template-grid" data-testid="layout-picker-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="template-option"
                data-testid={`layout-option-${template.id}`}
                onClick={() => {
                  // Step 2 scope: button + picker UI. Template application logic follows in the next step.
                  setLayoutPickerOpen(false);
                }}
              >
                <div className="template-preview" />
                <span className="template-name">{template.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};
