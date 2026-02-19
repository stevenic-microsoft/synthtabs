import { v4 as uuidv4 } from 'uuid';
import { AgentConfig, AgentResponse, AgentEvent, AgentProvider, Attachment } from '../types';

/**
 * Extract readable text from an A2A response (Message or Task object).
 */
function extractText(raw: unknown): string | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const obj = raw as Record<string, unknown>;

    // A2A Message shape: { kind: 'message', parts: [{ kind: 'text', text: '...' }] }
    if (obj.kind === 'message' && Array.isArray(obj.parts)) {
        const texts = (obj.parts as Array<Record<string, unknown>>)
            .filter(p => p.kind === 'text' && typeof p.text === 'string')
            .map(p => p.text as string);
        if (texts.length > 0) return texts.join('\n');
    }

    // A2A Task shape: { kind: 'task', status: { message: { parts: [...] } } }
    if (obj.kind === 'task' && obj.status && typeof obj.status === 'object') {
        const status = obj.status as Record<string, unknown>;
        if (status.message) {
            return extractText(status.message);
        }
    }

    // Fallback: look for a result.message in the response
    if (obj.result && typeof obj.result === 'object') {
        return extractText(obj.result);
    }

    return undefined;
}

export const a2aProvider: AgentProvider = {
    async send(agent: AgentConfig, message: string, _attachments?: Attachment[]): Promise<AgentResponse> {
        const { A2AClient } = await import('@a2a-js/sdk/client');
        const cardUrl = agent.url.replace(/\/+$/, '') + '/.well-known/agent-card.json';
        const client = new A2AClient(cardUrl);

        const sendResult = await client.sendMessage({
            message: {
                kind: 'message' as const,
                role: 'user' as const,
                messageId: uuidv4(),
                parts: [{ kind: 'text' as const, text: message }]
            }
        });

        const raw = sendResult as unknown;
        const rawObj = raw as Record<string, unknown>;
        const kind = rawObj.kind === 'task' ? 'task' : 'message';

        return {
            kind,
            text: extractText(raw),
            raw,
            taskId: kind === 'task' ? (rawObj.id as string | undefined) : undefined,
            status: kind === 'task' ? ((rawObj.status as Record<string, unknown>)?.state as string | undefined) : undefined,
        };
    },

    async *sendStream(agent: AgentConfig, message: string, _attachments?: Attachment[]): AsyncIterable<AgentEvent> {
        // If the agent supports streaming, use SSE-based streaming via A2A SDK
        if (!agent.capabilities?.streaming) {
            // Fallback: send a regular message and yield the result as a single event
            const response = await a2aProvider.send(agent, message);
            if (response.text) {
                yield { kind: 'text', data: response.text };
            }
            yield { kind: 'done', data: response.raw };
            return;
        }

        // A2A streaming via sendSubscribe (if available in the SDK)
        try {
            const { A2AClient } = await import('@a2a-js/sdk/client');
            const cardUrl = agent.url.replace(/\/+$/, '') + '/.well-known/agent-card.json';
            const client = new A2AClient(cardUrl);

            const stream = client.sendMessageStream({
                message: {
                    kind: 'message' as const,
                    role: 'user' as const,
                    messageId: uuidv4(),
                    parts: [{ kind: 'text' as const, text: message }]
                }
            });

            for await (const event of stream) {
                const eventObj = event as unknown as Record<string, unknown>;
                if (eventObj.kind === 'status-update') {
                    yield { kind: 'status', data: eventObj };
                } else if (eventObj.kind === 'artifact-update') {
                    yield { kind: 'artifact', data: eventObj };
                } else {
                    yield { kind: 'text', data: eventObj };
                }
            }

            yield { kind: 'done', data: null };
        } catch (err) {
            yield { kind: 'error', data: err instanceof Error ? err.message : String(err) };
        }
    },

    supportsStreaming(agent: AgentConfig): boolean {
        return agent.capabilities?.streaming === true;
    }
};
