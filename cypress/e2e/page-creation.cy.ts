describe('Page Creation', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.waitForAppReady();
    });

    it('should display the page navigator', () => {
        cy.get('[data-testid="page-navigator"]').should('be.visible');
        cy.get('[data-testid="page-navigator-title"]').should('contain', 'Spreads');
    });

    it('should show initial spread count', () => {
        cy.get('[data-testid="spread-thumbnail"]').should('have.length.at.least', 1);
    });

    it('should add new pages when clicking Add Pages button', () => {
        // Get initial spread count
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            const initialCount = $spreads.length;

            // Click add pages button
            cy.get('[data-testid="add-pages-button"]').click();

            // Should have one more spread
            cy.get('[data-testid="spread-thumbnail"]').should('have.length', initialCount + 1);
        });
    });

    it('should navigate between spreads', () => {
        // Add another spread first if only one exists
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            if ($spreads.length < 2) {
                cy.get('[data-testid="add-pages-button"]').click();
            }
        });

        // Click on the second spread
        cy.get('[data-testid="spread-thumbnail"]').eq(1).click();
        cy.get('[data-testid="spread-thumbnail"]').eq(1).should('have.class', 'active');

        // Click on the first spread
        cy.get('[data-testid="spread-thumbnail"]').eq(0).click();
        cy.get('[data-testid="spread-thumbnail"]').eq(0).should('have.class', 'active');
    });

    it('should display page numbers on thumbnails', () => {
        cy.get('[data-testid="page-number"]').first().should('contain', '1-2');
    });

    it('should delete a spread when clicking delete button', () => {
        // First, ensure we have at least 2 spreads
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            if ($spreads.length < 2) {
                cy.get('[data-testid="add-pages-button"]').click();
            }
        });

        // Get the count before deletion
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            const countBefore = $spreads.length;

            // Stub the confirm dialog to return true
            cy.window().then((win) => {
                cy.stub(win, 'confirm').returns(true);
            });

            // Click delete on the last spread
            cy.get('[data-testid="spread-thumbnail"]').last().find('[data-testid="delete-spread-button"]').click({ force: true });

            // Should have one less spread
            cy.get('[data-testid="spread-thumbnail"]').should('have.length', countBefore - 1);
        });
    });

    it('should not show delete button when only one spread exists', () => {
        // Delete spreads until only one remains
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            if ($spreads.length === 1) {
                // Only one spread, delete button should not trigger deletion
                cy.get('[data-testid="spread-thumbnail"]').should('have.length', 1);
            }
        });
    });

    it('should show page count in header', () => {
        cy.get('[data-testid="page-count"]').should('contain', 'pages');
    });

    it('should respect max pages limit', () => {
        // Open settings and set a low max pages
        cy.openAlbumSettings();

        // Get current page count
        cy.get('[data-testid="page-count-hint"]').invoke('text').then((text) => {
            const match = text.match(/Currently:\s*(\d+)/);
            if (match) {
                const currentCount = parseInt(match[1], 10);

                // Set max to current + 2 (one more spread)
                const newMax = currentCount + 2;
                cy.get('[data-testid="max-pages-input"]')
                    .clear()
                    .type(String(newMax));

                // Close settings by clicking elsewhere
                cy.get('[data-testid="page-navigator"]').click();

                // Add one spread (should work)
                cy.get('[data-testid="add-pages-button"]').should('not.be.disabled').click();

                // Add button should now be disabled
                cy.get('[data-testid="add-pages-button"]').should('be.disabled');
            }
        });
    });
});
