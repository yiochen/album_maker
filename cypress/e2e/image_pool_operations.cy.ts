describe('Image Pool Operations', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for app to load
    cy.get('[data-testid="canvas-container"]').should('exist');
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
});
