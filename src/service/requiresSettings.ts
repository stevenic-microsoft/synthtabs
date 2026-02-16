import { hasConfiguredSettings, loadSettings, SettingsV2 } from "../settings";


export async function requiresSettings(res: any, folder: string, cb: (settings: SettingsV2) => Promise<void>) {
    try {
        // Ensure settings configured
        const isConfigured = await hasConfiguredSettings(folder);
        if (!isConfigured) {
            res.status(400).send('Settings not configured');
            return;
        }

        // Load settings
        const settings = await loadSettings(folder);

        // Call the callback
        await cb(settings);
    } catch (err: unknown) {
        console.error(err);
        res.status(500).send((err as Error).message);
    }
}
