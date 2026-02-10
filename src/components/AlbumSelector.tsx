import React, { useState, useEffect, useCallback } from 'react';
import { AlbumMetadata } from '../types';
import { albumStorage } from '../services/storage';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';

/**
 * Props for the AlbumSelector component.
 */
interface AlbumSelectorProps {
    /** The ID of the currently selected album. */
    currentAlbumId: string | null;
    /** The name of the current album. */
    albumName: string;
    /** Callback fired when the album name is changed. */
    onAlbumNameChange: (name: string) => void;
    /** Callback fired when an album is selected. */
    onSelectAlbum: (id: string) => void;
    /** Callback fired when a new album is created. */
    onCreateAlbum: (name: string) => void;
    /** Callback fired when an album is deleted. */
    onDeleteAlbum: (id: string) => void;
}

/**
 * AlbumSelector component allows users to switch between albums, create new ones,
 * and delete existing ones via a dropdown menu.
 */
export const AlbumSelector: React.FC<AlbumSelectorProps> = ({
    currentAlbumId,
    albumName,
    onAlbumNameChange,
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

    return (
        <div className="album-selector">
            <div className="album-selector-control">
                <input
                    type="text"
                    value={albumName}
                    onChange={(e) => onAlbumNameChange(e.target.value)}
                    className="album-selector-name-input"
                    placeholder="Album name..."
                    data-testid="album-name-input"
                />
                <button
                    type="button"
                    className="album-selector-toggle"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? 'Close album list' : 'Open album list'}
                    aria-expanded={isOpen}
                    title={isOpen ? 'Close album list' : 'Open album list'}
                >
                    <ChevronDownIcon
                        width="12"
                        height="12"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    />
                </button>
            </div>

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
