import { randomUUID } from 'crypto';
import { AgentConfig, AgentResponse, AgentEvent, AgentProvider, Attachment, ChatMessage } from '../types';
import { connectAgent, GatewayConnection, request, onEvent, offEvent } from './gatewayManager';

/**
 * OpenClaw provider that communicates over the gateway WebSocket.
 *
 * Chat flow:
 *   1. Ensure WebSocket connection (connectAgent)
 *   2. Resolve the main session key (sessions.resolve)
 *   3. Send message via chat.send RPC → returns { runId, status: "started" }
 *   4. Listen for "chat" events with matching runId for streamed response
 */

/** Get or create a WebSocket connection for an agent. */
async function getConnection(agent: AgentConfig): Promise<GatewayConnection> {
    if (!agent.token) throw new Error(`Agent "${agent.name}" has no token configured`);
    return connectAgent({ id: agent.id, name: agent.name, url: agent.url, token: agent.token });
}

/** Get the session key from agent config or resolve it. */
async function resolveSessionKey(agent: AgentConfig, conn: GatewayConnection): Promise<string> {
    if (agent.sessionKey) return agent.sessionKey;
    const result = await request(conn, 'sessions.resolve', {}) as Record<string, unknown>;
    if (!result.key || typeof result.key !== 'string') {
        throw new Error('Failed to resolve session key — set a Default Session Key in agent settings');
    }
    return result.key;
}

/**
 * Filter out noise from chat history — heartbeats, tool output, media refs, etc.
 * Returns true if the message should be excluded.
 */
function isNoiseMessage(role: string, content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) return true;

    // Heartbeat prompts (user) and responses (assistant)
    if (content.includes('"conversation_label"') && content.includes('heartbeat')) return true;
    if (trimmed === 'HEARTBEAT_OK') return true;

    // Raw JSON tool output (starts with { and looks like a JSON blob)
    if (trimmed.startsWith('{') && (
        trimmed.includes('"targetId"') ||
        trimmed.includes('"ok"') ||
        trimmed.includes('"error"') ||
        trimmed.includes('"url"') ||
        trimmed.includes('"format"')
    )) return true;

    // OpenClaw security notice / browser content injection
    if (trimmed.startsWith('SECURITY NOTICE:')) return true;

    // Media file references
    if (trimmed.startsWith('MEDIA:')) return true;

    return false;
}

