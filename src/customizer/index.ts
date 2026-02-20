export { Customizer, RouteInstaller } from './Customizer';
export { TeamsCustomizer } from './TeamsCustomizer';
import { TeamsCustomizer } from './TeamsCustomizer';

// Default instance — uses Teams-specific folders and .synthtabs local folder.
export const customizer = new TeamsCustomizer();
