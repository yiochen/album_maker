import React, { useState, useEffect, useCallback } from 'react';
import { AlbumMetadata } from '../types';
import { albumStorage } from '../services/storage';
import { MenuIcon } from './icons/MenuIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

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
                <MenuIcon width="16" height="16" />
                <span>{currentAlbum?.name || 'Select Album'}</span>
                <ChevronDownIcon
                    width="12"
                    height="12"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                />
            </button>

            {isOpen && (
                <div className="album-selector-dropdown">
                    <div className="album-selector-header">
                        <span>Albums</span>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsCreating(true)}
                        >
                            <PlusIcon width="14" height="14" />
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
                                            <TrashIcon width="14" height="14" />
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
