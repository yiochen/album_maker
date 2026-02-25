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

        it('should show text editing toolbar while a new text element is editing', () => {
            cy.get('[data-testid="text-editing-toolbar"]').should('be.visible');
        });

        it('should display font controls in editing toolbar', () => {
            cy.get('[data-testid="text-font-trigger"]').should('be.visible');
            cy.get('[data-testid="text-size-display"]').should('be.visible');
        });

        it('should display color picker in editing toolbar', () => {
            cy.get('[data-testid="text-color-input"]').should('be.visible');
        });

        it('should display alignment buttons in editing toolbar', () => {
            cy.get('[data-testid="text-align-left-btn"]').should('be.visible');
            cy.get('[data-testid="text-align-center-btn"]').should('be.visible');
            cy.get('[data-testid="text-align-right-btn"]').should('be.visible');
        });

        it('should have left alignment active by default', () => {
            cy.get('[data-testid="text-align-left-btn"]').should('have.class', 'active');
        });
    });

    describe('Text Element Deletion', () => {
        beforeEach(() => {
            cy.get('[data-testid="add-text-btn"]').click();
            cy.wait(500);
            cy.contains('button', 'Properties').click({ force: true });
            cy.contains('.properties-title', 'Text Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should not delete the element when pressing Delete during text editing', () => {
            cy.get('body').type('{del}');
            cy.contains('.properties-title', 'Text Properties', { timeout: 10000 }).should('be.visible');
        });

        it('should delete the text element from the properties action', () => {
            cy.contains('button', 'Delete').click({ force: true });
            cy.contains('.properties-title', 'Spread Properties', { timeout: 10000 }).should('be.visible');
        });
    });
});
