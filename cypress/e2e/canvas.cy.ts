describe('Canvas', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.waitForAppReady();
    });

    describe('Basic Canvas Operations', () => {
        it('should display the canvas container', () => {
            cy.getCanvas().should('be.visible');
        });

        it('should display the canvas layer', () => {
            cy.getCanvasLayer().should('be.visible');
        });
    });

    describe('Image Drag and Drop', () => {
        beforeEach(() => {
            cy.importDummyImages();
        });

        it('should allow dropping image onto canvas', () => {
            // Get the first image from the pool
            cy.get('[data-testid="pool-image"]').first().as('sourceImage');

            // Get the canvas layer
            cy.getCanvasLayer().as('targetCanvas');

            // Perform drag and drop using dataTransfer
            cy.get('@sourceImage').then(() => {
                const dataTransfer = new DataTransfer();

                // Trigger dragstart on the source
                cy.get('@sourceImage').trigger('dragstart', { dataTransfer });

                // Trigger dragover and drop on the target
                cy.get('@targetCanvas').trigger('dragover', { dataTransfer });
                cy.get('@targetCanvas').trigger('drop', { dataTransfer });
            });

            // Should have a selection overlay on the canvas (element added)
            cy.get('.selection-overlay', { timeout: 5000 }).should('exist');
        });
    });

    describe('Element Selection', () => {
        beforeEach(() => {
            // Import images and drop one on canvas
            cy.importDummyImages();

            cy.get('[data-testid="pool-image"]').first().then(() => {
                const dataTransfer = new DataTransfer();

                cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
                cy.getCanvasLayer().trigger('dragover', { dataTransfer });
                cy.getCanvasLayer().trigger('drop', { dataTransfer });
            });

            cy.get('.selection-overlay', { timeout: 5000 }).should('exist');
        });

        it('should show resize handles when element is selected', () => {
            // Element should be selected after drop
            cy.get('[data-testid^="resize-handle-"]').should('have.length.at.least', 1);
        });
    });

    describe('Visual Regression - Canvas Snapshots', () => {
        it('should match snapshot of empty canvas', () => {
            cy.getCanvas().matchImageSnapshot('canvas-empty');
        });

        it('should match snapshot of canvas with image element', () => {
            // Import images
            cy.importDummyImages();

            // Drop image on canvas
            cy.get('[data-testid="pool-image"]').first().then(() => {
                const dataTransfer = new DataTransfer();

                cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
                cy.getCanvasLayer().trigger('dragover', { dataTransfer });
                cy.getCanvasLayer().trigger('drop', { dataTransfer });
            });

            // Wait for element to appear
            cy.get('.selection-overlay', { timeout: 5000 }).should('exist');

            // Take snapshot
            cy.getCanvas().matchImageSnapshot('canvas-with-image');
        });

        it('should match snapshot of selected element with handles', () => {
            // Import images
            cy.importDummyImages();

            // Drop image on canvas
            cy.get('[data-testid="pool-image"]').first().then(() => {
                const dataTransfer = new DataTransfer();

                cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
                cy.getCanvasLayer().trigger('dragover', { dataTransfer });
                cy.getCanvasLayer().trigger('drop', { dataTransfer });
            });

            // Wait for element and verify handles are visible
            cy.get('.selection-overlay', { timeout: 5000 }).should('exist');
            cy.get('[data-testid^="resize-handle-"]').should('be.visible');

            // Take snapshot of selected element
            cy.getCanvas().matchImageSnapshot('canvas-selected-element');
        });
    });

    describe('Keyboard Interactions', () => {
        beforeEach(() => {
            // Import images and add one to canvas
            cy.importDummyImages();

            const dataTransfer = new DataTransfer();
            cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
            cy.getCanvasLayer().trigger('dragover', { dataTransfer });
            cy.getCanvasLayer().trigger('drop', { dataTransfer });

            cy.get('.selection-overlay', { timeout: 5000 }).should('exist');
        });

        it('should delete selected element when pressing Delete key', () => {
            // Element should be selected
            cy.get('.selection-overlay').should('exist');

            // Press Delete
            cy.get('body').type('{del}');

            // Element should be removed
            cy.get('.selection-overlay').should('not.exist');
        });

        it('should delete selected element when pressing Backspace key', () => {
            // Add another element first since previous test might delete it
            const dataTransfer = new DataTransfer();
            cy.get('[data-testid="pool-image"]').eq(1).trigger('dragstart', { dataTransfer });
            cy.getCanvasLayer().trigger('dragover', { dataTransfer });
            cy.getCanvasLayer().trigger('drop', { dataTransfer });

            cy.get('.selection-overlay', { timeout: 5000 }).should('exist');

            // Press Backspace
            cy.get('body').type('{backspace}');

            // Element should be removed
            cy.get('.selection-overlay').should('not.exist');
        });
    });
});
