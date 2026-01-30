import { defineConfig } from 'cypress';
import { configureVisualRegression } from 'cypress-visual-regression';

export default defineConfig({
  e2e: {
    env: {
      visualRegressionType: 'regression',
      visualRegressionBaseDirectory: 'cypress/snapshots/base',
      visualRegressionDiffDirectory: 'cypress/snapshots/diff',
      visualRegressionGenerateDiff: 'always',
      visualRegressionFailSilently: false
    },
    setupNodeEvents(on, config) {
      configureVisualRegression(on);
      return config;
    },
    baseUrl: 'http://localhost:5173',
    video: false,
    screenshotOnRunFailure: true,
  },
});
