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
            // Drag the first image from the pool to the canvas using dndKitDragTo
            cy.get('[data-testid="pool-image"]').first()
                .dndKitDragTo('[data-testid="interaction-layer"]');

            // Verify the placeholder is gone (image was added)
            cy.contains('Drag images here').should('not.exist');

            // Small wait to ensure state stabilizes before clicking
            cy.wait(500);

            // Switch to properties panel to see the selection
            cy.contains('button', 'Properties').click({ force: true });

            // Verify element added by checking properties panel title
            cy.contains('.properties-title', 'Image Properties', { timeout: 10000 }).should('be.visible');
        });
    });

    describe('Element Selection', () => {
        beforeEach(() => {
            cy.importDummyImages();
            cy.get('[data-testid="pool-image"]').first()
                .dndKitDragTo('[data-testid="interaction-layer"]');

            // Verify the placeholder is gone (image was added)
            cy.contains('Drag images here').should('not.exist');

            // Small wait to ensure state stabilizes before clicking
            cy.wait(500);

            // Switch to properties panel to see the selection
            cy.contains('button', 'Properties').click({ force: true });

            cy.contains('.properties-title', 'Image Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should show image properties when element is selected', () => {
            // Element should be selected after drop
            cy.contains('.properties-title', 'Image Properties').should('be.visible');
        });
    });

    describe('Keyboard Interactions', () => {
        beforeEach(() => {
            cy.importDummyImages();
            cy.get('[data-testid="pool-image"]').first()
                .dndKitDragTo('[data-testid="interaction-layer"]');

            // Verify the placeholder is gone (image was added)
            cy.contains('Drag images here').should('not.exist');

            // Small wait to ensure state stabilizes before clicking
            cy.wait(500);

            // Switch to properties panel to see the selection
            cy.contains('button', 'Properties').click({ force: true });

            cy.contains('.properties-title', 'Image Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should delete selected element when pressing Delete key', () => {
            // Element should be selected
            cy.get('[data-testid="canvas-container"]').should('have.attr', 'data-has-selection', 'true');

            // Ensure focus and trigger Delete
            cy.get('body').type('{del}');

            // Element should be removed
            cy.contains('.properties-title', 'Spread Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should delete selected element when pressing Backspace key', () => {
            // Element should be selected
            cy.get('[data-testid="canvas-container"]').should('have.attr', 'data-has-selection', 'true');

            // Ensure focus and trigger Backspace
            cy.get('body').type('{backspace}');

            // Element should be removed
            cy.contains('.properties-title', 'Spread Properties', { timeout: 10000 }).should('be.visible');
        });
    });
});
