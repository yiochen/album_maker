import './commands';
import '@4tw/cypress-drag-drop';

// Clear IndexedDB before each test to ensure clean state
beforeEach(() => {
    // Clear all IndexedDB databases before each test to ensure isolation
    cy.window().then(async (win) => {
        if ('indexedDB' in win) {
            try {
                const databases = await win.indexedDB.databases?.() || [];
                for (const db of databases) {
                    if (db.name) {
                        await new Promise((resolve) => {
                            const request = win.indexedDB.deleteDatabase(db.name!);
                            request.onsuccess = () => resolve(true);
                            request.onerror = () => resolve(false);
                            request.onblocked = () => resolve(false);
                        });
                    }
                }
            } catch (e) {
                console.error('Failed to clear IndexedDB:', e);
            }
        }
    });
});

