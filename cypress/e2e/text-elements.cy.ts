describe('Text Elements', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.waitForAppReady();
    });

    describe('Adding a Text Element', () => {
        it('should add a text element via the toolbar button', () => {
            // Click the Add Text button
            cy.get('[data-testid="add-text-btn"]').click();

            // Wait for the element to be created and selected
            cy.wait(500);

            // Switch to properties panel
            cy.contains('button', 'Properties').click({ force: true });

            // Verify the properties panel shows "Text Properties"
            cy.contains('.properties-title', 'Text Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should show text placeholder content on canvas', () => {
            cy.get('[data-testid="add-text-btn"]').click();
            cy.wait(500);

            // Canvas placeholder should be gone (element was added)
            cy.contains('Drag images here').should('not.exist');

            // Canvas should indicate selection
            cy.get('[data-testid="canvas-container"]')
                .should('have.attr', 'data-has-selection', 'true');
        });
    });

    describe('Text Properties Panel', () => {
        beforeEach(() => {
            // Add a text element and switch to properties
            cy.get('[data-testid="add-text-btn"]').click();
            cy.wait(500);
            cy.contains('button', 'Properties').click({ force: true });
            cy.contains('.properties-title', 'Text Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should display text style section', () => {
            cy.contains('Text Style').should('be.visible');
        });

        it('should display font input', () => {
            cy.get('[data-testid="text-font-input"]').should('be.visible');
            cy.get('[data-testid="text-font-input"]').should('have.value', 'Inter, sans-serif');
        });

        it('should display color picker', () => {
            cy.get('[data-testid="text-color-panel-input"]').should('be.visible');
        });

        it('should display alignment buttons', () => {
            cy.get('[data-testid="text-align-left"]').should('be.visible');
            cy.get('[data-testid="text-align-center"]').should('be.visible');
            cy.get('[data-testid="text-align-right"]').should('be.visible');
        });

        it('should have left alignment active by default', () => {
            cy.get('[data-testid="text-align-left"]').should('have.class', 'active');
        });
    });

    describe('Text Element Deletion', () => {
        beforeEach(() => {
            cy.get('[data-testid="add-text-btn"]').click();
            cy.wait(500);
            cy.contains('button', 'Properties').click({ force: true });
            cy.contains('.properties-title', 'Text Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should delete the text element when pressing Delete', () => {
            cy.get('[data-testid="canvas-container"]').should('have.attr', 'data-has-selection', 'true');
            cy.get('body').type('{del}');
            cy.contains('.properties-title', 'Spread Properties', { timeout: 10000 }).should('be.visible');
        });
    });
});
