import path from 'path';
import { Customizer } from './Customizer';

/**
 * Teams-specific customizer that overrides folder paths and the local
 * data-folder name for the SynthTabs fork.
 */
export class TeamsCustomizer extends Customizer {
    get localFolder(): string {
        return '.synthtabs';
    }

    get requiredPagesFolder(): string {
        return path.join(__dirname, '../../teams-required-pages');
    }

    get defaultPagesFolder(): string {
        return path.join(__dirname, '../../teams-default-pages');
    }

    get defaultThemesFolder(): string {
        return path.join(__dirname, '../../teams-default-themes');
    }

    get pageScriptsFolder(): string {
        return path.join(__dirname, '../../teams-page-scripts');
    }

    get serviceConnectorsFolder(): string {
        return path.join(__dirname, '../../teams-service-connectors');
    }
}
