/// <reference types="cypress" />
// Wait for the app to be fully loaded
Cypress.Commands.add('waitForAppReady', () => {
    // Wait for the main app container to be visible
    cy.get('[data-testid="album-editor"]', { timeout: 10000 }).should('be.visible');
    // Wait for the canvas to be ready
    cy.get('[data-testid="canvas-container"]', { timeout: 10000 }).should('exist');
});
// Create a new album
Cypress.Commands.add('createAlbum', (name) => {
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
    // Make sure dummy colors source is selected
    cy.get('[data-testid="source-selector"]').select('dummy-colors');
    // Click import button
    cy.get('[data-testid="import-button"]').click();
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
export {};
