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

            on('before:browser:launch', (browser, launchOptions) => {
                if (browser.family === 'chromium' && browser.name !== 'electron') {
                    // Mac/Linux
                    launchOptions.args.push('--force-device-scale-factor=1');
                    launchOptions.args.push('--high-dpi-support=1');
                } else if (browser.family === 'chromium' && browser.name === 'electron') {
                    // Electron's way to control window size and scale
                    launchOptions.preferences.width = config.viewportWidth;
                    launchOptions.preferences.height = config.viewportHeight;
                    launchOptions.preferences.deviceScaleFactor = 1;
                }
                return launchOptions;
            });

            return config;
        },
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'cypress/support/e2e.ts',
    },
});
