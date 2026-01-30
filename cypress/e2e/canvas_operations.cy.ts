describe('Canvas Operations', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for app to load
    cy.get('[data-testid="canvas-container"]').should('exist');
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
