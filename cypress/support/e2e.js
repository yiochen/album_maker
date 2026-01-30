import { addMatchImageSnapshotCommand } from '@simonsmith/cypress-image-snapshot/command';
import './commands';
// Add visual snapshot command
addMatchImageSnapshotCommand();
// Clear IndexedDB before each test to ensure clean state
beforeEach(() => {
    cy.window().then((win) => {
        // Clear all IndexedDB databases
        if ('indexedDB' in win) {
            win.indexedDB.databases?.().then((databases) => {
                databases.forEach((db) => {
                    if (db.name) {
                        win.indexedDB.deleteDatabase(db.name);
                    }
                });
            });
        }
    });
});
