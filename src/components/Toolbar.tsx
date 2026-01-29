import React, { useState } from 'react';
import { Album } from '../types';
import { exportAsJSON, importFromJSON } from '../services/storage';
import { exportAllPages } from '../services/export';

interface ToolbarProps {
    album: Album;
    isAuthenticated: boolean;
    isLoading: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onNameChange: (name: string) => void;
    onImport: (album: Album) => void;
    onToggleImagePool: () => void;
    isImagePoolOpen: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
    album,
    isAuthenticated,
    isLoading,
    onConnect,
    onDisconnect,
    onNameChange,
    onImport,
    onToggleImagePool,
    isImagePoolOpen,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(album.name);
    const [isExporting, setIsExporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleNameSubmit = () => {
        onNameChange(editName.trim() || 'Untitled Album');
        setIsEditing(false);
    };

    const handleExportJSON = () => {
        exportAsJSON(album);
    };

    const handleExportPages = async () => {
        setIsExporting(true);
        try {
            await exportAllPages(album, {}, (progress) => {
                console.log(`Exporting page ${progress.currentPage}/${progress.totalPages}`);
            });
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const importedAlbum = await importFromJSON(file);
            onImport(importedAlbum);
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import album. Please check the file format.');
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <header className="toolbar">
            <div className="toolbar-section">
                {/* Logo/Title */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15L16 10L11 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 18L10 14L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Editable Album Name */}
                {isEditing ? (
                    <input
                        type="text"
                        className="toolbar-title"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleNameSubmit}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                        autoFocus
                    />
                ) : (
                    <button
                        className="toolbar-title"
                        onClick={() => {
                            setEditName(album.name);
                            setIsEditing(true);
                        }}
                    >
                        {album.name}
                    </button>
                )}
            </div>

            <div className="toolbar-section">
                {/* Image Pool Toggle */}
                <button
                    className={`btn btn-ghost btn-icon ${isImagePoolOpen ? 'active' : ''}`}
                    onClick={onToggleImagePool}
                    title="Toggle Image Pool"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </button>

                <div className="toolbar-divider" />

                {/* Google Photos Connection */}
                {isAuthenticated ? (
                    <>
                        <div className="connection-status">
                            <span className="connection-dot connected" />
                            <span>Connected</span>
                        </div>
                        <button className="btn btn-ghost" onClick={onDisconnect}>
                            Disconnect
                        </button>
                    </>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={onConnect}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading-spinner" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Connect Google Photos
                            </>
                        )}
                    </button>
                )}

                <div className="toolbar-divider" />

                {/* Import/Export */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    style={{ display: 'none' }}
                />
                <button
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                >
                    Import
                </button>
                <button className="btn btn-secondary" onClick={handleExportJSON}>
                    Save JSON
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleExportPages}
                    disabled={isExporting || album.pages.length === 0}
                >
                    {isExporting ? 'Exporting...' : 'Export Pages'}
                </button>
            </div>
        </header>
    );
};
