import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { server } from "./service";
import { createConfig, init } from "./init";
import { customizer } from "./customizer";

const dynamicImport = new Function('specifier', `return import(specifier)`);

export async function run() {
    await yargs(hideBin(process.argv))
        .scriptName('synthtabs')
        .command('start', `Starts the SynthTabs server.`, (yargs) => {
            return yargs
                .option('port', {
                    describe: `The port number to use.`,
                    type: 'number',
                    default: 4242
                })
                .option('pages', {
                    describe: `Include default pages when initializing a new .synthtabs folder.`,
                    type: 'boolean',
                    default: true
                })
                .option('debug', {
                    describe: `Log all server requests with timing and page update summaries.`,
                    type: 'boolean',
                    default: false
                })
                .option('debug-page-updates', {
                    describe: `Log model input/output for page transformations to the console.`,
                    type: 'boolean',
                    default: false
                })
                .demandOption([]);
        }, async (args) => {
            const config = createConfig(customizer.localFolder, { debug: args.debug, debugPageUpdates: args.debugPageUpdates }, customizer);
            await init(config, args.pages);
            await server(config, customizer).listen(args.port, async () => {
                console.log(`SynthTabs server is running on http://localhost:${args.port}`);

                // Open using default browser
                const open = await dynamicImport('open');
                open.default(`http://localhost:${args.port}`);
            });
        })
        .help()
        .demandCommand()
        .parseAsync();
}
