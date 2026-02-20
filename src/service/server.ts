import express, {Application} from 'express';
import { usePageRoutes } from './usePageRoutes';
import { useApiRoutes } from './useApiRoutes';
import { SynthOSConfig } from '../init';
import { useDataRoutes } from './useDataRoutes';
import { useConnectorRoutes } from './useConnectorRoutes';
import { useAgentRoutes } from './useAgentRoutes';
import { cyan, yellow, formatTime } from './debugLog';
import { customizer as defaultCustomizer, Customizer } from '../customizer';

export function server(config: SynthOSConfig, customizer: Customizer = defaultCustomizer): Application {
    const app = express();

    // Debug request-logging middleware
    if (config.debug) {
        app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const ms = Date.now() - start;
                console.log(`${cyan(req.method + ' ' + req.originalUrl)} → ${res.statusCode} ${yellow('(' + formatTime(ms) + ')')}`);
            });
            next();
        });
    }

    // Middleware to parse URL-encoded data (form data)
    app.use(express.urlencoded({ extended: true }));

    // Middleware to parse JSON data
    app.use(express.json());

    // Page handling routes
    if (customizer.isEnabled('pages')) usePageRoutes(config, app, customizer);

    // API routes
    if (customizer.isEnabled('api')) useApiRoutes(config, app, customizer);

    // Connector routes
    if (customizer.isEnabled('connectors')) useConnectorRoutes(config, app);

    // Agent routes
    if (customizer.isEnabled('agents')) useAgentRoutes(config, app);

    // Data routes
    if (customizer.isEnabled('data')) useDataRoutes(config, app);

    // Custom routes from the Customizer
    for (const installer of customizer.getExtraRoutes()) {
        installer(config, app);
    }

    return app;
}