export const openclawProvider: AgentProvider = {
    async send(agent: AgentConfig, message: string, attachments?: Attachment[]): Promise<AgentResponse> {
        const conn = await getConnection(agent);
        const sessionKey = await resolveSessionKey(agent, conn);

        // Collect response text from chat events
        let responseText = '';
        let done = false;

        const chatListener = (payload: unknown) => {
            const evt = payload as Record<string, unknown>;
            const state = evt.state as string | undefined;
            const msg = evt.message as Record<string, unknown> | undefined;

            if (msg?.content && Array.isArray(msg.content)) {
                for (const part of msg.content) {
                    const p = part as Record<string, unknown>;
                    if (p.type === 'text' && typeof p.text === 'string') {
                        responseText = p.text;
                    }
                }
            }

            if (state === 'final' || state === 'error') {
                done = true;
            }
        };

        onEvent(conn, 'chat', chatListener);

        try {
            // Send the message — returns immediately with { runId, status: "started" }
            await request(conn, 'chat.send', {
                sessionKey,
                message,
                idempotencyKey: randomUUID(),
                ...(attachments?.length ? { attachments } : {}),
            }, { expectFinal: false });

            // Wait for the chat to complete (poll with timeout)
            const timeout = 60_000;
            const start = Date.now();
            while (!done && Date.now() - start < timeout) {
                await new Promise(r => setTimeout(r, 100));
            }

            return {
                kind: 'message',
                text: responseText || undefined,
                raw: { sessionKey, text: responseText },
            };
        } finally {
            offEvent(conn, 'chat', chatListener);
        }
    },

    async *sendStream(agent: AgentConfig, message: string, attachments?: Attachment[]): AsyncIterable<AgentEvent> {
        const conn = await getConnection(agent);
        const sessionKey = await resolveSessionKey(agent, conn);

        // Set up an event queue for streaming
        const queue: AgentEvent[] = [];
        let done = false;
        let resolveWait: (() => void) | null = null;

        // Use agent events for token-by-token streaming deltas,
        // and chat events for final state detection.
        const agentListener = (payload: unknown) => {
            const evt = payload as Record<string, unknown>;
            const stream = evt.stream as string | undefined;
            const data = evt.data as Record<string, unknown> | undefined;

            if (stream === 'assistant' && data?.delta && typeof data.delta === 'string') {
                queue.push({ kind: 'text', data: data.delta });
            }

            if (stream === 'lifecycle' && data?.phase === 'end') {
                queue.push({ kind: 'done', data: null });
                done = true;
            }

            if (resolveWait) { resolveWait(); resolveWait = null; }
        };

        const chatListener = (payload: unknown) => {
            const evt = payload as Record<string, unknown>;
            const state = evt.state as string | undefined;

            if (state === 'error') {
                const errorMsg = (evt.error as Record<string, unknown>)?.message ?? 'Unknown error';
                queue.push({ kind: 'error', data: errorMsg });
                done = true;
                if (resolveWait) { resolveWait(); resolveWait = null; }
            }
        };

        onEvent(conn, 'agent', agentListener);
        onEvent(conn, 'chat', chatListener);

        try {
            // Send the message
            await request(conn, 'chat.send', {
                sessionKey,
                message,
                idempotencyKey: randomUUID(),
                ...(attachments?.length ? { attachments } : {}),
            }, { expectFinal: false });

            // Yield events as they arrive
            const timeout = 60_000;
            const start = Date.now();
            while (!done && Date.now() - start < timeout) {
                if (queue.length === 0) {
                    await new Promise<void>(r => {
                        resolveWait = r;
                        setTimeout(r, 500);
                    });
                }

                while (queue.length > 0) {
                    yield queue.shift()!;
                }
            }

            if (!done) {
                yield { kind: 'error', data: 'Chat response timed out' };
            }
        } finally {
            offEvent(conn, 'agent', agentListener);
            offEvent(conn, 'chat', chatListener);
        }
    },

    supportsStreaming(): boolean {
        return true;
    },

    async getHistory(agent: AgentConfig): Promise<ChatMessage[]> {
        const conn = await getConnection(agent);
        const sessionKey = await resolveSessionKey(agent, conn);
        const result = await request(conn, 'chat.history', { sessionKey });
        // Discovery log removed — response is too large for routine logging

        // Normalize: expect result to have a messages array (adjust once we see the real shape)
        const raw = result as Record<string, unknown>;
        const items = (raw.messages ?? raw.items ?? raw.history ?? []) as unknown[];
        const messages: ChatMessage[] = [];
        for (const item of items) {
            const m = item as Record<string, unknown>;
            const rawRole = m.role as string ?? 'assistant';

            // Skip toolCall / toolResult pairs entirely — not user-visible
            if (rawRole === 'toolResult' || rawRole === 'tool') continue;
            if (rawRole === 'assistant' && Array.isArray(m.content)) {
                const hasOnlyToolCalls = (m.content as Record<string, unknown>[]).every(
                    p => p.type === 'toolCall' || p.type === 'tool_use'
                );
                if (hasOnlyToolCalls) continue;
            }

            const role: 'user' | 'assistant' = rawRole === 'user' ? 'user' : 'assistant';

            // Extract text from content array if present
            let content = '';
            if (typeof m.content === 'string') {
                content = m.content;
            } else if (Array.isArray(m.content)) {
                for (const part of m.content) {
                    const p = part as Record<string, unknown>;
                    if (p.type === 'text' && typeof p.text === 'string') {
                        content += p.text;
                    }
                }
            }

            if (isNoiseMessage(role, content)) continue;

            messages.push({
                role,
                content,
                timestamp: m.timestamp as number | undefined,
                raw: m,
            });
        }
        return messages;
    },

    async abortChat(agent: AgentConfig): Promise<void> {
        const conn = await getConnection(agent);
        const sessionKey = await resolveSessionKey(agent, conn);
        const result = await request(conn, 'chat.abort', { sessionKey });
        console.log('[OpenClaw] ← raw chat.abort:', JSON.stringify(result, null, 2));
    },

    async clearSession(agent: AgentConfig): Promise<void> {
        const conn = await getConnection(agent);
        const sessionKey = await resolveSessionKey(agent, conn);
        const result = await request(conn, 'sessions.reset', { sessionKey });
        console.log('[OpenClaw] ← raw sessions.reset:', JSON.stringify(result, null, 2));
    },
};
