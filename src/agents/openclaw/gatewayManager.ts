import { startTunnel, stopTunnel, SshTunnelConfig } from './sshTunnelManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Internal gateway config for WebSocket connections (not exported). */
export interface GatewayConfig {
    id: string;
    name: string;
    url: string;
    token: string;
    enabled: boolean;
    role: 'operator';
    scopes: string[];
}

interface PendingRequest {
    resolve: (payload: unknown) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    /** When true, skip resolution on intermediate { status: "accepted" } responses. */
    expectFinal?: boolean;
}

export interface GatewayConnection {
    gatewayId: string;
    ws: WebSocket | null;
    config: GatewayConfig;
    connected: boolean;
    authenticated: boolean;
    /** Granted scopes and role from the hello-ok response */
    grantedAuth?: { role: string; scopes: string[]; deviceToken?: string };
    pendingRequests: Map<string, PendingRequest>;
    eventListeners: Map<string, Array<(data: unknown) => void>>;
    lastTick: number;
    tickIntervalMs: number;
    tickTimer: ReturnType<typeof setInterval> | null;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    reconnectAttempts: number;
    /** Set to true when disconnect() is called explicitly — suppresses auto-reconnect */
    intentionalClose: boolean;
}

const RPC_TIMEOUT_MS = 30_000;
const AUTH_TIMEOUT_MS = 15_000;
const MAX_RECONNECT_DELAY_MS = 60_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

// ---------------------------------------------------------------------------
// Module-level connection pool
// ---------------------------------------------------------------------------

const connections = new Map<string, GatewayConnection>();

