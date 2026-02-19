import assert from 'assert';
import { logCompletePrompt } from '../src/models/logCompletePrompt';
import { AgentCompletion, PromptCompletionArgs } from '../src/models/types';

/** Build a minimal PromptCompletionArgs for testing. */
function makeArgs(content = 'test'): PromptCompletionArgs {
    return { prompt: { role: 'user', content } };
}

describe('logCompletePrompt', () => {
    // Capture console.log output during each test
    let logs: string[];
    let origLog: typeof console.log;

    beforeEach(() => {
        logs = [];
        origLog = console.log;
        console.log = (...args: any[]) => { logs.push(args.join(' ')); };
    });

    afterEach(() => {
        console.log = origLog;
    });

    it('passes args through to inner function and returns its result', async () => {
        const expected: AgentCompletion<string> = { completed: true, value: 'hello' };
        let received: PromptCompletionArgs | undefined;
        const inner = async (args: PromptCompletionArgs) => { received = args; return expected; };
        const wrapped = logCompletePrompt(inner);
        const args = makeArgs('my prompt');
        const result = await wrapped(args);
        assert.strictEqual(result, expected);
        assert.strictEqual(received, args);
    });

    it('handles completed result with string value (logs green)', async () => {
        const inner = async () => ({ completed: true, value: 'output text' } as AgentCompletion<string>);
        const wrapped = logCompletePrompt(inner);
        await wrapped(makeArgs());
        assert.ok(logs.some(l => l.includes('output text')));
        // Check for green ANSI code
        assert.ok(logs.some(l => l.includes('\x1b[32m')));
    });

    it('handles completed result with object value (JSON.stringify)', async () => {
        const inner = async () => ({ completed: true, value: { a: 1 } } as AgentCompletion<any>);
        const wrapped = logCompletePrompt(inner);
        await wrapped(makeArgs());
        assert.ok(logs.some(l => l.includes('"a": 1')));
    });

    it('handles failed result with error (logs red)', async () => {
        const inner = async () => ({ completed: false, error: new Error('boom') } as AgentCompletion<string>);
        const wrapped = logCompletePrompt(inner);
        await wrapped(makeArgs());
        assert.ok(logs.some(l => l.includes('boom')));
        // Check for red ANSI code
        assert.ok(logs.some(l => l.includes('\x1b[31m')));
    });

    it('respects logDetails flag (separator line)', async () => {
        const inner = async () => ({ completed: true, value: 'ok' } as AgentCompletion<string>);
        const wrapped = logCompletePrompt(inner, true);
        await wrapped(makeArgs());
        assert.ok(logs.some(l => l.includes('─')));
    });

    it('does not log separator when logDetails is false', async () => {
        const inner = async () => ({ completed: true, value: 'ok' } as AgentCompletion<string>);
        const wrapped = logCompletePrompt(inner, false);
        await wrapped(makeArgs());
        assert.ok(!logs.some(l => l.includes('─')));
    });
});
