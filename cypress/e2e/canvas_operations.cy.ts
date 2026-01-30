describe('Canvas Operations', () => {
  beforeEach(() => {
    cy.visit('/');
    // Wait for app to load
    cy.get('[data-testid="canvas-container"]').should('exist');
  });

  it('should match visual snapshot of the canvas', () => {
    // Ensure canvas is visible
    cy.get('[data-testid="canvas"]').should('be.visible');

    // Wait for the canvas to render content
    // Since the canvas renders via JS, we need to give it a moment
    cy.wait(1000);

    // Take snapshot of the canvas container or the canvas itself
    // Increasing threshold to account for minor rendering differences in CI
    cy.get('[data-testid="canvas"]').compareSnapshot('canvas-initial-state', {
      errorThreshold: 0.2
    });
  });
});
