# Contributing to Zoom Waiting Room Manager

Thank you for your interest in improving this Zoom App! This document provides guidelines for development and contribution.

## 🏗️ Project Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **CSV Parsing**: PapaParse
- **Zoom Integration**: @zoom/appssdk

### Key Design Principles

1. **Frontend-Only**: No backend server required
2. **Resilient State**: localStorage persistence for critical data
3. **Robust Operations**: Retry logic with exponential backoff
4. **Type Safety**: Strict TypeScript throughout
5. **Performance**: Batched operations with concurrency limits

## 📁 Code Organization

```
src/
├── sdk/           # Zoom SDK wrappers
├── csv/           # CSV parsing logic
├── operations/    # Core business logic
├── state/         # State management
├── components/    # React components
├── types.ts       # TypeScript types
└── utils.ts       # Utility functions
```

### Module Responsibilities

**`sdk/zoom.ts`**

- Wraps all Zoom Apps SDK calls
- Handles errors consistently
- Returns typed results

**`csv/parse.ts`**

- Parses row-based and column-based CSV formats
- Validates and normalizes emails
- Reports errors and warnings

**`operations/matching.ts`**

- Matches CSV emails to meeting participants
- Handles participants without email

**`operations/waitingRoom.ts`**

- Moves/admits participants with retry
- Batches operations with concurrency limits
- Tracks operation results

**`state/store.ts`**

- Manages app state with Zustand
- Persists critical data to localStorage
- Provides actions for state updates

**`components/`**

- Self-contained React components
- Use Zustand hooks for state
- Follow single-responsibility principle

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Zoom desktop client
- ngrok (for local testing)

### Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000
```

### Code Style

We use ESLint and Prettier:

```bash
# Lint code
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

**Standards:**

- Use TypeScript strict mode
- Prefer functional components
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Keep functions small and focused

## 🧪 Testing

### Manual Testing Checklist

Before submitting changes, test:

- [ ] CSV upload (both formats)
- [ ] Round selection
- [ ] Start round operation
- [ ] End round operation
- [ ] Fallback mode selection
- [ ] Error handling (invalid CSV, no participants, etc.)
- [ ] State persistence (refresh page mid-round)
- [ ] Large participant lists (50+)

### Testing with Mock Data

To test without a real Zoom meeting, you can:

1. Add mock mode detection in `src/sdk/zoom.ts`
2. Return fake participant data
3. Simulate SDK responses

Example mock implementation:

```typescript
// In zoom.ts
const IS_MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true';

if (IS_MOCK_MODE) {
    return {
        success: true,
        participants: mockParticipants,
    };
}
```

## 📝 Making Changes

### Workflow

1. **Create a branch**: `git checkout -b feature/your-feature`
2. **Make changes**: Follow code style and architecture
3. **Test thoroughly**: Use manual testing checklist
4. **Commit**: Use clear, descriptive commit messages
5. **Push**: `git push origin feature/your-feature`
6. **Create PR**: Describe changes and testing done

### Commit Message Format

```
type: brief description

Longer description if needed

- Bullet points for details
- What changed
- Why it changed
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:

```
feat: add support for multi-select fallback participants

- Allow selecting multiple participants without email
- Add "Select All" button for convenience
- Update UI to show selection count
```

## 🐛 Bug Reports

When reporting bugs, include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Exact steps to trigger the bug
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**: Browser, Zoom version, OS
6. **Screenshots**: If applicable
7. **Console Logs**: Browser console errors

## ✨ Feature Requests

When requesting features:

1. **Use Case**: Describe the problem to solve
2. **Proposed Solution**: How you envision it working
3. **Alternatives**: Other solutions considered
4. **Impact**: Who benefits and how

## 🚀 Adding New Features

### Example: Adding Undo/Redo

1. **Update Types** (`types.ts`):

```typescript
interface AppState {
    history: ActionLogEntry[];
    historyIndex: number;
}
```

2. **Update Store** (`state/store.ts`):

```typescript
undo: () => {
  // Implementation
},
redo: () => {
  // Implementation
},
```

3. **Update UI** (add buttons in `ControlPanel.tsx`):

```tsx
<button onClick={undo}>Undo</button>
<button onClick={redo}>Redo</button>
```

4. **Test** thoroughly
5. **Document** in README

## 🔒 Security Considerations

When contributing:

- **Never** commit secrets or credentials
- **Always** validate user input (CSV data)
- **Avoid** XSS vulnerabilities (sanitize display names)
- **Use** TypeScript for type safety
- **Check** for potential race conditions in async code

## 📚 Resources

- [Zoom Apps SDK Documentation](https://developers.zoom.us/docs/zoom-apps/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Vite Documentation](https://vitejs.dev/)

## 💬 Questions?

- Check existing issues on GitHub
- Review the README and documentation
- Ask in discussions

## 📄 License

By contributing, you agree that your contributions will be licensed under the ISC License.
