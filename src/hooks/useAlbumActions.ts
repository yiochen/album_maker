import { useCallback } from 'react';
import type { PageElement, PoolImage } from '../types';
import { useAlbumStore } from '../states/albumStore';
import { useUIStore } from '../states/uiStore';
import { APP_CONFIG } from '../config';
import {
  albumStorage,
  createNewAlbum,
  exportAlbumAsJson,
  importAlbumFromJson,
} from '../services/storage';
import { spreadThumbnailDB, generateSpreadContentHash } from '../db';

export const useAlbumActions = () => {
  const {
    album,
    setAlbum,
    addElement,
    updateElement,
    deleteElement,
    updateSpread
  } = useAlbumStore();

  const {
    currentSpreadIndex,
    setCurrentSpreadIndex,
    setSelectedElementId,
    setSelectedPageId,
  } = useUIStore();

  const handleImageDrop = useCallback((
    spreadId: string,
    image: PoolImage,
    position: { x: number; y: number },
  ) => {
    const imageWidth = image.width || 300;
    const imageHeight = image.height || (imageWidth / 1);
    const aspectRatio = imageWidth / imageHeight;

    const halfWidth = imageWidth / 2;
    const halfHeight = imageHeight / 2;

    const newElement: PageElement = {
      id: crypto.randomUUID(),
      type: 'image',
      imageUrl: image.baseUrl,
      thumbnailUrl: image.thumbnailUrl || image.baseUrl,
      sourceId: image.sourceId,
      sourceImageId: image.sourceImageId,
      position: {
        x: position.x - halfWidth,
        y: position.y - halfHeight,
      },
      size: {
        width: imageWidth,
        height: imageHeight,
      },
      originalAspectRatio: aspectRatio,
      lockAspectRatio: true,
    };

    addElement(spreadId, newElement);
    setSelectedElementId(newElement.id);
    setSelectedPageId(spreadId);
  }, [addElement, setSelectedElementId, setSelectedPageId]);

  const handleElementUpdate = useCallback((spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
    updateElement(spreadId, elementId, updates, groupId);
  }, [updateElement]);

  const handleElementDelete = useCallback((spreadId: string, elementId: string) => {
    deleteElement(spreadId, elementId);
    setSelectedElementId(null);
    setSelectedPageId(null);
  }, [deleteElement, setSelectedElementId, setSelectedPageId]);

  const handleCanvasChange = useCallback(async (dataUrl: string) => {
    if (!album) return;
    const currentSpread = album.spreads[currentSpreadIndex];
    if (!currentSpread) return;

    const contentHash = generateSpreadContentHash(currentSpread);
    try {
      await spreadThumbnailDB.set(album.id, currentSpread.id, dataUrl, contentHash);
    } catch (error) {
      console.warn('Failed to save thumbnail:', error);
    }
  }, [album, currentSpreadIndex]);

  const handleSelectAlbum = useCallback(async (id: string) => {
    const newAlbum = await albumStorage.loadAlbum(id);
    if (newAlbum) {
      if (!newAlbum.settings) {
        newAlbum.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
      }
      await albumStorage.setCurrentAlbumId(id);
      setAlbum(newAlbum);
      setCurrentSpreadIndex(0);
      setSelectedElementId(null);
    }
  }, [setAlbum, setCurrentSpreadIndex, setSelectedElementId]);

  const handleCreateAlbum = useCallback(async (name: string) => {
    const newAlbum = createNewAlbum(name);
    await albumStorage.saveAlbum(newAlbum);
    await albumStorage.setCurrentAlbumId(newAlbum.id);
    setAlbum(newAlbum);
    setCurrentSpreadIndex(0);
    setSelectedElementId(null);
  }, [setAlbum, setCurrentSpreadIndex, setSelectedElementId]);

  const handleDeleteAlbum = useCallback(async (id: string) => {
    await albumStorage.deleteAlbum(id);
  }, []);

  const handleImportAlbum = useCallback(async () => {
    try {
      const imported = await importAlbumFromJson();
      if (!imported.settings) {
        imported.settings = { ...APP_CONFIG.DEFAULT_ALBUM_SETTINGS };
      }
      setAlbum(imported);
      setCurrentSpreadIndex(0);
      setSelectedElementId(null);
    } catch (error) {
      console.error('Failed to import album:', error);
    }
  }, [setAlbum, setCurrentSpreadIndex, setSelectedElementId]);

  const handleExportAlbum = useCallback(() => {
    if (album) exportAlbumAsJson(album);
  }, [album]);

  return {
      handleImageDrop,
      handleElementUpdate,
      handleElementDelete,
      handleCanvasChange,
      handleSelectAlbum,
      handleCreateAlbum,
      handleDeleteAlbum,
      handleImportAlbum,
      handleExportAlbum,
      updateSpread
  };
};
