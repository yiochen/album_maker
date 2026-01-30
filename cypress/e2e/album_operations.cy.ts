describe('Album Operations', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for app to load
    cy.get('[data-testid="canvas-container"]').should('exist');
  });

  it('should create a new album', () => {
    const albumName = 'Test Album ' + Date.now();

    // Open album selector
    cy.get('[data-testid="album-selector-trigger"]').click();

    // Click New button
    cy.get('[data-testid="create-new-album-btn"]').click();

    // Type name
    cy.get('[data-testid="new-album-name-input"]').type(albumName);

    // Confirm create
    cy.get('[data-testid="create-album-confirm-btn"]').click();

    // Verify album name in toolbar
    cy.get('[data-testid="album-name-input"]').should('have.value', albumName);

    // Verify it appears in the list (re-open selector)
    cy.get('[data-testid="album-selector-trigger"]').click();
    cy.contains(albumName).should('exist');
  });
});
