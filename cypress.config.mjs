import { defineConfig } from 'cypress';

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173',
        viewportWidth: 1440,
        viewportHeight: 900,
        video: false,
        screenshotOnRunFailure: true,
        async setupNodeEvents(on, config) {
            const { addMatchImageSnapshotPlugin } = await import('@simonsmith/cypress-image-snapshot/plugin');
            addMatchImageSnapshotPlugin(on);
            return config;
        },
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'cypress/support/e2e.ts',
    },
});