let _nextId = 1;
function nextRequestId(): string {
    return `req-${_nextId++}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Connect to an OpenClaw gateway. Resolves once the auth handshake completes.
 *
 * Protocol (from https://docs.openclaw.ai/gateway/protocol):
 *   1. Client opens WebSocket
 *   2. Server sends  {type:"event", event:"connect.challenge", payload:{nonce,ts}}
 *   3. Client sends  {type:"req", id, method:"connect", params:{auth:{token}, role, scopes, ...}}
 *   4. Server sends  {type:"res", id, ok:true, payload:{type:"hello-ok", policy:{tickIntervalMs}, auth:{...}}}
 */
export async function connect(config: GatewayConfig): Promise<GatewayConnection> {
    const existing = connections.get(config.id);
    if (existing?.connected && existing.authenticated) {
        return existing;
    }

    const conn: GatewayConnection = existing ?? {
        gatewayId: config.id,
        ws: null,
        config,
        connected: false,
        authenticated: false,
        pendingRequests: new Map(),
        eventListeners: new Map(),
        lastTick: Date.now(),
        tickIntervalMs: 0,
        tickTimer: null,
        reconnectTimer: null,
        reconnectAttempts: 0,
        intentionalClose: false,
    };

    // Update config in case it changed
    conn.config = config;
    conn.intentionalClose = false;
    connections.set(config.id, conn);

    return new Promise<GatewayConnection>((resolve, reject) => {
        let settled = false;

        function settle(err?: Error): void {
            if (settled) return;
            settled = true;
            clearTimeout(authTimeout);
            if (err) reject(err);
            else resolve(conn);
        }

        const authTimeout = setTimeout(() => {
            settle(new Error(`Gateway auth timed out after ${AUTH_TIMEOUT_MS}ms: ${config.url}`));
            conn.ws?.close();
        }, AUTH_TIMEOUT_MS);

        try {
            const ws = new WebSocket(config.url);
            conn.ws = ws;

            ws.addEventListener('open', () => {
                conn.connected = true;
                conn.reconnectAttempts = 0;
                // Wait for connect.challenge event from server
            });

            ws.addEventListener('message', (rawEvent) => {
                const data = typeof rawEvent.data === 'string' ? rawEvent.data : rawEvent.data.toString();
                let msg: Record<string, unknown>;
                try {
                    msg = JSON.parse(data);
                } catch {
                    return;
                }

                handleMessage(conn, msg, () => settle());
            });

            ws.addEventListener('close', (ev) => {
                const wasAuthenticated = conn.authenticated;
                conn.connected = false;
                conn.authenticated = false;
                stopTickWatch(conn);

                // Reject all pending requests
                for (const [, pending] of conn.pendingRequests) {
                    clearTimeout(pending.timer);
                    pending.reject(new Error('Gateway connection closed'));
                }
                conn.pendingRequests.clear();

                // If we never finished auth, reject the connect promise
                settle(new Error(`Gateway WebSocket closed (code ${ev.code}) before auth completed`));

                // Auto-reconnect only if: was previously authenticated, not intentionally closed, and config is enabled
                if (wasAuthenticated && !conn.intentionalClose && config.enabled) {
                    scheduleReconnect(conn);
                }
            });

            ws.addEventListener('error', () => {
                // The close event will fire after this, so we don't settle here.
                // Just log for diagnostics.
                console.error(`[OpenClaw] WebSocket error on gateway ${config.name}`);
            });
        } catch (err) {
            settle(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

/**
 * Disconnect from a gateway.
 */
export function disconnect(gatewayId: string): void {
    const conn = connections.get(gatewayId);
    if (!conn) return;

    conn.intentionalClose = true;

    if (conn.reconnectTimer) {
        clearTimeout(conn.reconnectTimer);
        conn.reconnectTimer = null;
    }

    stopTickWatch(conn);

    if (conn.ws) {
        conn.ws.close();
        conn.ws = null;
    }

    conn.connected = false;
    conn.authenticated = false;
    connections.delete(gatewayId);
}

/**
 * Get an existing connection (connects on demand if not yet connected).
 */
export async function getConnection(config: GatewayConfig): Promise<GatewayConnection> {
    const existing = connections.get(config.id);
    if (existing?.connected && existing.authenticated) {
        return existing;
    }
    return connect(config);
}

/**
 * Get connection status without connecting.
 */
export function getConnectionStatus(gatewayId: string): { connected: boolean; authenticated: boolean } {
    const conn = connections.get(gatewayId);
    return {
        connected: conn?.connected ?? false,
        authenticated: conn?.authenticated ?? false,
    };
}

/**
 * Send an RPC request to the gateway and wait for the correlated response.
 */
export function request(conn: GatewayConnection, method: string, params?: unknown, opts?: { expectFinal?: boolean }): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
        if (!conn.ws || !conn.connected || !conn.authenticated) {
            reject(new Error('Gateway not connected or not authenticated'));
            return;
        }

        const id = nextRequestId();

        const timer = setTimeout(() => {
            conn.pendingRequests.delete(id);
            reject(new Error(`RPC timeout for method "${method}" (id: ${id})`));
        }, RPC_TIMEOUT_MS);

        conn.pendingRequests.set(id, { resolve, reject, timer, expectFinal: opts?.expectFinal });

        const msg: Record<string, unknown> = { type: 'req', id, method };
        if (params !== undefined) {
            msg.params = params;
        }

        console.log(`[OpenClaw] → req: ${id} ${method}`);
        conn.ws.send(JSON.stringify(msg));
    });
}

/**
 * Subscribe to gateway events by event type.
 */
export function onEvent(conn: GatewayConnection, eventType: string, listener: (data: unknown) => void): void {
    if (!conn.eventListeners.has(eventType)) {
        conn.eventListeners.set(eventType, []);
    }
    conn.eventListeners.get(eventType)!.push(listener);
}

/**
 * Remove a specific event listener.
 */
export function offEvent(conn: GatewayConnection, eventType: string, listener: (data: unknown) => void): void {
    const listeners = conn.eventListeners.get(eventType);
    if (!listeners) return;
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
}

// ---------------------------------------------------------------------------
// Agent-level helpers (bridge from AgentConfig to internal GatewayConfig)
// ---------------------------------------------------------------------------

/**
 * Convert an http(s) URL to a ws(s) URL for WebSocket connections.
 */
function wsUrl(url: string): string {
    return url
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://')
        .replace(/\/+$/, '');
}

/**
 * Connect an OpenClaw agent via WebSocket.
 * Converts the agent's HTTP URL to a WS URL and uses default operator role/scopes.
 */
export async function connectAgent(agent: {
    id: string;
    name: string;
    url: string;
    token: string;
    sshTunnel?: { enabled: boolean; command: string; password: string };
}): Promise<GatewayConnection> {
    // Start SSH tunnel first if configured
    if (agent.sshTunnel?.enabled && agent.sshTunnel.command) {
        const tunnelConfig: SshTunnelConfig = {
            command: agent.sshTunnel.command,
            password: agent.sshTunnel.password,
        };
        await startTunnel(agent.id, tunnelConfig);
    }

    const gwConfig: GatewayConfig = {
        id: agent.id,
        name: agent.name,
        url: wsUrl(agent.url),
        token: agent.token,
        enabled: true,
        role: 'operator',
        scopes: ['operator.read', 'operator.write', 'operator.approvals'],
    };
    return connect(gwConfig);
}

/**
 * Disconnect an agent's WebSocket connection.
 */
export function disconnectAgent(agentId: string): void {
    disconnect(agentId);
    stopTunnel(agentId);
}

/**
 * Get an agent's WebSocket connection status without connecting.
 */
export function getAgentStatus(agentId: string): { connected: boolean; authenticated: boolean } {
    return getConnectionStatus(agentId);
}

// ---------------------------------------------------------------------------
// Derive the HTTP base URL from the WebSocket URL
// ---------------------------------------------------------------------------

/**
 * Convert a ws:// or wss:// URL to http:// or https:// for the HTTP API.
 * Also passes through http/https URLs unchanged.
 */
export function httpBaseUrl(config: { url: string }): string {
    return config.url
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://')
        .replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function handleMessage(
    conn: GatewayConnection,
    msg: Record<string, unknown>,
    onAuthenticated: () => void
): void {
    const type = msg.type as string;

    switch (type) {
        // --- Events from the server ---
        case 'event': {
            const eventName = msg.event as string;

            if (eventName === 'tick' || eventName === 'health') {
                if (eventName === 'tick') conn.lastTick = Date.now();
                break;
            }

            // Skip noisy per-token agent events
            if (eventName === 'agent') {
                // Still dispatch to listeners below, just don't log
            } else {
                console.log(`[OpenClaw] ← event: ${eventName}`);
                if (eventName === 'chat') {
                    console.log(`[OpenClaw] ← ${eventName} payload:\n${JSON.stringify(msg.payload, null, 2)}`);
                }
            }

            if (eventName === 'connect.challenge') {
                sendConnectRequest(conn);
                break;
            }

            // Dispatch to registered event listeners
            const listeners = conn.eventListeners.get(eventName);
            if (listeners) {
                for (const listener of listeners) {
                    try { listener(msg.payload); } catch (err) {
                        console.error(`[OpenClaw] Event listener error (${eventName}):`, err);
                    }
                }
            }
            // Wildcard listeners
            const wildcardListeners = conn.eventListeners.get('*');
            if (wildcardListeners) {
                for (const listener of wildcardListeners) {
                    try { listener(msg); } catch (err) {
                        console.error(`[OpenClaw] Wildcard listener error:`, err);
                    }
                }
            }
            break;
        }

        // --- RPC responses (including connect handshake) ---
        case 'res': {
            const id = msg.id as string;
            const ok = msg.ok as boolean;
            const payload = (msg.payload ?? msg.result ?? msg.data ?? {}) as Record<string, unknown>;
            const error = msg.error as Record<string, unknown> | string | undefined;

            const payloadType = (payload as Record<string, unknown>).type as string | undefined;
            console.log(`[OpenClaw] ← res: ${id} ${ok ? (payloadType ?? 'ok') : 'ERROR'}`);

            if (!ok || error) {
                console.error(`[OpenClaw] ← error (id: ${id}):\n${JSON.stringify(msg, null, 2)}`);
            }

            // Check if this is the hello-ok response to our connect request
            if (payload.type === 'hello-ok') {
                conn.authenticated = true;

                const policy = payload.policy as Record<string, unknown> | undefined;
                if (policy?.tickIntervalMs && typeof policy.tickIntervalMs === 'number') {
                    conn.tickIntervalMs = policy.tickIntervalMs;
                    conn.lastTick = Date.now();
                    startTickWatch(conn);
                }

                const auth = payload.auth as Record<string, unknown> | undefined;
                if (auth) {
                    conn.grantedAuth = {
                        role: (auth.role as string) ?? conn.config.role,
                        scopes: (auth.scopes as string[]) ?? conn.config.scopes,
                        deviceToken: auth.deviceToken as string | undefined,
                    };
                }

                onAuthenticated();

                // Also resolve the pending request if tracked
                const pending = conn.pendingRequests.get(id);
                if (pending) {
                    clearTimeout(pending.timer);
                    conn.pendingRequests.delete(id);
                    pending.resolve(payload);
                }
                break;
            }

            // Regular RPC response
            const pending = conn.pendingRequests.get(id);
            if (pending) {
                // Skip intermediate "accepted" acks for long-running requests
                if (pending.expectFinal && payload.status === 'accepted') {
                    break;
                }
                clearTimeout(pending.timer);
                conn.pendingRequests.delete(id);
                if (!ok || error) {
                    const errMsg = typeof error === 'string' ? error
                        : (error as Record<string, unknown>)?.message as string ?? JSON.stringify(error ?? 'Unknown error');
                    pending.reject(new Error(errMsg));
                } else {
                    pending.resolve(payload);
                }
            }
            break;
        }
    }
}

/**
 * Send the `connect` RPC request after receiving the server challenge.
 *
 * OpenClaw protocol requires:
 *   - client: { id: 'gateway-client', version, platform, mode: 'backend' }
 *   - device: { id, publicKey, signature, signedAt, nonce }
 *   - auth: { token }
 *
 * Device signature payload (pipe-delimited):
 *   v2 (with nonce): "v2|deviceId|clientId|clientMode|role|scopes|signedAt|token|nonce"
 *   v1 (no nonce):   "v1|deviceId|clientId|clientMode|role|scopes|signedAt|token"
 */
function sendConnectRequest(conn: GatewayConnection): void {
    const id = nextRequestId();

    const connectMsg: Record<string, unknown> = {
        type: 'req',
        id,
        method: 'connect',
        params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
                id: 'gateway-client',
                version: '1.0.0',
                platform: process.platform,
                mode: 'backend',
            },
            role: conn.config.role,
            scopes: conn.config.scopes,
            caps: [],
            commands: [],
            permissions: {},
            auth: { token: conn.config.token },
            locale: 'en-US',
            userAgent: 'SynthOS/1.0',
        },
    };

    // Track as a pending request so we can correlate the response
    conn.pendingRequests.set(id, {
        resolve: () => { /* handled in handleMessage via hello-ok check */ },
        reject: (err: Error) => {
            console.error(`[OpenClaw] Connect request failed for ${conn.config.name}: ${err.message}`);
        },
        timer: setTimeout(() => {
            conn.pendingRequests.delete(id);
        }, AUTH_TIMEOUT_MS),
    });

    conn.ws?.send(JSON.stringify(connectMsg));
}

/** Monitor server tick events — close if stalled (2x interval with no tick). */
function startTickWatch(conn: GatewayConnection): void {
    stopTickWatch(conn);
    if (conn.tickIntervalMs <= 0) return;
    conn.tickTimer = setInterval(() => {
        const elapsed = Date.now() - conn.lastTick;
        if (elapsed > conn.tickIntervalMs * 2) {
            conn.ws?.close(4000, 'tick stall');
        }
    }, conn.tickIntervalMs);
}

function stopTickWatch(conn: GatewayConnection): void {
    if (conn.tickTimer) {
        clearInterval(conn.tickTimer);
        conn.tickTimer = null;
    }
}

function scheduleReconnect(conn: GatewayConnection): void {
    if (conn.reconnectTimer || conn.intentionalClose) return;

    conn.reconnectAttempts++;
    const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, conn.reconnectAttempts - 1),
        MAX_RECONNECT_DELAY_MS
    );

    conn.reconnectTimer = setTimeout(async () => {
        conn.reconnectTimer = null;
        try {
            await connect(conn.config);
        } catch (err) {
            console.error(`[OpenClaw] Reconnect failed for ${conn.config.name}:`, err instanceof Error ? err.message : err);
        }
    }, delay);
}
