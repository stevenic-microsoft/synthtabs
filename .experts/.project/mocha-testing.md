# mocha-testing

## purpose

Testing conventions for SynthOS using Mocha, ts-mocha, and nyc code coverage.

## rules

1. **Run tests via `npm test`.** This executes `npm-run-all build test:mocha` — it builds TypeScript first, then runs `nyc mocha tests`. Tests run against compiled JS in `dist/`, not source TS.
2. **Place test files in the `tests/` directory.** The mocha config runs `nyc mocha tests` — all test files must be under the top-level `tests/` folder. **Name files `<module>.spec.ts`** — this is the project's standard naming convention. Do not use `.test.ts`.
3. **Use ts-mocha for TypeScript test files.** The project has `ts-mocha` as a devDependency, allowing `.ts` test files to be executed directly. Import from source paths (`../src/...`) in test files.
4. **Write behavior-driven tests, not implementation tests.** Per CLAUDE.md: "Tests follow behavior, not speculation." Test observable outcomes (function return values, side effects on disk, HTTP responses) rather than internal implementation details.
5. **Add tests when behavior is non-obvious, when fixing a bug, or when touching risky logic.** Do not add tests "for completeness" unless explicitly requested.
6. **Use nyc for coverage reporting.** nyc is configured as a devDependency. Run `nyc mocha tests` to get coverage. No `.nycrc` config file exists — uses defaults.
7. **Test the pure functions first.** The codebase has several pure, testable functions: `normalizePageName()`, `assignNodeIds()`, `stripNodeIds()`, `parseMetadata()`, `getModelInstructions()`, `estimateTokens()`, `formatTime()`. These are high-value test targets with no external dependencies.
8. **Mock `completePrompt` for transformation tests.** The `transformPage()` function accepts `completePrompt` via its args (dependency injection). Provide a mock function that returns a predefined `AgentCompletion<string>` to test the transformation pipeline without LLM calls.
9. **Use file system helpers for integration tests.** The `src/files.ts` module provides `ensureFolderExists`, `saveFile`, `loadFile`, `deleteFile`, `deleteFolder`. Create a temp directory, set up test fixtures, and clean up after.

## patterns

### Testing a pure function (`pages.spec.ts`)

```typescript
import assert from 'assert';
import { normalizePageName } from '../src/pages';

describe('normalizePageName', () => {
    it('should lowercase and replace invalid chars', () => {
        assert.strictEqual(normalizePageName('My Page!'), 'my_page_');
    });

    it('should preserve allowed special chars', () => {
        assert.strictEqual(normalizePageName('test-page_v2'), 'test-page_v2');
    });

    it('should return undefined for empty input', () => {
        assert.strictEqual(normalizePageName(''), undefined);
    });
});
```

### Mocking completePrompt for transformation tests (`transformPage.spec.ts`)

```typescript
import assert from 'assert';
import { transformPage } from '../src/service/transformPage';
import { AgentCompletion } from 'agentm-core';

const mockCompletePrompt = async (): Promise<AgentCompletion<string>> => ({
    completed: true,
    value: JSON.stringify([
        { op: 'update', nodeId: '5', html: '<p>Updated content</p>' }
    ])
});

describe('transformPage', () => {
    it('should apply change operations from LLM response', async () => {
        const result = await transformPage({
            pagesFolder: '/tmp/test',
            pageState: '<html><body><div data-node-id="5"><p>Old</p></div></body></html>',
            message: 'Update the content',
            maxTokens: 1024,
            completePrompt: mockCompletePrompt
        });
        assert.ok(result.completed);
        assert.ok(result.value!.changeCount > 0);
    });
});
```

## pitfalls

- **No `tests/` directory exists yet.** The test infrastructure is configured in `package.json` but no test files have been written. Create the `tests/` directory before adding test files.
- **Build before test.** The `npm test` script runs `build` first. If you run `mocha tests` directly without building, it may use stale compiled output or fail on missing `dist/` files.
- **The settings module caches globally.** `loadSettings()` uses a module-level `_settings` variable. Tests that depend on different settings values need to either reset this cache (it's not exported — may need a test helper) or run in separate processes.
- **File-based storage tests need cleanup.** Data routes and page operations write to disk. Use unique temp directories per test and clean up in `afterEach` to avoid cross-test contamination.

## instructions

Use this expert when writing tests for SynthOS, configuring the test runner, or troubleshooting test failures.

Pair with: `synthos-pages.md` for understanding what page functions to test, `agentm-core.md` for how to mock the completePrompt dependency.

## research

Deep Research prompt:

"Write a project-specific expert for testing SynthOS with Mocha, ts-mocha, and nyc. Cover: test directory structure (tests/ folder), the npm test script pipeline (build → mocha), ts-mocha for TypeScript test execution, nyc code coverage configuration, behavior-driven test philosophy (test outcomes not internals), testable pure functions in the codebase (normalizePageName, assignNodeIds, stripNodeIds, parseMetadata), mocking the completePrompt function for transformation pipeline tests, file system test fixtures and cleanup, settings module caching implications for test isolation, and the assert module usage pattern."
