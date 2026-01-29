import { Command } from './Command';
import { Album, PoolImage } from '../types';

export class AddToPoolCommand implements Command<Album> {
    readonly type = 'ADD_TO_POOL';

    constructor(public readonly images: PoolImage[]) {}

    execute(state: Album): Album {
        return {
            ...state,
            imagePool: [...state.imagePool, ...this.images],
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        const idsToRemove = new Set(this.images.map(img => img.id));
        return {
            ...state,
            imagePool: state.imagePool.filter(img => !idsToRemove.has(img.id)),
            updatedAt: Date.now(),
        };
    }
}

export class RemoveFromPoolCommand implements Command<Album> {
    readonly type = 'REMOVE_FROM_POOL';
    private removedImage: PoolImage | null = null;

    constructor(public readonly imageId: string) {}

    execute(state: Album): Album {
        const image = state.imagePool.find(img => img.id === this.imageId);
        if (image) {
            this.removedImage = image;
        }

        return {
            ...state,
            imagePool: state.imagePool.filter(img => img.id !== this.imageId),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (!this.removedImage) return state;
        return {
            ...state,
            imagePool: [...state.imagePool, this.removedImage],
            updatedAt: Date.now(),
        };
    }
}

export class ClearPoolCommand implements Command<Album> {
    readonly type = 'CLEAR_POOL';
    private clearedImages: PoolImage[] = [];

    execute(state: Album): Album {
        this.clearedImages = state.imagePool;
        return {
            ...state,
            imagePool: [],
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        return {
            ...state,
            imagePool: this.clearedImages,
            updatedAt: Date.now(),
        };
    }
}
