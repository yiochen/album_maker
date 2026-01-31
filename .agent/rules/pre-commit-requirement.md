---
trigger: always_on
---

- **Pre-Commit Requirement:** Before announcing a task as "Complete" or attempting a git commit, you MUST execute `npm run lint` and `npm run build`.
- **Failure Protocol:** If the build or lint fails, you must fix the errors automatically and retry until they pass. Do not ask for permission to fix linting errors.
- **No Cypress:** Do not attempt to run cypress, since it is incompatible with the environment. Cypress and test:e2e will be run by the CI environment when the commit is pushed.
