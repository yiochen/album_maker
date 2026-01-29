import { Command } from './Command';
import { Album, AlbumSettings } from '../types';

export class SetAlbumNameCommand implements Command<Album> {
    readonly type = 'SET_NAME';

    constructor(
        public readonly newName: string,
        public readonly oldName: string
    ) {}

    execute(state: Album): Album {
        return {
            ...state,
            name: this.newName,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        return {
            ...state,
            name: this.oldName,
            updatedAt: Date.now(),
        };
    }
}

export class SetSettingsCommand implements Command<Album> {
    readonly type = 'SET_SETTINGS';

    constructor(
        public readonly updates: Partial<AlbumSettings>,
        public readonly oldValues: Partial<AlbumSettings>
    ) {}

    execute(state: Album): Album {
        return {
            ...state,
            settings: { ...state.settings, ...this.updates },
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        return {
            ...state,
            settings: { ...state.settings, ...this.oldValues },
            updatedAt: Date.now(),
        };
    }
}
