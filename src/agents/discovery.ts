import { httpBaseUrl } from './openclaw/gatewayManager';

// ---------------------------------------------------------------------------
// A2A Discovery
// ---------------------------------------------------------------------------

export interface A2ADiscoveryResult {
    name: string;
    description: string;
    url: string;
    iconUrl?: string;
    capabilities?: { streaming?: boolean; pushNotifications?: boolean };
    skills?: { id: string; name: string; description: string; tags: string[] }[];
}

/**
 * Discover an A2A agent by fetching its agent card from /.well-known/agent-card.json.
 */
export async function discoverA2AAgent(url: string): Promise<A2ADiscoveryResult> {
    const cardUrl = url.replace(/\/+$/, '') + '/.well-known/agent-card.json';
    const res = await fetch(cardUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch agent card: ${res.status} ${res.statusText}`);
    }

    const card = await res.json() as Record<string, unknown>;
    return {
        name: (card.name as string) ?? '',
        description: (card.description as string) ?? '',
        url: (card.url as string) ?? url,
        iconUrl: (card as Record<string, string>).iconUrl ?? undefined,
        capabilities: (card.capabilities as A2ADiscoveryResult['capabilities']) ?? {},
        skills: (card.skills as A2ADiscoveryResult['skills']) ?? [],
    };
}

// ---------------------------------------------------------------------------
// OpenClaw Discovery
// ---------------------------------------------------------------------------

export interface OpenClawDiscoveryResult {
    name: string;
    verified: boolean;
}

/**
 * Verify an OpenClaw gateway is reachable and authenticated by probing
 * the HTTP API (GET /v1/models with Bearer token).
 */
export async function discoverOpenClawAgent(url: string, token: string): Promise<OpenClawDiscoveryResult> {
    const baseUrl = httpBaseUrl({ url });

    const res = await fetch(`${baseUrl}/v1/models`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
        throw new Error(`OpenClaw probe failed (${res.status}): ${await res.text()}`);
    }

    // Try to extract a name from the models response
    let name = 'OpenClaw Agent';
    try {
        const data = await res.json() as Record<string, unknown>;
        const models = (data.data ?? data.models) as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(models) && models.length > 0) {
            name = (models[0].id as string) ?? name;
        }
    } catch {
        // Response parsed but no useful data — that's fine
    }

    return { name, verified: true };
}
