import { Application } from 'express';
import { SynthOSConfig } from '../init';
import { loadSettings, saveSettings } from '../settings';
import {
    AgentConfig,
    AgentProvider,
    a2aProvider,
    openclawProvider,
    discoverA2AAgent,
    discoverOpenClawAgent,
    connectAgent,
    disconnectAgent,
    getAgentStatus,
    getTunnelStatus,
} from '../agents';
import { v4 as uuidv4 } from 'uuid';

export function useAgentRoutes(config: SynthOSConfig, app: Application): void {

    /** Strip the token and sshTunnel.password fields, add connection/tunnel status for agent responses. */
    function toClientAgent(agent: AgentConfig): Record<string, unknown> {
        const { token: _, sshTunnel, ...rest } = agent;
        const status = agent.provider === 'openclaw' ? getAgentStatus(agent.id) : undefined;
        const tunnelStatus = sshTunnel?.enabled ? getTunnelStatus(agent.id) : undefined;
        // Expose sshTunnel config without the password
        const sshTunnelClient = sshTunnel ? { enabled: sshTunnel.enabled, command: sshTunnel.command } : undefined;
        return {
            ...rest,
            ...(sshTunnelClient ? { sshTunnel: sshTunnelClient } : {}),
            ...(status ? { connected: status.connected && status.authenticated } : {}),
            ...(tunnelStatus ? { tunnelStatus } : {}),
        };
    }

    /** Try to connect an OpenClaw agent (fire-and-forget, logs errors). */
    function tryConnectAgent(agent: AgentConfig): void {
        if (agent.provider !== 'openclaw' || !agent.token || !agent.enabled) return;
        connectAgent({
            id: agent.id,
            name: agent.name,
            url: agent.url,
            token: agent.token,
            sshTunnel: agent.sshTunnel,
        })
            .then(() => console.log(`[Agents] Auto-connected OpenClaw agent "${agent.name}"`))
            .catch(err => console.warn(`[Agents] Auto-connect failed for "${agent.name}": ${err instanceof Error ? err.message : err}`));
    }

    // Auto-connect all enabled OpenClaw agents on startup
    (async () => {
        try {
            const settings = await loadSettings(config.pagesFolder);
            for (const agent of settings.agents ?? []) {
                tryConnectAgent(agent);
            }
        } catch (err) {
            console.warn('[Agents] Failed to auto-connect agents on startup:', err);
        }
    })();

    // GET /api/agents — List configured agents (with optional filters)
    app.get('/api/agents', async (req, res) => {
        try {
            const settings = await loadSettings(config.pagesFolder);
            let agents = settings.agents ?? [];

            // Filter by enabled
            if (req.query.enabled === 'true') {
                agents = agents.filter(a => a.enabled);
            }

            // Filter by provider
            if (typeof req.query.provider === 'string') {
                agents = agents.filter(a => a.provider === req.query.provider);
            }

            res.json(agents.map(toClientAgent));
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/discover — Discover agent by URL + type
    app.post('/api/agents/discover', async (req, res) => {
        try {
            const { url, type, token } = req.body;
            if (!url || typeof url !== 'string') {
                res.status(400).json({ error: 'url is required' });
                return;
            }

            if (type === 'openclaw') {
                if (!token || typeof token !== 'string') {
                    res.status(400).json({ error: 'token is required for OpenClaw discovery' });
                    return;
                }
                const result = await discoverOpenClawAgent(url, token);
                res.json(result);
            } else {
                // Default to A2A
                const card = await discoverA2AAgent(url);
                res.json(card);
            }
        } catch (err: unknown) {
            console.error(err);
            res.status(502).json({ error: `Failed to discover agent: ${(err as Error).message}` });
        }
    });

    // POST /api/agents — Upsert agent config
    app.post('/api/agents', async (req, res) => {
        try {
            const body = req.body as Partial<AgentConfig>;
            if (!body.url || !body.name) {
                res.status(400).json({ error: 'url and name are required' });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const agents = settings.agents ? [...settings.agents] : [];

            const agentConfig: AgentConfig = {
                id: body.id || uuidv4(),
                url: body.url,
                name: body.name,
                description: body.description || '',
                iconUrl: body.iconUrl,
                enabled: body.enabled ?? true,
                provider: body.provider ?? 'a2a',
                token: body.token,
                sessionKey: body.sessionKey,
                capabilities: body.capabilities,
                skills: body.skills,
                sshTunnel: body.sshTunnel,
            };

            // Upsert: replace if same id exists, otherwise append
            const idx = agents.findIndex(a => a.id === agentConfig.id);
            if (idx !== -1) {
                // Preserve existing token/sessionKey if not provided in update
                if (!agentConfig.token && agents[idx].token) {
                    agentConfig.token = agents[idx].token;
                }
                if (!agentConfig.sessionKey && agents[idx].sessionKey) {
                    agentConfig.sessionKey = agents[idx].sessionKey;
                }
                // Preserve existing sshTunnel if not provided in update
                if (!agentConfig.sshTunnel && agents[idx].sshTunnel) {
                    agentConfig.sshTunnel = agents[idx].sshTunnel;
                }
                agents[idx] = agentConfig;
            } else {
                agents.push(agentConfig);
            }

            await saveSettings(config.pagesFolder, { agents });

            // Auto-connect OpenClaw agents after save
            tryConnectAgent(agentConfig);

            res.json(toClientAgent(agentConfig));
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // PATCH /api/agents/:id — Toggle enabled/disabled or partial update
    app.patch('/api/agents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const settings = await loadSettings(config.pagesFolder);
            const agents = settings.agents ? [...settings.agents] : [];
            const idx = agents.findIndex(a => a.id === id);
            if (idx === -1) {
                res.status(404).json({ error: `Agent "${id}" not found` });
                return;
            }

            const body = req.body as Partial<AgentConfig>;
            if (typeof body.enabled === 'boolean') agents[idx].enabled = body.enabled;
            if (typeof body.name === 'string') agents[idx].name = body.name;
            if (typeof body.description === 'string') agents[idx].description = body.description;

            await saveSettings(config.pagesFolder, { agents });

            // Connect or disconnect based on enabled state
            if (agents[idx].provider === 'openclaw') {
                if (agents[idx].enabled) {
                    tryConnectAgent(agents[idx]);
                } else {
                    disconnectAgent(agents[idx].id);
                }
            }

            res.json(toClientAgent(agents[idx]));
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // DELETE /api/agents/:id — Remove agent
    app.delete('/api/agents/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const settings = await loadSettings(config.pagesFolder);
            const agent = (settings.agents ?? []).find(a => a.id === id);

            // Disconnect if OpenClaw
            if (agent?.provider === 'openclaw') {
                disconnectAgent(id);
            }

            const agents = (settings.agents ?? []).filter(a => a.id !== id);
            await saveSettings(config.pagesFolder, { agents });
            res.json({ deleted: true });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/:id/connect — Manually trigger WebSocket connection
    app.post('/api/agents/:id/connect', async (req, res) => {
        try {
            const { id } = req.params;
            const settings = await loadSettings(config.pagesFolder);
            const agent = (settings.agents ?? []).find(a => a.id === id);
            if (!agent) {
                res.status(404).json({ error: `Agent "${id}" not found` });
                return;
            }
            if (agent.provider !== 'openclaw') {
                res.status(400).json({ error: 'Only OpenClaw agents support WebSocket connections' });
                return;
            }
            if (!agent.token) {
                res.status(400).json({ error: 'Agent has no token configured' });
                return;
            }

            await connectAgent({ id: agent.id, name: agent.name, url: agent.url, token: agent.token, sshTunnel: agent.sshTunnel });
            const status = getAgentStatus(agent.id);
            res.json({ connected: status.connected, authenticated: status.authenticated });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/:id/disconnect — Disconnect WebSocket
    app.post('/api/agents/:id/disconnect', async (req, res) => {
        try {
            const { id } = req.params;
            disconnectAgent(id);
            res.json({ disconnected: true });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/:id/send — Send message to agent (dispatches by provider)
    app.post('/api/agents/:id/send', async (req, res) => {
        try {
            const { id } = req.params;
            const { message, attachments } = req.body;
            if (!message || typeof message !== 'string') {
                res.status(400).json({ error: 'message is required' });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const agent = (settings.agents ?? []).find(a => a.id === id);
            if (!agent) {
                res.status(404).json({ error: `Agent "${id}" not found` });
                return;
            }

            if (!agent.enabled) {
                res.status(400).json({ error: `Agent "${agent.name}" is disabled` });
                return;
            }

            // Dispatch to the correct provider
            const provider = agent.provider === 'openclaw' ? openclawProvider : a2aProvider;
            const result = await provider.send(agent, message, attachments);
            res.json(result);
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // -----------------------------------------------------------------------
    // Helper: load agent + resolve provider, return 404/400 on failure
    // -----------------------------------------------------------------------
    async function withAgent(
        id: string,
        res: import('express').Response,
        fn: (agent: AgentConfig, provider: AgentProvider) => Promise<void>,
    ): Promise<void> {
        const settings = await loadSettings(config.pagesFolder);
        const agent = (settings.agents ?? []).find(a => a.id === id);
        if (!agent) {
            res.status(404).json({ error: `Agent "${id}" not found` });
            return;
        }
        if (!agent.enabled) {
            res.status(400).json({ error: `Agent "${agent.name}" is disabled` });
            return;
        }
        const provider: AgentProvider = agent.provider === 'openclaw' ? openclawProvider : a2aProvider;
        await fn(agent, provider);
    }

    // -----------------------------------------------------------------------
    // Chat lifecycle routes (Phase 1)
    // -----------------------------------------------------------------------

    // POST /api/agents/:id/chat/history — Get chat history
    app.post('/api/agents/:id/chat/history', async (req, res) => {
        try {
            await withAgent(req.params.id, res, async (agent, provider) => {
                if (!provider.getHistory) {
                    res.status(501).json({ error: 'Operation not supported by this agent provider' });
                    return;
                }
                const messages = await provider.getHistory(agent);
                res.json({ messages });
            });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/:id/chat/abort — Abort in-flight chat
    app.post('/api/agents/:id/chat/abort', async (req, res) => {
        try {
            await withAgent(req.params.id, res, async (agent, provider) => {
                if (!provider.abortChat) {
                    res.status(501).json({ error: 'Operation not supported by this agent provider' });
                    return;
                }
                await provider.abortChat(agent);
                res.json({ ok: true });
            });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/:id/chat/clear — Clear/reset chat session
    app.post('/api/agents/:id/chat/clear', async (req, res) => {
        try {
            await withAgent(req.params.id, res, async (agent, provider) => {
                if (!provider.clearSession) {
                    res.status(501).json({ error: 'Operation not supported by this agent provider' });
                    return;
                }
                await provider.clearSession(agent);
                res.json({ ok: true });
            });
        } catch (err: unknown) {
            console.error(err);
            res.status(500).json({ error: (err as Error).message });
        }
    });

    // POST /api/agents/:id/stream — SSE streaming endpoint
    app.post('/api/agents/:id/stream', async (req, res) => {
        try {
            const { id } = req.params;
            const { message, attachments } = req.body;
            if (!message || typeof message !== 'string') {
                res.status(400).json({ error: 'message is required' });
                return;
            }

            const settings = await loadSettings(config.pagesFolder);
            const agent = (settings.agents ?? []).find(a => a.id === id);
            if (!agent) {
                res.status(404).json({ error: `Agent "${id}" not found` });
                return;
            }

            if (!agent.enabled) {
                res.status(400).json({ error: `Agent "${agent.name}" is disabled` });
                return;
            }

            // Set up SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            // Dispatch to the correct provider's streaming method
            const provider = agent.provider === 'openclaw' ? openclawProvider : a2aProvider;

            for await (const event of provider.sendStream(agent, message, attachments)) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
                if (event.kind === 'done' || event.kind === 'error') break;
            }

            res.write('data: [DONE]\n\n');
            res.end();
        } catch (err: unknown) {
            console.error(err);
            // If headers already sent, just end the stream
            if (res.headersSent) {
                res.write(`data: ${JSON.stringify({ kind: 'error', data: (err as Error).message })}\n\n`);
                res.end();
            } else {
                res.status(500).json({ error: (err as Error).message });
            }
        }
    });
}
