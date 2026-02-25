import './commands';

// Clear IndexedDB before each test to ensure clean state
beforeEach(() => {
    // Navigate to a neutral page first so no app DB connection is held open.
    cy.visit('about:blank');

    cy.window({ log: false }).then(async (win) => {
        if (!('indexedDB' in win)) return;

        try {
            await new Promise<void>((resolve) => {
                const request = win.indexedDB.open('AlbumEditorDB');

                request.onerror = () => resolve();
                request.onupgradeneeded = () => {
                    // DB did not exist and is newly created; nothing to clear.
                    request.result.close();
                    resolve();
                };

                request.onsuccess = () => {
                    const db = request.result;
                    const stores = ['albums', 'settings', 'uploadedImages']
                        .filter((name) => db.objectStoreNames.contains(name));

                    if (stores.length === 0) {
                        db.close();
                        resolve();
                        return;
                    }

                    const tx = db.transaction(stores, 'readwrite');
                    stores.forEach((name) => tx.objectStore(name).clear());
                    tx.oncomplete = () => {
                        db.close();
                        resolve();
                    };
                    tx.onerror = () => {
                        db.close();
                        resolve();
                    };
                    tx.onabort = () => {
                        db.close();
                        resolve();
                    };
                };
            });
        } catch (e) {
            // Do not fail tests on cleanup errors; startup assertions will catch real issues.
            console.error('Failed to clear IndexedDB:', e);
        }
    });
});
