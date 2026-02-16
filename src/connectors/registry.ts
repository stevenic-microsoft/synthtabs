import { ConnectorDefinition } from './types';

export const CONNECTOR_REGISTRY: ConnectorDefinition[] = [
    {
        id: 'brave-search',
        name: 'Brave Search',
        category: 'Search',
        description: 'Web search powered by the Brave Search API. Provides real-time search results from the web.',
        baseUrl: 'https://api.search.brave.com',
        authStrategy: 'header',
        authKey: 'X-Subscription-Token',
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password' }
        ],
        hints: [
            'Endpoint: GET /res/v1/web/search',
            'Query params: q (required), count (1-20, default 10), country, freshness',
            'Response: { web: { results: [{ title, url, description }] } }',
            'Note: synthos.search.web() is a convenience wrapper — prefer it over raw connector calls for basic web search.'
        ].join('\n')
    },
    {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        category: 'Audio',
        description: 'AI-powered text-to-speech and voice synthesis. Generate natural-sounding audio from text.',
        baseUrl: 'https://api.elevenlabs.io',
        authStrategy: 'header',
        authKey: 'xi-api-key',
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password' }
        ],
        hints: [
            'List voices: GET /v1/voices → { voices: [{ voice_id, name, category }] }',
            'Text-to-speech: POST /v1/text-to-speech/{voice_id}?output_format=mp3_44100_128',
            '  Request headers: Accept: audio/mpeg, Content-Type: application/json',
            '  Request body: { text: string, model_id: "eleven_multilingual_v2" }',
            '  Response: raw audio/mpeg binary — use resp.arrayBuffer() then new Blob([buf], {type:"audio/mpeg"}) and URL.createObjectURL() to play',
            '  IMPORTANT: The proxy returns raw binary, NOT JSON. Call fetch("/api/connectors", ...) directly instead of synthos.connectors.call() for TTS, since the helper parses JSON.',
            'Default voice: "Rachel" (voice_id: 21m00Tcm4TlvDq8ikWAM) is a good general-purpose voice.',
            'Max text length: 5000 characters per request.'
        ].join('\n')
    },
    {
        id: 'stability-ai',
        name: 'Stability AI',
        category: 'Image',
        description: 'AI image generation powered by Stable Diffusion. Create images from text prompts.',
        baseUrl: 'https://api.stability.ai',
        authStrategy: 'bearer',
        authKey: 'Authorization',
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'password' }
        ],
        hints: [
            'Text-to-image: POST /v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
            '  Request headers: Content-Type: application/json, Accept: application/json',
            '  Request body: { text_prompts: [{ text: string, weight: 1 }], cfg_scale: 7, steps: 30, width: 1024, height: 1024 }',
            '  Response: { artifacts: [{ base64: string, finishReason: string }] }',
            '  Display with: <img src="data:image/png;base64,{base64}">'
        ].join('\n')
    },
    {
        id: 'instagram',
        name: 'Instagram',
        category: 'Social',
        description: 'Post photos and videos to Instagram via the Instagram Graph API.',
        baseUrl: 'https://graph.facebook.com/v21.0',
        authStrategy: 'oauth2',
        authKey: 'access_token',
        authorizationUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
        scopes: [
            'instagram_basic',
            'instagram_content_publish',
            'pages_show_list',
            'pages_read_engagement'
        ],
        fields: [
            { name: 'clientId', label: 'App ID', type: 'text' },
            { name: 'clientSecret', label: 'App Secret', type: 'password' }
        ],
        hints: [
            'Publishing flow (two-step):',
            '  1. Create media container: POST /{ig-user-id}/media',
            '     Body (photo): { image_url, caption }',
            '     Body (reel/video): { video_url, caption, media_type: "REELS" }',
            '     Response: { id: "<container-id>" }',
            '  2. Publish container: POST /{ig-user-id}/media_publish',
            '     Body: { creation_id: "<container-id>" }',
            '     Response: { id: "<media-id>" }',
            'IMPORTANT: Do NOT include access_token in body or query params — the proxy attaches it automatically.',
            'IMPORTANT: Images must be publicly accessible URLs. Use a hosting service or the data API to serve local images.',
            'Rate limit: 25 posts per 24-hour period.',
            'Requires a Business or Creator Instagram account linked to a Facebook Page.'
        ].join('\n')
    }
];
