export type AuthStrategy = 'header' | 'bearer' | 'query' | 'oauth2';

export interface ConnectorField {
    name: string;
    label: string;
    type: 'password' | 'text';
}

export interface ConnectorOnboarding {
    url: string;
    steps: string[];
}

export interface ConnectorDefinition {
    id: string;
    name: string;
    category: string;
    description: string;
    baseUrl: string;
    authStrategy: AuthStrategy;
    authKey: string;
    fields: ConnectorField[];
    /** Usage hints shown to the LLM — recommended endpoints, default settings, gotchas. */
    hints?: string;
    /** Onboarding instructions — signup URL and steps to get an API key. */
    onboarding?: ConnectorOnboarding;
    /** OAuth2: Authorization endpoint URL. */
    authorizationUrl?: string;
    /** OAuth2: Token exchange endpoint URL. */
    tokenUrl?: string;
    /** OAuth2: Requested scopes. */
    scopes?: string[];
}

export interface ConnectorJson {
    id: string;
    name: string;
    category: string;
    description: string;
    baseUrl: string;
    authStrategy: AuthStrategy;
    authKey: string;
    fields: ConnectorField[];
    hints?: string[];
    onboarding?: ConnectorOnboarding;
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes?: string[];
}

export interface ConnectorConfig {
    apiKey: string;
    enabled: boolean;
}

export interface ConnectorOAuthConfig extends ConnectorConfig {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    userId?: string;
    accountName?: string;
    clientId?: string;
    clientSecret?: string;
}

export type ConnectorsConfig = Record<string, ConnectorConfig | ConnectorOAuthConfig>;

export interface ConnectorSummary {
    id: string;
    name: string;
    category: string;
    description: string;
    configured: boolean;
}

export interface ConnectorDetail extends ConnectorDefinition {
    configured: boolean;
    enabled: boolean;
    hasKey: boolean;
    connected?: boolean;
    accountName?: string;
    userId?: string;
}

export interface ConnectorCallRequest {
    connector: string;
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
}
