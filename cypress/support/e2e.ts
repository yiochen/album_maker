import './commands';

// Clear IndexedDB before each test to ensure clean state
beforeEach(() => {
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
