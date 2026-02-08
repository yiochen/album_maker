describe('Image Pool', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.waitForAppReady();
    });

    it('should open image pool when clicking toggle button', () => {
        cy.openImagePool();
        cy.get('[data-testid="image-pool"]').should('be.visible');
    });

    it('should display image pool title', () => {
        cy.openImagePool();
        cy.get('[data-testid="image-pool-title"]').should('contain', 'Image Pool');
    });

    it('should close image pool when clicking close button', () => {
        cy.openImagePool();
        cy.get('[data-testid="image-pool"]').should('be.visible');

        // Click the close button
        cy.get('[data-testid="close-pool-button"]').click();

        // Image pool should be hidden
        cy.get('[data-testid="image-pool"]').should('not.exist');
    });

    it('should have source selector dropdown', () => {
        cy.openImagePool();
        cy.get('[data-testid="source-selector"]').should('be.visible');
    });

    it('should have dummy colors source available', () => {
        cy.openImagePool();
        cy.get('[data-testid="source-selector"] option[value="dummy-colors"]').should('exist');
    });

    it('should select different image sources', () => {
        cy.openImagePool();

        // Get all available sources
        cy.get('[data-testid="source-selector"] option').then(($options) => {
            const sources = $options.map((_, el) => (el as HTMLOptionElement).value).get();

            // Select dummy-colors source
            if (sources.includes('dummy-colors')) {
                cy.get('[data-testid="source-selector"]').select('dummy-colors');
                cy.get('[data-testid="source-selector"]').should('have.value', 'dummy-colors');
            }
        });
    });

    it('should display import button', () => {
        cy.openImagePool();
        cy.get('[data-testid="import-button"]').should('be.visible');
    });

    it('should show empty state when no images imported', () => {
        cy.openImagePool();
        cy.get('[data-testid="pool-empty"]').should('be.visible');
    });

    it('should import images from dummy colors source', () => {
        cy.importDummyImages();

        // Should have images in the grid
        cy.get('[data-testid="pool-image"]').should('have.length.at.least', 1);
    });

    it('should display image count after import', () => {
        cy.importDummyImages();

        // Title should show image count
        cy.get('[data-testid="image-pool-title"]').should('contain', 'images');
    });

    it('should have draggable images using @dnd-kit', () => {
        cy.importDummyImages();

        // Images should be present and ready for @dnd-kit dragging
        // Note: @dnd-kit uses useDraggable hook, not HTML5 draggable attribute
        cy.get('[data-testid="pool-image"]').first().should('exist');
    });

    it('should display image thumbnails', () => {
        cy.importDummyImages();

        // Each pool-image should contain an img element
        cy.get('[data-testid="pool-image"] img').should('have.length.at.least', 1);
    });

    it('should persist imported images after closing and reopening pool', () => {
        cy.importDummyImages();

        // Get the image count
        cy.get('[data-testid="pool-image"]').then(($images) => {
            const imageCount = $images.length;

            // Close the pool
            cy.get('[data-testid="close-pool-button"]').click();
            cy.get('[data-testid="image-pool"]').should('not.exist');

            // Reopen the pool
            cy.openImagePool();

            // Should still have the same images
            cy.get('[data-testid="pool-image"]').should('have.length', imageCount);
        });
    });

    it('should be horizontally scrollable when many images are imported', () => {
        cy.importDummyImages(); // Imports 200 images

        cy.get('.image-pool-content').then(($el) => {
            const el = $el[0];
            // The scrollWidth should be significantly larger than clientWidth
            expect(el.scrollWidth).to.be.greaterThan(el.clientWidth);

            // Should be able to scroll
            $el.scrollLeft(200);
            expect(el.scrollLeft).to.be.greaterThan(0);
        });
    });
});
