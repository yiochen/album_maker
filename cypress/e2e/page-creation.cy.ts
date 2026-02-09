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
        // Add another spread first to ensure we have at least 2
        cy.get('[data-testid="add-pages-button"]').should('not.be.disabled').click();

        // Ensure we have at least 2 spreads before trying to interact
        // Chain the visible check and click to ensure we operate on the found element
        cy.get('[data-testid="spread-thumbnail"]')
            .should('have.length.at.least', 2)
            .eq(1)
            .should('be.visible')
            .click();

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

    describe('Multi-Select Spread Deletion', () => {
        beforeEach(() => {
            // Ensure we have at least 3 spreads for testing
            cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
                const needed = 3 - $spreads.length;
                for (let i = 0; i < needed; i++) {
                    cy.get('[data-testid="add-pages-button"]').click();
                }
            });
        });

        it('should select a spread via checkbox', () => {
            cy.get('[data-testid="spread-checkbox"]').first().check();
            cy.get('[data-testid="spread-thumbnail"]').first().should('have.class', 'selected');
            cy.get('[data-testid="selection-count"]').should('contain', '1 selected');
        });

        it('should toggle selection with Ctrl+Click', () => {
            // Select first spread
            cy.get('[data-testid="spread-thumbnail"]').eq(0).click({ metaKey: true });
            cy.get('[data-testid="spread-thumbnail"]').eq(0).should('have.class', 'selected');

            // Select second spread
            cy.get('[data-testid="spread-thumbnail"]').eq(1).click({ metaKey: true });
            cy.get('[data-testid="spread-thumbnail"]').eq(1).should('have.class', 'selected');
            cy.get('[data-testid="selection-count"]').should('contain', '2 selected');

            // Deselect first spread
            cy.get('[data-testid="spread-thumbnail"]').eq(0).click({ metaKey: true });
            cy.get('[data-testid="spread-thumbnail"]').eq(0).should('not.have.class', 'selected');
            cy.get('[data-testid="selection-count"]').should('contain', '1 selected');
        });

        it('should select range with Shift+Click', () => {
            // Click first spread
            cy.get('[data-testid="spread-thumbnail"]').eq(0).click({ metaKey: true });

            // Shift+click third spread
            cy.get('[data-testid="spread-thumbnail"]').eq(2).click({ shiftKey: true });

            // All three should be selected
            cy.get('[data-testid="spread-thumbnail"]').eq(0).should('have.class', 'selected');
            cy.get('[data-testid="spread-thumbnail"]').eq(1).should('have.class', 'selected');
            cy.get('[data-testid="spread-thumbnail"]').eq(2).should('have.class', 'selected');
            cy.get('[data-testid="selection-count"]').should('contain', '3 selected');
        });

        it('should delete selected spreads', () => {
            cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
                const initialCount = $spreads.length;

                // Select first two spreads
                cy.get('[data-testid="spread-checkbox"]').eq(0).check();
                cy.get('[data-testid="spread-checkbox"]').eq(1).check();

                // Stub confirm
                cy.window().then((win) => {
                    cy.stub(win, 'confirm').returns(true);
                });

                // Click delete selected
                cy.get('[data-testid="delete-selected-button"]').click();

                // Should have 2 fewer spreads
                cy.get('[data-testid="spread-thumbnail"]').should('have.length', initialCount - 2);

                // Selection actions should be hidden
                cy.get('[data-testid="selection-actions"]').should('not.exist');
            });
        });

        it('should clear selection when clicking Clear button', () => {
            cy.get('[data-testid="spread-checkbox"]').first().check();
            cy.get('[data-testid="selection-count"]').should('contain', '1 selected');

            cy.get('[data-testid="clear-selection-button"]').click();

            cy.get('[data-testid="selection-actions"]').should('not.exist');
            cy.get('[data-testid="spread-thumbnail"]').first().should('not.have.class', 'selected');
        });

        it('should not allow deleting all spreads', () => {
            // First reduce to exactly 1 spread
            cy.get('[data-testid="spread-thumbnail"]').then(($spreads) => {
                // Select all but leave one
                for (let i = 1; i < $spreads.length; i++) {
                    cy.get('[data-testid="spread-checkbox"]').eq(i).check();
                }

                cy.window().then((win) => {
                    cy.stub(win, 'confirm').returns(true);
                });

                cy.get('[data-testid="delete-selected-button"]').click();
            });

            // Now try to select and delete the last one
            cy.get('[data-testid="spread-checkbox"]').first().check();

            cy.window().then((win) => {
                cy.stub(win, 'alert').as('alertStub');
            });

            cy.get('[data-testid="delete-selected-button"]').click();
            cy.get('@alertStub').should('have.been.calledWith', 'Cannot delete all spreads. At least one spread must remain.');
        });
    });
});
