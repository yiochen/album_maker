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
            cy.get('[data-testid="add-pages-button"]').should('not.be.disabled').click();

            // Should have one more spread
            cy.get('[data-testid="spread-thumbnail"]').should('have.length', initialCount + 1);
        });
    });

    it('should navigate between spreads', () => {
        // Wait for initial render
        cy.get('[data-testid="spread-thumbnail"]').should('have.length.at.least', 1);

        // Add another spread first to ensure we have at least 2
        cy.get('[data-testid="add-pages-button"]')
            .should('not.be.disabled')
            .click();

        // Ensure we have at least 2 spreads before trying to interact
        // Use a more specific selector strategy to wait for the second element
        cy.get('[data-testid="spread-thumbnail"]')
            .should('have.length.at.least', 2);

        // Select left page of the second spread
        cy.get('[data-testid="spread-thumbnail"]').eq(1).within(() => {
            cy.get('[data-testid="page-thumbnail-left"]').should('be.visible').click();
            cy.get('[data-testid="page-thumbnail-left"]').should('have.class', 'active');
        });

        // Select right page of the first spread
        cy.get('[data-testid="spread-thumbnail"]').eq(0).within(() => {
            cy.get('[data-testid="page-thumbnail-right"]').should('be.visible').click();
            cy.get('[data-testid="page-thumbnail-right"]').should('have.class', 'active');
        });
    });

    it('should display page numbers on thumbnails', () => {
        cy.get('[data-testid="spread-thumbnail"]').first().within(() => {
            cy.get('[data-testid="page-number"]').eq(0).should('contain', '1');
            cy.get('[data-testid="page-number"]').eq(1).should('contain', '2');
        });
    });

    it('should delete a spread with the Delete key', () => {
        // First, ensure we have at least 2 spreads
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            if ($spreads.length < 2) {
                cy.get('[data-testid="add-pages-button"]').click();
            }
        });

        // Get the count before deletion
        cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
            const countBefore = $spreads.length;

            // Select the last spread
            cy.get('[data-testid="spread-thumbnail"]').last().within(() => {
                cy.get('[data-testid="page-thumbnail-left"]').click();
            });

            // Delete the selected spread via keyboard
            cy.get('body').type('{del}');

            // Should have one less spread
            cy.get('[data-testid="spread-thumbnail"]').should('have.length', countBefore - 1);
        });
    });

    it('should not delete when only one spread exists', () => {
        const deleteUntilSingle = () => {
            cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
                if ($spreads.length <= 1) {
                    return;
                }

                cy.get('[data-testid="spread-thumbnail"]').last().within(() => {
                    cy.get('[data-testid="page-thumbnail-left"]').click();
                });
                cy.get('body').type('{del}');
                deleteUntilSingle();
            });
        };

        deleteUntilSingle();

        cy.get('[data-testid="spread-thumbnail"]').should('have.length', 1);
        cy.get('body').type('{del}');
        cy.get('[data-testid="spread-thumbnail"]').should('have.length', 1);
    });

    it('should show page count in header', () => {
        cy.get('[data-testid="page-count"]').should('contain', 'spreads');
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

                // Close settings by clicking the close button or overlay
                cy.get('[data-testid="modal-close"]').click();
                cy.get('[data-testid="modal-overlay"]').should('not.exist');

                // Add one spread (should work)
                cy.get('[data-testid="add-pages-button"]').should('not.be.disabled').click();

                // Add button should now be disabled
                cy.get('[data-testid="add-pages-button"]').should('be.disabled');
            }
        });
    });

});
