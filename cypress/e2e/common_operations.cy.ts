describe('Common Operations', () => {
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

  it('should add pages', () => {
    // Initial state: 1 spread (2 pages)
    cy.get('[data-testid^="spread-thumbnail-"]').should('have.length', 1);

    // Add pages
    cy.get('[data-testid="add-page-btn"]').click();

    // Verify 2 spreads
    cy.get('[data-testid^="spread-thumbnail-"]').should('have.length', 2);
  });

  it('should import images', () => {
    // Open image pool if not already open (it defaults to open, but check)
    // The pool is toggleable. Let's assume it's open or click the toggle.
    // Since I didn't add testid to the toggle button, I rely on default state or class.
    // But I added testid to the "Import" button inside the pool.

    cy.get('[data-testid="import-images-btn"]').click();

    // Wait for images to appear
    cy.get('[data-testid^="pool-image-"]').should('have.length.gt', 0);
  });

  it('should match visual snapshot of the canvas', () => {
    // Ensure canvas is visible
    cy.get('[data-testid="canvas"]').should('be.visible');

    // Take snapshot of the canvas container or the canvas itself
    cy.get('[data-testid="canvas"]').compareSnapshot('canvas-initial-state', {
      errorThreshold: 0.1
    });
  });
});
