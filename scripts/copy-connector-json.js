// Copies connector.json files from src/connectors/*/  to dist/connectors/*/
// Run after tsc to ensure JSON assets are available at runtime.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'src', 'connectors');
const dst = path.join(__dirname, '..', 'dist', 'connectors');

fs.readdirSync(src, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .forEach(entry => {
        const jsonFile = path.join(src, entry.name, 'connector.json');
        if (!fs.existsSync(jsonFile)) return;
        const targetDir = path.join(dst, entry.name);
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(jsonFile, path.join(targetDir, 'connector.json'));
    });
