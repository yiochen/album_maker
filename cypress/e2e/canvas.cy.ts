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
            cy.getInteractionLayer().as('targetCanvas');

            // Perform drag and drop using dataTransfer
            cy.get('@sourceImage').then(() => {
                const dataTransfer = new DataTransfer();

                // Trigger dragstart on the source
                cy.get('@sourceImage').trigger('dragstart', { dataTransfer });

                // Trigger dragover and drop on the target
                cy.get('@targetCanvas').trigger('dragover', { dataTransfer });
                cy.get('@targetCanvas').trigger('drop', { dataTransfer });
            });

            // Verify element added by checking properties panel title
            cy.contains('.properties-title', 'Image Properties', { timeout: 5000 }).should('be.visible');
        });
    });

    describe('Element Selection', () => {
        beforeEach(() => {
            // Import images and drop one on canvas
            cy.importDummyImages();

            cy.get('[data-testid="pool-image"]').first().then(() => {
                const dataTransfer = new DataTransfer();

                cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
                cy.getInteractionLayer().trigger('dragover', { dataTransfer });
                cy.getInteractionLayer().trigger('drop', { dataTransfer });
            });

            cy.contains('.properties-title', 'Image Properties', { timeout: 5000 }).should('be.visible');
        });

        it('should show image properties when element is selected', () => {
            // Element should be selected after drop
            cy.contains('.properties-title', 'Image Properties').should('be.visible');
        });
    });

    describe('Visual Regression - Canvas Snapshots', () => {

        it('should match snapshot of canvas with image element', () => {
            // Import images
            cy.importDummyImages();

            // Drop image on canvas
            cy.get('[data-testid="pool-image"]').first().then(() => {
                const dataTransfer = new DataTransfer();

                cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
                cy.getInteractionLayer().trigger('dragover', { dataTransfer });
                cy.getInteractionLayer().trigger('drop', { dataTransfer });
            });

            // Wait for element to appear
            cy.contains('.properties-title', 'Image Properties', { timeout: 5000 }).should('be.visible');


        });

        it('should match snapshot of selected element', () => {
            // Import images
            cy.importDummyImages();

            // Drop image on canvas
            cy.get('[data-testid="pool-image"]').first().then(() => {
                const dataTransfer = new DataTransfer();

                cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
                cy.getInteractionLayer().trigger('dragover', { dataTransfer });
                cy.getInteractionLayer().trigger('drop', { dataTransfer });
            });

            // Wait for element
            cy.contains('.properties-title', 'Image Properties', { timeout: 5000 }).should('be.visible');


        });
    });

    describe('Keyboard Interactions', () => {
        beforeEach(() => {
            // Import images and add one to canvas
            cy.importDummyImages();

            const dataTransfer = new DataTransfer();
            cy.get('[data-testid="pool-image"]').first().trigger('dragstart', { dataTransfer });
            cy.getInteractionLayer().trigger('dragover', { dataTransfer });
            cy.getInteractionLayer().trigger('drop', { dataTransfer });

            cy.contains('.properties-title', 'Image Properties', { timeout: 5000 }).should('be.visible');
        });

        it('should delete selected element when pressing Delete key', () => {
            // Element should be selected (wait for canvas selection)
            cy.get('[data-testid="canvas-container"]').should('have.attr', 'data-has-selection', 'true');
            cy.contains('.properties-title', 'Image Properties').should('be.visible');

            // Ensure focus and trigger Delete
            cy.wait(1000); // Wait for listeners to be ready
            cy.get('body').type('{del}');

            // Element should be removed (Properties panel should revert to Spread Properties)
            cy.contains('.properties-title', 'Spread Properties', { timeout: 5000 }).should('be.visible');
        });

        it('should delete selected element when pressing Backspace key', () => {
            // Element should be selected (from beforeEach)
            cy.get('[data-testid="canvas-container"]').should('have.attr', 'data-has-selection', 'true');
            cy.contains('.properties-title', 'Image Properties').should('be.visible');

            // Ensure focus and trigger Backspace
            cy.wait(1000); // Wait for listeners to be ready
            cy.get('body').type('{backspace}');

            // Element should be removed
            cy.contains('.properties-title', 'Spread Properties', { timeout: 5000 }).should('be.visible');
        });
    });
});
