# Common Components (`src/components/common`)

## Purpose
Contains reusable, atomic UI components that are shared across different panels and features. These components should be agnostic of the specific business logic where possible.

## Key Components

### NumberInput (`NumberInput.tsx`)
- **Behavior**: Only commits changes (via `onChange` callback) on `blur` or when `Enter` is pressed.
- **State**: Maintains local string state to allow free typing without premature formatting.
- **Sync**: Resyncs with `value` prop only when not focused.
- **Usage**: Use this for all number fields where immediate updates on every keystroke are disruptive (e.g., dimensions, positions).

## Rules of Engagement
- **Do** keep these components generic.
- **Do** handle local UI state (like intermediate typing) within these components.
- **Do** use `data-testid` for Playwright E2E tests.
