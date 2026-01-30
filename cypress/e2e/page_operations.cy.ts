describe('Page Operations', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for app to load
    cy.get('[data-testid="canvas-container"]').should('exist');
  });

  it('should add pages', () => {
    // Initial state: 1 spread (2 pages)
    cy.get('[data-testid^="spread-thumbnail-"]').should('have.length', 1);

    // Add pages
    cy.get('[data-testid="add-page-btn"]').click();

    // Verify 2 spreads
    cy.get('[data-testid^="spread-thumbnail-"]').should('have.length', 2);
  });
});
