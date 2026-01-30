"use strict";
describe('Album Settings', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.waitForAppReady();
        cy.openAlbumSettings();
    });
    it('should display the album settings panel', () => {
        cy.get('[data-testid="album-settings-panel"]').should('be.visible');
        cy.get('[data-testid="settings-title"]').should('contain', 'Album Settings');
    });
    it('should change page width', () => {
        cy.get('[data-testid="page-width-input"]').clear().type('10');
        cy.get('[data-testid="page-width-input"]').should('have.value', '10');
    });
    it('should change page height when not in square mode', () => {
        // First, ensure square mode is off
        cy.get('[data-testid="square-checkbox"]').then(($checkbox) => {
            if ($checkbox.is(':checked')) {
                cy.wrap($checkbox).click();
            }
        });
        cy.get('[data-testid="page-height-input"]').should('be.visible');
        cy.get('[data-testid="page-height-input"]').clear().type('8');
        cy.get('[data-testid="page-height-input"]').should('have.value', '8');
    });
    it('should toggle square mode', () => {
        // Get the checkbox and toggle it
        cy.get('[data-testid="square-checkbox"]').as('squareCheckbox');
        cy.get('@squareCheckbox').then(($checkbox) => {
            const wasChecked = $checkbox.is(':checked');
            // Toggle the checkbox
            cy.get('@squareCheckbox').click();
            if (wasChecked) {
                // Square mode was on, now off - height input should appear
                cy.get('[data-testid="page-height-input"]').should('be.visible');
            }
            else {
                // Square mode was off, now on - height input should disappear
                cy.get('[data-testid="page-height-input"]').should('not.exist');
            }
        });
    });
    it('should sync width and height in square mode', () => {
        // Enable square mode first
        cy.get('[data-testid="square-checkbox"]').then(($checkbox) => {
            if (!$checkbox.is(':checked')) {
                cy.wrap($checkbox).click();
            }
        });
        // Height input should not be visible in square mode
        cy.get('[data-testid="page-height-input"]').should('not.exist');
        // Change width
        cy.get('[data-testid="page-width-input"]').clear().type('12');
        cy.get('[data-testid="page-width-input"]').should('have.value', '12');
    });
    it('should change units between inches and centimeters', () => {
        // Change to centimeters
        cy.get('[data-testid="unit-select"]').select('cm');
        cy.get('[data-testid="unit-select"]').should('have.value', 'cm');
        // Change back to inches
        cy.get('[data-testid="unit-select"]').select('inch');
        cy.get('[data-testid="unit-select"]').should('have.value', 'inch');
    });
    it('should change max pages setting', () => {
        cy.get('[data-testid="max-pages-input"]').clear().type('50');
        cy.get('[data-testid="max-pages-input"]').should('have.value', '50');
    });
    it('should display current page count', () => {
        cy.get('[data-testid="page-count-hint"]').should('contain', 'Currently:');
    });
});
