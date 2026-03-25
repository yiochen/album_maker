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
  useToggleSidePanel,
  useSetSettingsOpen,
  useSetSnappingEnabled,
  useEditingTextElementId,
} from '../states/uiStore';
import { useAutoSave } from '../hooks/useAutoSave';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useElementActions } from '../hooks/useElementActions';
import { useAlbumLifecycle } from '../hooks/useAlbumLifecycle';
import { AlbumSettingsPanel } from './AlbumSettingsPanel';
import { PageNavigator } from './PageNavigator';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { ImagePool } from './ImagePool';
import { AlbumSelector } from './AlbumSelector';
import { DndWrapper } from './DndWrapper';
import { Modal } from './Modal';
import { LoadingScreen } from './LoadingScreen';
import { NavRail } from './NavRail';
import { SidePanel } from './SidePanel';
import { TopBar } from './TopBar';
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
  const toggleSidePanel = useToggleSidePanel();
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

  const renderSidePanelContent = () => {
    switch (activeSidePanelTab) {
      case 'navigator':
        return <PageNavigator />;
      case 'images':
        return (
          <ImagePool
            images={album.imagePool}
            onImport={addToPool}
          />
        );
      case 'properties':
        return (
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
        );
      case 'templates':
        return (
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-container" data-testid="album-editor">
      <TopBar
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
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={() => navigate('/export')}
        onSettingsClick={() => setSettingsOpen(!isSettingsOpen)}
        onAddImage={() => {
          if (currentSpread) handleAddImage(currentSpread.id);
        }}
        onAddText={() => {
          if (currentSpread) handleAddText(currentSpread.id);
        }}
        isSnappingEnabled={isSnappingEnabled}
        onSnappingToggle={() => setSnappingEnabled(!isSnappingEnabled)}
      />

      <DndWrapper className="main-content">
        <NavRail
          activePanel={activeSidePanelTab}
          onTogglePanel={toggleSidePanel}
          onExport={() => navigate('/export')}
        />

        <SidePanel activePanel={activeSidePanelTab}>
          {renderSidePanelContent()}
        </SidePanel>

        <Canvas
          onImageDrop={handleImageDrop}
        />
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
