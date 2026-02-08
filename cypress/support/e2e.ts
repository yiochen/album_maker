import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';
import './commands';

// Add visual snapshot command
addMatchImageSnapshotCommand();

// Clear IndexedDB and LocalStorage before each test to ensure clean state
beforeEach(() => {
    // Clear LocalStorage
    cy.clearLocalStorage();

    cy.window().then((win) => {
        // Clear all IndexedDB databases
        if ('indexedDB' in win) {
            win.indexedDB.databases?.().then((databases: IDBDatabaseInfo[]) => {
                databases.forEach((db: IDBDatabaseInfo) => {
                    if (db.name) {
                        win.indexedDB.deleteDatabase(db.name);
                    }
                });
            });
        }
    });
});
