import assert from 'assert';
import { RequestError } from '../src/models/types';

describe('RequestError', () => {
    it('constructor sets message, status, and name', () => {
        const err = new RequestError('Not found', 404, 'NotFoundError');
        assert.strictEqual(err.message, 'Not found');
        assert.strictEqual(err.status, 404);
        assert.strictEqual(err.name, 'NotFoundError');
    });

    it('default name is "RequestError" when not provided', () => {
        const err = new RequestError('Bad request', 400);
        assert.strictEqual(err.name, 'RequestError');
        assert.strictEqual(err.status, 400);
    });

    it('is an instance of Error', () => {
        const err = new RequestError('fail', 500);
        assert.ok(err instanceof Error);
        assert.ok(err instanceof RequestError);
    });
});
