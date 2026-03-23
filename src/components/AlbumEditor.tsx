import React, { useMemo } from 'react';
import type { PageElement } from '../types';
import {
  useAlbum,
  useSetName,
  useSetSettings,
  useAddToPool,
  useUpdateSpread,
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
  useSetSelectedPageId,
  useSetSelectedElementId,
  useActiveSidePanelTab,
  useIsSettingsOpen,
  useIsSnappingEnabled,
  useSetCurrentSpreadIndex,
  useSetActiveSidePanelTab,
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
import { LayoutPicker } from './LayoutPicker';
import { templates } from '../templates';
import { applyTemplateToSpreadSide } from '../services/templateLayout';

export const AlbumEditor: React.FC = () => {
  // Global State (Album)
  const album = useAlbum();
  const setName = useSetName();
  const setSettings = useSetSettings();
  const addToPool = useAddToPool();
  const navigate = useNavigate();
  const updateSpread = useUpdateSpread();
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // UI State
  const currentSpreadIndex = useCurrentSpreadIndex();
  const selectedElementId = useSelectedElementId();
  const selectedPageId = useSelectedPageId();
  const selectedPageSide = useSelectedPageSide();
  const setSelectedPageId = useSetSelectedPageId();
  const setSelectedElementId = useSetSelectedElementId();
  const activeSidePanelTab = useActiveSidePanelTab();
  const isSettingsOpen = useIsSettingsOpen();
  const isSnappingEnabled = useIsSnappingEnabled();
  const setCurrentSpreadIndex = useSetCurrentSpreadIndex();
  const setActiveSidePanelTab = useSetActiveSidePanelTab();
  const setSettingsOpen = useSetSettingsOpen();
  const setSnappingEnabled = useSetSnappingEnabled();
  const editingTextElementId = useEditingTextElementId();

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
  const pageAspectRatio = album.settings.pageWidth / album.settings.pageHeight;
  const selectedPageElementCount = currentSpread.elements.filter((element) => (
    selectedPageSide === 'left'
      ? element.box.x1 >= 0 && element.box.x2 <= 0.5
      : element.box.x1 >= 0.5 && element.box.x2 <= 1
  )).length;

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
        onLayoutClick={() => setActiveSidePanelTab('layouts')}
      />

      <DndWrapper className="main-content">
        <PageNavigator />

        <Canvas
          onImageDrop={handleImageDrop}
        />

        <Tabs
          activeId={activeSidePanelTab}
          onChange={(id) => setActiveSidePanelTab(id as 'properties' | 'images' | 'layouts')}
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
              onClose={() => setActiveSidePanelTab('properties')}
            />
          </TabPane>
          <TabPane id="layouts" label="Layouts">
            <LayoutPicker
              templates={templates}
              pageAspectRatio={pageAspectRatio}
              pageWidth={album.settings.pageWidth}
              pageHeight={album.settings.pageHeight}
              pageUnit={album.settings.unit}
              selectedPageElementCount={selectedPageElementCount}
              selectedPageLabel={selectedPageLabel}
              selectedPageNumber={selectedPageNumber}
              onApply={(template) => {
                const nextElements = applyTemplateToSpreadSide(
                  currentSpread.elements,
                  template,
                  album.settings,
                  selectedPageSide
                );
                updateSpread(currentSpread.id, { elements: nextElements });
                setSelectedPageId(currentSpread.id);
                setSelectedElementId(null);
                setActiveSidePanelTab('properties');
              }}
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
