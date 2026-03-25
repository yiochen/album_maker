import React from 'react';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SaveIcon } from './icons/SaveIcon';
import { ShareIcon } from './icons/ShareIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { AddImageIcon } from './icons/AddImageIcon';
import { TextIcon } from './icons/TextIcon';
import { SnappingIcon } from './icons/SnappingIcon';

interface TopBarProps {
  albumSelector: React.ReactNode;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onSettingsClick: () => void;
  onAddImage: () => void;
  onAddText: () => void;
  isSnappingEnabled: boolean;
  onSnappingToggle: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  albumSelector,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onSettingsClick,
  onAddImage,
  onAddText,
  isSnappingEnabled,
  onSnappingToggle,
}) => {
  return (
    <header className="top-bar" data-testid="toolbar">
      <div className="toolbar-left">
        {albumSelector}
        <button
          className="btn btn-ghost btn-icon"
          onClick={onSettingsClick}
          title="Album Settings"
          data-testid="settings-button"
        >
          <SettingsIcon width="18" height="18" />
        </button>
      </div>

      <div className="toolbar-section">
        <button
          className="btn btn-ghost btn-icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon width="18" height="18" />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <RedoIcon width="18" height="18" />
        </button>

        <div className="toolbar-divider" />

        <button
          className={`btn btn-ghost snap-toggle ${isSnappingEnabled ? 'active' : ''}`}
          onClick={onSnappingToggle}
          title={isSnappingEnabled ? 'Snapping enabled' : 'Snapping disabled'}
        >
          <SnappingIcon width="16" height="16" />
        </button>
        <button
          className="btn btn-ghost"
          onClick={onAddImage}
          title="Add image placeholder"
          data-testid="add-image-btn"
        >
          <AddImageIcon width="16" height="16" />
          <span>Image</span>
        </button>
        <button
          className="btn btn-ghost"
          onClick={onAddText}
          title="Add text element"
          data-testid="add-text-btn"
        >
          <TextIcon width="16" height="16" />
          <span>Text</span>
        </button>
      </div>

      <div className="toolbar-right">
        <button className="btn btn-secondary" onClick={onExport} data-testid="export-album-button">
          <ShareIcon width="16" height="16" />
          SHARE
        </button>
        <button className="btn btn-primary" data-testid="save-button">
          <SaveIcon width="16" height="16" />
          SAVE
        </button>
      </div>
    </header>
  );
};
