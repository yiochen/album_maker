/// <reference types="cypress" />
/* eslint-disable @typescript-eslint/no-namespace */

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Create a new album with the given name
             */
            createAlbum(name: string): Chainable<void>;

            /**
             * Open the album settings panel
             */
            openAlbumSettings(): Chainable<void>;

            /**
             * Open the image pool panel
             */
            openImagePool(): Chainable<void>;

            /**
             * Import images from the dummy colors source
             */
            importDummyImages(): Chainable<void>;

            /**
             * Get the main canvas container
             */
            getCanvas(): Chainable<JQuery<HTMLElement>>;

            /**
             * Get the canvas layer (HTML canvas element)
             */
            getCanvasLayer(): Chainable<JQuery<HTMLElement>>;

            /**
             * Wait for the app to be fully loaded
             */
            waitForAppReady(): Chainable<void>;

            /**
             * Get the interaction layer (for drag/drop operations)
             */
            getInteractionLayer(): Chainable<JQuery<HTMLElement>>;

            /**
             * Drag and drop an element onto a target using @dnd-kit pointer events.
             * Works with useDraggable/useDroppable from @dnd-kit/core.
             * @param targetSelector - CSS selector for the drop target
             */
            dndKitDragTo(targetSelector: string): Chainable<void>;
        }
    }
}

// Wait for the app to be fully loaded
Cypress.Commands.add('waitForAppReady', () => {
    // Wait for the main app container to be visible
    cy.get('[data-testid="album-editor"]', { timeout: 10000 }).should('be.visible');
    // Wait for the canvas to be ready
    cy.get('[data-testid="canvas-container"]', { timeout: 10000 }).should('exist');
});

// Create a new album
Cypress.Commands.add('createAlbum', (name: string) => {
    // Click the album selector to open the dropdown
    cy.get('[data-testid="album-selector"]').click();
    // Click "Create new album" button
    cy.contains('button', 'Create new album').click();
    // Type the album name in the prompt (if there's a dialog)
    cy.window().then((win) => {
        // The app uses window.prompt, so we need to stub it
        cy.stub(win, 'prompt').returns(name);
    });
});

// Open album settings panel
Cypress.Commands.add('openAlbumSettings', () => {
    // Click the settings button in the toolbar
    cy.get('[data-testid="settings-button"]').click();
    // Wait for the settings panel to appear
    cy.get('[data-testid="album-settings-panel"]', { timeout: 5000 }).should('be.visible');
});

// Open image pool panel
Cypress.Commands.add('openImagePool', () => {
    // Check if image pool is already open
    cy.get('body').then(($body) => {
        if (!$body.find('[data-testid="image-pool"]').length) {
            cy.get('[data-testid="toggle-image-pool-button"]').click();
        }
    });
    // Wait for the image pool to appear
    cy.get('[data-testid="image-pool"]', { timeout: 5000 }).should('be.visible');
});

// Import images from dummy source
Cypress.Commands.add('importDummyImages', () => {
    // Open image pool if not already open
    cy.openImagePool();

    // Make sure dummy colors source is selected and wait for state to propagate
    cy.get('[data-testid="source-selector"]')
        .select('dummy-colors')
        .should('have.value', 'dummy-colors');

    // Small delay to let React state catch up if needed
    cy.wait(100);

    // Click import button when ready
    cy.get('[data-testid="import-button"]')
        .should('not.be.disabled')
        .click();

    // Wait for images to load
    cy.get('[data-testid="pool-image"]', { timeout: 10000 }).should('have.length.at.least', 1);
});

// Get canvas container
Cypress.Commands.add('getCanvas', () => {
    return cy.get('[data-testid="canvas-container"]');
});

// Get canvas layer
Cypress.Commands.add('getCanvasLayer', () => {
    return cy.get('[data-testid="canvas-layer"]');
});

// Get interaction layer (for drag/drop)
Cypress.Commands.add('getInteractionLayer', () => {
    return cy.get('[data-testid="interaction-layer"]');
});

/**
 * Drag and drop using @dnd-kit pointer events.
 * 
 * @dnd-kit uses PointerSensor which listens for pointer events, not HTML5 drag events.
 * This command simulates the pointer event sequence that @dnd-kit expects:
 * 1. pointerdown on source element
 * 2. pointermove on document (with distance > activation threshold)
 * 3. pointermove on document (to target position)
 * 4. pointerup on document/source
 */
Cypress.Commands.add('dndKitDragTo', { prevSubject: 'element' }, ($source: JQuery<HTMLElement>, targetSelector: string) => {
    const sourceRect = $source[0].getBoundingClientRect();
    const sourceX = sourceRect.left + sourceRect.width / 2;
    const sourceY = sourceRect.top + sourceRect.height / 2;

    cy.get(targetSelector).then(($target) => {
        const targetRect = $target[0].getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;

        // Common event properties
        const eventProps = {
            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            bubbles: true,
            cancelable: true,
        };

        // 1. pointerdown on source
        cy.wrap($source).trigger('pointerdown', {
            ...eventProps,
            clientX: sourceX,
            clientY: sourceY,
            button: 0,
            buttons: 1,
            force: true,
        });

        // Small wait for sensor activation
        cy.wait(150);

        // 2. pointermove on body to activate sensor (distance constraint)
        cy.get('body').trigger('pointermove', {
            ...eventProps,
            clientX: sourceX + 10,
            clientY: sourceY + 10,
            buttons: 1,
            force: true,
        });

        cy.wait(100);

        // 3. pointermove on body to reach target
        cy.get('body').trigger('pointermove', {
            ...eventProps,
            clientX: targetX,
            clientY: targetY,
            buttons: 1,
            force: true,
        });

        cy.wait(100);

        // 4. pointerup on body to complete drop
        cy.get('body').trigger('pointerup', {
            ...eventProps,
            clientX: targetX,
            clientY: targetY,
            force: true,
        });
    });
});

export { };

export { };
