// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

export interface AgentConfig {
    id: string;
    url: string;
    name: string;
    description: string;
    iconUrl?: string;
    enabled: boolean;
    provider: 'a2a' | 'openclaw';
    /** Auth token (openclaw only) */
    token?: string;
    /** Default session key for chat (openclaw only, e.g. "agent:main:main") */
    sessionKey?: string;
    capabilities?: { streaming?: boolean; pushNotifications?: boolean };
    skills?: { id: string; name: string; description: string; tags: string[] }[];
    /** SSH tunnel config (openclaw only) — spawns an SSH tunnel before WebSocket connection */
    sshTunnel?: {
        enabled: boolean;
        /** Full SSH command, e.g. "ssh -p 22 -N -L 18789:127.0.0.1:43901 root@1.2.3.4" */
        command: string;
        /** Password to pipe when prompted */
        password: string;
    };
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export interface Attachment {
    fileName: string;
    mimeType: string;
    /** base64 for binary, plain string for text */
    content: string;
}

// ---------------------------------------------------------------------------
// Chat message (normalized across providers)
// ---------------------------------------------------------------------------

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
    /** Raw provider-specific payload for debugging */
    raw?: unknown;
}

// ---------------------------------------------------------------------------
// Provider response / event types
// ---------------------------------------------------------------------------

export interface AgentResponse {
    kind: 'message' | 'task';
    text?: string;
    raw: unknown;
    taskId?: string;
    status?: string;
}

export interface AgentEvent {
    kind: 'text' | 'status' | 'artifact' | 'done' | 'error';
    data: unknown;
}

// ---------------------------------------------------------------------------
// Provider interface — implemented by both A2A and OpenClaw adapters
// ---------------------------------------------------------------------------

export interface AgentProvider {
    send(agent: AgentConfig, message: string, attachments?: Attachment[]): Promise<AgentResponse>;
    sendStream(agent: AgentConfig, message: string, attachments?: Attachment[]): AsyncIterable<AgentEvent>;
    supportsStreaming(agent: AgentConfig): boolean;

    // -- Chat lifecycle (optional, Phase 1) --
    getHistory?(agent: AgentConfig): Promise<ChatMessage[]>;
    abortChat?(agent: AgentConfig): Promise<void>;
    clearSession?(agent: AgentConfig): Promise<void>;
}
