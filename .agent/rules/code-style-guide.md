---
trigger: always_on
---

- **Component Pattern:** Use functional components with hooks. 
- **Typing:** Every component prop and state object must have a defined TypeScript interface. Avoid `any`.
- **Document the business logic**
- **Write UI tests:** Make sure to add cypress tests when implementing UI actions.
- **Proactive Refactoring:** Prioritize code health. Do not append code to existing large files, functions, or components. Instead, restructure the code and create better abstractions to break it into smaller, manageable pieces.
- **Generalize Patterns:** When implementing something that follows an existing pattern, seek to generalize it into a helper or reusable utility rather than just duplicating the implementation. 
- **Goal-Oriented Health:** Treat maintaining and improving code health as a primary goal of every task, not just adding new features.
