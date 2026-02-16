import express, {Application} from 'express';
import { usePageRoutes } from './usePageRoutes';
import { useApiRoutes } from './useApiRoutes';
import { SynthOSConfig } from '../init';
import { useDataRoutes } from './useDataRoutes';
import { useConnectorRoutes } from './useConnectorRoutes';
import { cyan, yellow, formatTime } from './debugLog';

export function server(config: SynthOSConfig): Application {
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
    usePageRoutes(config, app);

    // API routes
    useApiRoutes(config, app);

    // Connector routes
    useConnectorRoutes(config, app);

    // Data routes
    useDataRoutes(config, app);

    return app;
}