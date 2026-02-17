import { Application } from 'express';
import { SynthOSConfig } from '../init';
import { loadSettings, saveSettings } from '../settings';
import {
    CONNECTOR_REGISTRY,
    ConnectorSummary,
    ConnectorDetail,
    ConnectorCallRequest,
    ConnectorOAuthConfig
} from '../connectors';

export function useConnectorRoutes(config: SynthOSConfig, app: Application): void {

    // GET /api/connectors — List connectors (minimal summaries)
    // Also handles POST /api/connectors — Proxy call (see below)
    app.get('/api/connectors', async (req, res) => {
        try {
            const settings = await loadSettings(config.pagesFolder);
            const connectors = settings.connectors ?? {};

            const categoryFilter = req.query.category as string | undefined;
            const idFilter = req.query.id as string | undefined;

            const list: ConnectorSummary[] = CONNECTOR_REGISTRY
                .filter(def => {
                    if (categoryFilter && def.category !== categoryFilter) return false;
                    if (idFilter && def.id !== idFilter) return false;
                    return true;
                })
                .map(def => {
                    const cfg = connectors[def.id];
                    const isOAuth = def.authStrategy === 'oauth2';
                    const oauthCfg = cfg as ConnectorOAuthConfig | undefined;
                    return {
                        id: def.id,
                        name: def.name,
                        category: def.category,
                        description: def.description,
                        configured: isOAuth
                            ? !!oauthCfg && oauthCfg.enabled && !!oauthCfg.accessToken
                            : !!cfg && cfg.enabled && !!cfg.apiKey,
                        enabled: !!cfg?.enabled
                    };
                });

            res.json(list);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // GET /api/connectors/:id — Full connector detail for config modal
    app.get('/api/connectors/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const def = CONNECTOR_REGISTRY.find(d => d.id === id);
            if (!def) {
                res.status(404).json({ error: `Connector "${id}" not found` });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const cfg = (settings.connectors ?? {})[id];
            const isOAuth = def.authStrategy === 'oauth2';
            const oauthCfg = cfg as ConnectorOAuthConfig | undefined;

            const detail: ConnectorDetail = {
                ...def,
                configured: isOAuth
                    ? !!oauthCfg && oauthCfg.enabled && !!oauthCfg.accessToken
                    : !!cfg && cfg.enabled && !!cfg.apiKey,
                enabled: !!cfg?.enabled,
                hasKey: isOAuth ? !!oauthCfg?.clientId : !!cfg?.apiKey,
                connected: isOAuth ? !!oauthCfg?.accessToken : undefined,
                accountName: isOAuth ? oauthCfg?.accountName : undefined,
                userId: isOAuth ? oauthCfg?.userId : undefined
            };

            res.json(detail);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/connectors/:id — Save connector config (API key + enabled toggle)
    app.post('/api/connectors/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const def = CONNECTOR_REGISTRY.find(d => d.id === id);
            if (!def) {
                res.status(404).json({ error: `Connector "${id}" not found` });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const existing = settings.connectors ?? {};

            if (def.authStrategy === 'oauth2') {
                const { clientId, clientSecret, accessToken, userId, enabled } = req.body;
                const prev = (existing[id] as ConnectorOAuthConfig) ?? { apiKey: '', enabled: false };
                const entry: ConnectorOAuthConfig = {
                    ...prev,
                    apiKey: prev.apiKey || '',
                    enabled: typeof enabled === 'boolean' ? enabled : prev.enabled
                };

                // OAuth app credentials
                if (typeof clientId === 'string' && clientId.length > 0) entry.clientId = clientId;
                if (typeof clientSecret === 'string' && clientSecret.length > 0) entry.clientSecret = clientSecret;

                // Manual token entry
                if (typeof accessToken === 'string' && accessToken.length > 0) {
                    entry.accessToken = accessToken;
                    entry.apiKey = accessToken;
                }
                if (typeof userId === 'string' && userId.length > 0) {
                    entry.userId = userId;
                    entry.accountName = userId;
                }

                const updated = { ...existing, [id]: entry };
                await saveSettings(config.pagesFolder, { connectors: updated });
            } else {
                const { apiKey, enabled } = req.body;
                const resolvedKey = (typeof apiKey === 'string' && apiKey.length > 0)
                    ? apiKey
                    : (existing[id]?.apiKey ?? '');

                const updated = {
                    ...existing,
                    [id]: { apiKey: resolvedKey, enabled: !!enabled }
                };
                await saveSettings(config.pagesFolder, { connectors: updated });
            }

            res.json({ saved: true });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // DELETE /api/connectors/:id — Remove connector config
    app.delete('/api/connectors/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const settings = await loadSettings(config.pagesFolder);
            const existing = settings.connectors ?? {};

            const updated = { ...existing };
            delete updated[id];

            await saveSettings(config.pagesFolder, { connectors: updated });
            res.json({ deleted: true });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // GET /api/connectors/:id/authorize — Start OAuth2 flow
    app.get('/api/connectors/:id/authorize', async (req, res) => {
        try {
            const { id } = req.params;
            const def = CONNECTOR_REGISTRY.find(d => d.id === id);
            if (!def || def.authStrategy !== 'oauth2') {
                res.status(400).json({ error: `Connector "${id}" is not an OAuth2 connector` });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const cfg = (settings.connectors ?? {})[id] as ConnectorOAuthConfig | undefined;
            if (!cfg?.clientId || !cfg?.clientSecret) {
                res.status(400).json({ error: 'Client ID and Client Secret must be saved before authorizing' });
                return;
            }

            const redirectUri = `${req.protocol}://${req.get('host')}/api/connectors/callback`;
            const state = JSON.stringify({ connector: id });

            const authUrl = new URL(def.authorizationUrl!);
            authUrl.searchParams.set('client_id', cfg.clientId);
            authUrl.searchParams.set('redirect_uri', redirectUri);
            authUrl.searchParams.set('scope', (def.scopes ?? []).join(','));
            authUrl.searchParams.set('state', state);
            authUrl.searchParams.set('response_type', 'code');

            res.redirect(authUrl.toString());
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // GET /api/connectors/callback — OAuth2 callback
    app.get('/api/connectors/callback', async (req, res) => {
        try {
            const code = req.query.code as string | undefined;
            const stateRaw = req.query.state as string | undefined;
            const error = req.query.error as string | undefined;

            if (error) {
                res.redirect(`/settings?tab=connectors&error=${encodeURIComponent(error)}`);
                return;
            }

            if (!code || !stateRaw) {
                res.status(400).json({ error: 'Missing code or state parameter' });
                return;
            }

            const state = JSON.parse(stateRaw) as { connector: string };
            const connectorId = state.connector;

            const def = CONNECTOR_REGISTRY.find(d => d.id === connectorId);
            if (!def || def.authStrategy !== 'oauth2') {
                res.status(400).json({ error: `Unknown OAuth2 connector: ${connectorId}` });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const cfg = (settings.connectors ?? {})[connectorId] as ConnectorOAuthConfig | undefined;
            if (!cfg?.clientId || !cfg?.clientSecret) {
                res.status(400).json({ error: 'Client credentials not found' });
                return;
            }

            const redirectUri = `${req.protocol}://${req.get('host')}/api/connectors/callback`;

            // Step 1: Exchange code for short-lived token
            const tokenUrl = new URL(def.tokenUrl!);
            tokenUrl.searchParams.set('client_id', cfg.clientId);
            tokenUrl.searchParams.set('client_secret', cfg.clientSecret);
            tokenUrl.searchParams.set('redirect_uri', redirectUri);
            tokenUrl.searchParams.set('code', code);
            tokenUrl.searchParams.set('grant_type', 'authorization_code');

            const tokenRes = await fetch(tokenUrl.toString());
            if (!tokenRes.ok) {
                const text = await tokenRes.text();
                console.error('Token exchange failed:', text);
                res.redirect(`/settings?tab=connectors&error=${encodeURIComponent('Token exchange failed')}`);
                return;
            }
            const tokenData = await tokenRes.json() as { access_token: string; token_type?: string; expires_in?: number };
            let accessToken = tokenData.access_token;
            let expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : 0;

            // Step 2: For Instagram — exchange for long-lived token
            if (connectorId === 'instagram') {
                const llUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
                llUrl.searchParams.set('grant_type', 'fb_exchange_token');
                llUrl.searchParams.set('client_id', cfg.clientId);
                llUrl.searchParams.set('client_secret', cfg.clientSecret);
                llUrl.searchParams.set('fb_exchange_token', accessToken);

                const llRes = await fetch(llUrl.toString());
                if (llRes.ok) {
                    const llData = await llRes.json() as { access_token: string; expires_in?: number };
                    accessToken = llData.access_token;
                    expiresAt = llData.expires_in ? Date.now() + llData.expires_in * 1000 : 0;
                } else {
                    console.error('Long-lived token exchange failed:', await llRes.text());
                }
            }

            // Step 3: For Instagram — resolve IG Business Account ID
            let userId = '';
            let accountName = '';
            if (connectorId === 'instagram') {
                try {
                    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${encodeURIComponent(accessToken)}`);
                    if (pagesRes.ok) {
                        const pagesData = await pagesRes.json() as { data: Array<{ id: string; name: string }> };
                        if (pagesData.data && pagesData.data.length > 0) {
                            const page = pagesData.data[0];
                            accountName = page.name;

                            const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(accessToken)}`);
                            if (igRes.ok) {
                                const igData = await igRes.json() as { instagram_business_account?: { id: string } };
                                if (igData.instagram_business_account) {
                                    userId = igData.instagram_business_account.id;
                                }
                            }
                        }
                    }
                } catch (igErr) {
                    console.error('Failed to resolve Instagram Business Account:', igErr);
                }
            }

            // Step 4: Save tokens to settings
            const existing = settings.connectors ?? {};
            const prev = (existing[connectorId] as ConnectorOAuthConfig) ?? { apiKey: '', enabled: false };
            const updated = {
                ...existing,
                [connectorId]: {
                    ...prev,
                    apiKey: prev.apiKey || accessToken,
                    accessToken,
                    expiresAt,
                    userId,
                    accountName,
                    enabled: true
                }
            };
            await saveSettings(config.pagesFolder, { connectors: updated });

            res.redirect(`/settings?tab=connectors&connected=${encodeURIComponent(connectorId)}`);
        } catch (err: unknown) {
            console.error('OAuth callback error:', err);
            res.redirect(`/settings?tab=connectors&error=${encodeURIComponent((err as Error).message)}`);
        }
    });

    // POST /api/connectors — Proxy call
    app.post('/api/connectors', async (req, res) => {
        try {
            const request = req.body as ConnectorCallRequest;

            if (!request.connector || !request.method || !request.path) {
                res.status(400).json({ error: 'connector, method, and path are required' });
                return;
            }

            const def = CONNECTOR_REGISTRY.find(d => d.id === request.connector);
            if (!def) {
                res.status(404).json({ error: `Connector "${request.connector}" not found` });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const cfg = (settings.connectors ?? {})[request.connector];

            if (def.authStrategy === 'oauth2') {
                const oauthCfg = cfg as ConnectorOAuthConfig | undefined;
                if (!oauthCfg || !oauthCfg.enabled || !oauthCfg.accessToken) {
                    res.status(400).json({ error: `Connector "${request.connector}" is not configured or not enabled` });
                    return;
                }
                // Check token expiry
                if (oauthCfg.expiresAt && oauthCfg.expiresAt < Date.now()) {
                    res.status(401).json({ error: `Access token for "${request.connector}" has expired. Please re-authorize in Settings > Connectors.` });
                    return;
                }
            } else {
                if (!cfg || !cfg.enabled || !cfg.apiKey) {
                    res.status(400).json({ error: `Connector "${request.connector}" is not configured or not enabled` });
                    return;
                }
            }

            // Build URL — join baseUrl path with request path to avoid
            // absolute paths (e.g. "/me/accounts") replacing the base path.
            // Split path from inline query string first — assigning a '?' to
            // URL.pathname encodes it as %3F, which breaks upstream APIs.
            const [reqPath, reqQS] = request.path.split('?');
            const base = new URL(def.baseUrl);
            const joinedPath = base.pathname.replace(/\/+$/, '') + '/' + reqPath.replace(/^\/+/, '');
            base.pathname = joinedPath;
            const url = base;
            if (reqQS) {
                const inline = new URLSearchParams(reqQS);
                for (const [key, value] of inline.entries()) {
                    url.searchParams.set(key, value);
                }
            }
            if (request.query) {
                for (const [key, value] of Object.entries(request.query)) {
                    url.searchParams.set(key, value);
                }
            }

            // Attach auth
            const headers: Record<string, string> = { ...request.headers };
            switch (def.authStrategy) {
                case 'bearer':
                    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
                    break;
                case 'header':
                    headers[def.authKey] = cfg.apiKey;
                    break;
                case 'query':
                    url.searchParams.set(def.authKey, cfg.apiKey);
                    break;
                case 'oauth2': {
                    const oauthCfg = cfg as ConnectorOAuthConfig;
                    const token = oauthCfg.accessToken ?? oauthCfg.apiKey;
                    // Use Bearer header — works for all methods and content types
                    headers['Authorization'] = `Bearer ${token}`;
                    break;
                }
            }

            // Forward request
            const fetchOpts: RequestInit = {
                method: request.method.toUpperCase(),
                headers
            };

            if (request.body && !['GET', 'HEAD'].includes(fetchOpts.method!)) {
                fetchOpts.body = JSON.stringify(request.body);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            }

            const upstream = await fetch(url.toString(), fetchOpts);
            const ct = upstream.headers.get('content-type') || '';
            const isJson = ct.includes('application/json');

            if (!upstream.ok) {
                const text = await upstream.text();
                res.status(upstream.status).json({ error: text });
                return;
            }

            if (isJson) {
                const data = await upstream.json();
                res.json(data);
            } else {
                // Stream binary-safe: use arrayBuffer to avoid text encoding corruption
                const buffer = Buffer.from(await upstream.arrayBuffer());
                res.set('Content-Type', ct || 'application/octet-stream');
                // Forward content-disposition if present (e.g. file downloads)
                const cd = upstream.headers.get('content-disposition');
                if (cd) res.set('Content-Disposition', cd);
                res.send(buffer);
            }
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });
}
