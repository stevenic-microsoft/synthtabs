import assert from 'assert';
import { ensureScriptsBeforeBodyClose } from '../src/service/transformPage';

// ---------------------------------------------------------------------------
// ensureScriptsBeforeBodyClose
// ---------------------------------------------------------------------------

describe('ensureScriptsBeforeBodyClose', () => {
    it('moves page-helpers and page-script to end of body in correct order', () => {
        const html =
            '<html><head></head><body>' +
            '<script id="page-script" src="/api/page-script.js?v=2"></script>' +
            '<div>content</div>' +
            '<script id="page-helpers" src="/api/page-helpers.js?v=2"></script>' +
            '</body></html>';

        const result = ensureScriptsBeforeBodyClose(html);

        // Both scripts should be at the end of body
        const bodyContent = result.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? '';
        const helpersIdx = bodyContent.lastIndexOf('id="page-helpers"');
        const scriptIdx = bodyContent.lastIndexOf('id="page-script"');
        const contentIdx = bodyContent.indexOf('<div>content</div>');

        // Content should come before both scripts
        assert.ok(contentIdx < helpersIdx, 'content should be before page-helpers');
        // Helpers should come before page-script
        assert.ok(helpersIdx < scriptIdx, 'page-helpers should be before page-script');
    });

    it('handles missing page-helpers gracefully', () => {
        const html =
            '<html><head></head><body>' +
            '<div>content</div>' +
            '<script id="page-script" src="/api/page-script.js?v=2"></script>' +
            '</body></html>';

        const result = ensureScriptsBeforeBodyClose(html);
        assert.ok(result.includes('id="page-script"'));
        assert.ok(result.includes('<div>content</div>'));
    });

    it('handles missing page-script gracefully', () => {
        const html =
            '<html><head></head><body>' +
            '<div>content</div>' +
            '<script id="page-helpers" src="/api/page-helpers.js?v=2"></script>' +
            '</body></html>';

        const result = ensureScriptsBeforeBodyClose(html);
        assert.ok(result.includes('id="page-helpers"'));
        assert.ok(result.includes('<div>content</div>'));
    });

    it('handles both scripts missing gracefully', () => {
        const html = '<html><head></head><body><div>content</div></body></html>';
        const result = ensureScriptsBeforeBodyClose(html);
        assert.ok(result.includes('<div>content</div>'));
    });

    it('returns HTML unchanged when no body tag', () => {
        const html = '<div>no body tag</div>';
        const result = ensureScriptsBeforeBodyClose(html);
        // cheerio wraps in html/body, so just check the content is preserved
        assert.ok(result.includes('no body tag'));
    });

    it('does nothing when scripts are already at end of body', () => {
        const html =
            '<html><head></head><body>' +
            '<div>content</div>' +
            '<script id="page-helpers" src="/api/page-helpers.js?v=2"></script>' +
            '<script id="page-script" src="/api/page-script.js?v=2"></script>' +
            '</body></html>';

        const result = ensureScriptsBeforeBodyClose(html);
        const bodyContent = result.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? '';
        const helpersIdx = bodyContent.lastIndexOf('id="page-helpers"');
        const scriptIdx = bodyContent.lastIndexOf('id="page-script"');
        assert.ok(helpersIdx < scriptIdx);
    });
});
