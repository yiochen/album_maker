import { Command } from './Command';
import { Album, AlbumSettings } from '../types';

export class SetAlbumNameCommand implements Command<Album> {
    readonly type = 'SET_NAME';

    constructor(
        public readonly newName: string,
        public readonly oldName: string
    ) { }

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

    private newSpreadVersionIds: Map<string, string> = new Map();
    private oldSpreadVersionIds: Map<string, string> = new Map();

    constructor(
        public readonly updates: Partial<AlbumSettings>,
        public readonly oldValues: Partial<AlbumSettings>
    ) { }

    execute(state: Album): Album {
        const needsSpreadRebuild = this.updates.pageWidth !== undefined ||
            this.updates.pageHeight !== undefined ||
            this.updates.isSquare !== undefined;

        return {
            ...state,
            settings: { ...state.settings, ...this.updates },
            spreads: state.spreads.map(s => {
                if (needsSpreadRebuild) {
                    if (!this.newSpreadVersionIds.has(s.id)) {
                        this.newSpreadVersionIds.set(s.id, crypto.randomUUID());
                    }
                    if (!this.oldSpreadVersionIds.has(s.id)) {
                        this.oldSpreadVersionIds.set(s.id, s.versionId);
                    }
                    return { ...s, versionId: this.newSpreadVersionIds.get(s.id)! };
                }
                return s;
            }),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        return {
            ...state,
            settings: { ...state.settings, ...this.oldValues },
            spreads: state.spreads.map(s => {
                const oldVersionId = this.oldSpreadVersionIds.get(s.id);
                if (oldVersionId) {
                    return { ...s, versionId: oldVersionId };
                }
                return s;
            }),
            updatedAt: Date.now(),
        };
    }
}
