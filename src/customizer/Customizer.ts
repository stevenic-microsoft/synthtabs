import { Application } from 'express';
import { SynthOSConfig } from '../init';
import path from 'path';

export type RouteInstaller = (config: SynthOSConfig, app: Application) => void;

export class Customizer {
    protected disabled: Set<string> = new Set();
    protected extraRoutes: RouteInstaller[] = [];

    /** Route hints for the LLM prompt (fork developers can add custom hints). */
    protected routeHintEntries: { hints: string }[] = [];

    /** Custom instructions appended to transformPage's instruction block. */
    protected customTransformInstructions: string[] = [];

    // --- Local data folder ---
    // Override in a derived class to change the local project folder name.

    /** Name of the local data folder created in the user's project directory. */
    get localFolder(): string {
        return '.synthos';
    }

    // --- Content folder paths ---
    // Override these in a derived class to point to your fork's folders.

    /** Folder containing built-in system pages (builder, settings, etc.) */
    get requiredPagesFolder(): string {
        return path.join(__dirname, '../../required-pages');
    }

    /** Folder containing starter page templates copied on init */
    get defaultPagesFolder(): string {
        return path.join(__dirname, '../../default-pages');
    }

    /** Folder containing theme CSS/JSON files */
    get defaultThemesFolder(): string {
        return path.join(__dirname, '../../default-themes');
    }

    /** Folder containing versioned page scripts (page-v2.js, etc.) */
    get pageScriptsFolder(): string {
        return path.join(__dirname, '../../page-scripts');
    }

    /** Folder containing connector JSON definitions */
    get serviceConnectorsFolder(): string {
        return path.join(__dirname, '../../service-connectors');
    }

    /** Route path for the "browse all pages/tabs" listing page.
     *  Override in a derived class to change the redirect target for outdated pages. */
    get tabsListRoute(): string {
        return '/pages';
    }

    // --- Feature group control ---
    // Built-in groups: 'pages', 'api', 'connectors', 'agents',
    //   'data', 'brainstorm', 'search', 'scripts'

    disable(...groups: string[]): this {
        for (const g of groups) this.disabled.add(g);
        return this;
    }

    enable(...groups: string[]): this {
        for (const g of groups) this.disabled.delete(g);
        return this;
    }

    isEnabled(group: string): boolean {
        return !this.disabled.has(group);
    }

    // --- Custom routes ---

    addRoutes(...installers: (RouteInstaller | { installer: RouteInstaller; hints: string })[]): this {
        for (const entry of installers) {
            if (typeof entry === 'function') {
                this.extraRoutes.push(entry);
            } else {
                this.extraRoutes.push(entry.installer);
                this.routeHintEntries.push({ hints: entry.hints });
            }
        }
        return this;
    }

    getExtraRoutes(): RouteInstaller[] {
        return this.extraRoutes;
    }

    // --- Route hints ---

    /** Add route hints that will be shown to the LLM in transformPage. */
    addRouteHints(...hints: string[]): this {
        for (const h of hints) this.routeHintEntries.push({ hints: h });
        return this;
    }

    /** Get all custom route hints. */
    getRouteHints(): string[] {
        return this.routeHintEntries.map(e => e.hints);
    }

    // --- Custom transform instructions ---

    /** Add custom instructions for the transformPage LLM prompt. */
    addTransformInstructions(...instructions: string[]): this {
        this.customTransformInstructions.push(...instructions);
        return this;
    }

    /** Get custom transform instructions. */
    getTransformInstructions(): string[] {
        return this.customTransformInstructions;
    }
}
