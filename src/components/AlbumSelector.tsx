import React, { useState, useEffect, useCallback } from 'react';
import { AlbumMetadata } from '../types';
import { albumStorage } from '../services/storage';

interface AlbumSelectorProps {
    currentAlbumId: string | null;
    onSelectAlbum: (id: string) => void;
    onCreateAlbum: (name: string) => void;
    onDeleteAlbum: (id: string) => void;
}

export const AlbumSelector: React.FC<AlbumSelectorProps> = ({
    currentAlbumId,
    onSelectAlbum,
    onCreateAlbum,
    onDeleteAlbum,
}) => {
    const [albums, setAlbums] = useState<AlbumMetadata[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');

    // Load albums list
    const loadAlbums = useCallback(async () => {
        const list = await albumStorage.getAllAlbums();
        setAlbums(list);
    }, []);

    useEffect(() => {

        loadAlbums();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle create
    const handleCreate = () => {
        if (newAlbumName.trim()) {
            onCreateAlbum(newAlbumName.trim());
            setNewAlbumName('');
            setIsCreating(false);
            loadAlbums();
        }
    };

    // Handle delete
    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this album? This cannot be undone.')) {
            onDeleteAlbum(id);
            loadAlbums();
        }
    };

    // Format date
    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const currentAlbum = albums.find(a => a.id === currentAlbumId);

    return (
        <div className="album-selector">
            <button
                className="album-selector-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>{currentAlbum?.name || 'Select Album'}</span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            {isOpen && (
                <div className="album-selector-dropdown">
                    <div className="album-selector-header">
                        <span>Albums</span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsCreating(true)}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            New
                        </button>
                    </div>

                    {isCreating && (
                        <div className="album-create-form">
                            <input
                                type="text"
                                className="album-name-input"
                                placeholder="Album name..."
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                                autoFocus
                            />
                            <button className="btn btn-primary btn-sm" onClick={handleCreate}>
                                Create
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setIsCreating(false)}>
                                Cancel
                            </button>
                        </div>
                    )}

                    <div className="album-list">
                        {albums.length === 0 ? (
                            <div className="album-list-empty">
                                No albums yet. Create one to get started.
                            </div>
                        ) : (
                            albums.map((album) => (
                                <div
                                    key={album.id}
                                    className={`album-list-item ${album.id === currentAlbumId ? 'active' : ''}`}
                                    onClick={() => {
                                        onSelectAlbum(album.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="album-list-item-info">
                                        <span className="album-list-item-name">{album.name}</span>
                                        <span className="album-list-item-date">
                                            {formatDate(album.lastModified)}
                                        </span>
                                    </div>
                                    {album.id !== currentAlbumId && (
                                        <button
                                            className="album-list-item-delete"
                                            onClick={(e) => handleDelete(album.id, e)}
                                            title="Delete album"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
