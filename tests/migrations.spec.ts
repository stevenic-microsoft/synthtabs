import assert from 'assert';
import { postProcessV2 } from '../src/migrations';

// ---------------------------------------------------------------------------
// postProcessV2
// ---------------------------------------------------------------------------

describe('postProcessV2', () => {
    const baseV2 = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Test</title>
    <script src="/api/theme-info.js"></script>
    <link rel="stylesheet" href="/api/theme.css">
    <style>
        .my-class { color: red; }
    </style>
</head>
<body>
    <div class="viewer-panel">Content</div>
</body>
</html>`;

    it('injects theme-info.js when missing', () => {
        const html = `<html><head><title>Test</title></head><body></body></html>`;
        const result = postProcessV2(html);
        assert.ok(result.includes('src="/api/theme-info.js"'));
    });

    it('does not duplicate theme-info.js when already present', () => {
        const result = postProcessV2(baseV2);
        const matches = result.match(/theme-info\.js/g);
        assert.strictEqual(matches?.length, 1);
    });

    it('injects theme.css when missing', () => {
        const html = `<html><head><title>Test</title></head><body></body></html>`;
        const result = postProcessV2(html);
        assert.ok(result.includes('href="/api/theme.css"'));
    });

    it('does not duplicate theme.css when already present', () => {
        const result = postProcessV2(baseV2);
        const matches = result.match(/theme\.css/g);
        assert.strictEqual(matches?.length, 1);
    });

    it('strips shared CSS selectors from style blocks', () => {
        const html = `<html><head><style>
.chat-panel { background: black; }
.viewer-panel { padding: 10px; }
.my-custom { color: blue; }
</style></head><body></body></html>`;
        const result = postProcessV2(html);
        assert.ok(!result.includes('.chat-panel {'));
        assert.ok(!result.includes('.viewer-panel {'));
        assert.ok(result.includes('.my-custom'));
    });

    it('removes empty style blocks after stripping', () => {
        const html = `<html><head><style>
.chat-panel { background: black; }
</style></head><body></body></html>`;
        const result = postProcessV2(html);
        // The style block should be removed since it only had shared CSS
        assert.ok(!result.includes('<style>'));
    });

    it('removes empty script blocks (no src)', () => {
        const html = `<html><head></head><body><script>   </script></body></html>`;
        const result = postProcessV2(html);
        // Empty script should be removed
        assert.ok(!result.includes('<script>   </script>'));
    });

    it('preserves script blocks with src attribute', () => {
        const html = `<html><head><script src="/api/theme-info.js"></script></head><body></body></html>`;
        const result = postProcessV2(html);
        assert.ok(result.includes('src="/api/theme-info.js"'));
    });

    it('preserves page-specific CSS', () => {
        const html = `<html><head><style>
.chat-panel { background: black; }
.game-canvas { width: 100%; height: 100%; }
</style></head><body></body></html>`;
        const result = postProcessV2(html);
        assert.ok(result.includes('.game-canvas'));
    });
});
