import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SshTunnelConfig {
    /** Full SSH command, e.g. "ssh -p 22 -N -L 18789:127.0.0.1:43901 root@1.2.3.4" */
    command: string;
    /** Password to pipe when prompted */
    password: string;
}

interface TunnelEntry {
    agentId: string;
    config: SshTunnelConfig;
    process: ChildProcess | null;
    running: boolean;
    reconnecting: boolean;
    intentionalStop: boolean;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    reconnectAttempts: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TUNNEL_READY_PROBE_DELAY_MS = 2_000;
const BASE_RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 120_000;

const IS_WINDOWS = process.platform === 'win32';

// ---------------------------------------------------------------------------
// Shared askpass script — reads password from an env var, never touches disk
// with the actual secret. One script is created per process lifetime and
// reused by all tunnels. Each tunnel sets a unique env var name so concurrent
// tunnels don't collide.
// ---------------------------------------------------------------------------

let sharedAskpassPath: string | null = null;

/**
 * Env-var-based askpass script. The script reads the env var whose name is
 * passed via SYNTHOS_SSH_PASS_VAR and echoes its value.
 *
 * Windows .bat:  echo %<varName>%
 * Unix .sh:      eval echo \$<varName>
 */
function getAskpassScript(): string {
    if (sharedAskpassPath && fs.existsSync(sharedAskpassPath)) {
        return sharedAskpassPath;
    }

    const tmpDir = os.tmpdir();
    if (IS_WINDOWS) {
        const p = path.join(tmpDir, 'synthos-askpass.bat');
        // %SYNTHOS_SSH_PASS_VAR% holds the NAME of the var containing the password
        // We use delayed expansion to read it indirectly
        fs.writeFileSync(p,
            '@echo off\r\n' +
            'setlocal enabledelayedexpansion\r\n' +
            'echo !%SYNTHOS_SSH_PASS_VAR%!\r\n',
            { mode: 0o700 }
        );
        sharedAskpassPath = p;
    } else {
        const p = path.join(tmpDir, 'synthos-askpass.sh');
        fs.writeFileSync(p,
            '#!/bin/sh\n' +
            'eval echo \\$"$SYNTHOS_SSH_PASS_VAR"\n',
            { mode: 0o700 }
        );
        sharedAskpassPath = p;
    }

    return sharedAskpassPath;
}

// ---------------------------------------------------------------------------
// Module-level tunnel pool
// ---------------------------------------------------------------------------

const tunnels = new Map<string, TunnelEntry>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start an SSH tunnel for the given agent. Resolves once the tunnel appears
 * ready (local port probe succeeds or delay elapses).
 */
export async function startTunnel(agentId: string, config: SshTunnelConfig): Promise<void> {
    // If already running, nothing to do
    const existing = tunnels.get(agentId);
    if (existing?.running) {
        return;
    }

    const entry: TunnelEntry = existing ?? {
        agentId,
        config,
        process: null,
        running: false,
        reconnecting: false,
        intentionalStop: false,
        reconnectTimer: null,
        reconnectAttempts: 0,
    };

    entry.config = config;
    entry.intentionalStop = false;
    tunnels.set(agentId, entry);

    return spawnTunnel(entry);
}

/**
 * Stop the SSH tunnel for the given agent.
 */
export function stopTunnel(agentId: string): void {
    const entry = tunnels.get(agentId);
    if (!entry) return;

    entry.intentionalStop = true;

    if (entry.reconnectTimer) {
        clearTimeout(entry.reconnectTimer);
        entry.reconnectTimer = null;
    }

    if (entry.process) {
        entry.process.kill();
        entry.process = null;
    }

    entry.running = false;
    entry.reconnecting = false;
    tunnels.delete(agentId);
    console.log(`[SSH Tunnel] Stopped tunnel for agent "${agentId}"`);
}

/**
 * Get tunnel status without starting it.
 */
export function getTunnelStatus(agentId: string): { running: boolean; reconnecting: boolean } {
    const entry = tunnels.get(agentId);
    return {
        running: entry?.running ?? false,
        reconnecting: entry?.reconnecting ?? false,
    };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Try to extract the local port from the SSH command.
 * Looks for -L <localPort>:<host>:<remotePort> pattern.
 */
function extractLocalPort(command: string): number | null {
    const match = command.match(/-L\s+(\d+):/);
    return match ? parseInt(match[1], 10) : null;
}

/**
 * Probe a local TCP port to check if it's accepting connections.
 */
function probePort(port: number, timeoutMs: number = 1000): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timer = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, timeoutMs);

        socket.connect(port, '127.0.0.1', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(true);
        });

        socket.on('error', () => {
            clearTimeout(timer);
            socket.destroy();
            resolve(false);
        });
    });
}

/**
 * Spawn the SSH process and wait for the tunnel to be ready.
 *
 * Password delivery: SSH does NOT read passwords from stdin — it opens the
 * TTY directly. We use a shared askpass script that reads the password from
 * a per-tunnel env var. The password only lives in process memory (the env
 * of the child process), never on disk.
 */
function spawnTunnel(entry: TunnelEntry): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        console.log(`[SSH Tunnel] Starting tunnel for agent "${entry.agentId}": ${entry.config.command}`);

        let settled = false;

        function settle(err?: Error): void {
            if (settled) return;
            settled = true;
            if (err) reject(err);
            else resolve();
        }

        try {
            const askpassPath = getAskpassScript();

            // Per-tunnel env var name so concurrent tunnels don't collide
            const passVarName = `SYNTHOS_SSHPW_${randomBytes(4).toString('hex')}`;

            // Build args from the user's command, injecting StrictHostKeyChecking=no
            // to avoid the interactive host key confirmation prompt
            const parts = entry.config.command.trim().split(/\s+/);
            const cmd = parts.shift()!;
            const args = [
                '-o', 'StrictHostKeyChecking=no',
                '-o', 'UserKnownHostsFile=' + (IS_WINDOWS ? 'NUL' : '/dev/null'),
                ...parts,
            ];

            const env: Record<string, string> = {
                ...process.env as Record<string, string>,
                SSH_ASKPASS: askpassPath,
                SSH_ASKPASS_REQUIRE: 'force',
                // The askpass script reads this var name, then echoes its value
                SYNTHOS_SSH_PASS_VAR: passVarName,
                [passVarName]: entry.config.password,
            };

            // On Unix, DISPLAY must be set for SSH_ASKPASS to be used (fallback for older SSH)
            if (!IS_WINDOWS) {
                env.DISPLAY = env.DISPLAY || 'dummy:0';
            }

            console.log(`[SSH Tunnel] Spawning: ${cmd} ${args.join(' ')}`);

            const child = spawn(cmd, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                env,
                // Detach stdin from the parent's TTY so SSH uses SSH_ASKPASS
                detached: !IS_WINDOWS,
            });

            entry.process = child;

            // Log all output for diagnostics
            const handleOutput = (source: string) => (data: Buffer) => {
                const text = data.toString().trim();
                if (text) {
                    console.log(`[SSH Tunnel] [${entry.agentId}] ${source}: ${text}`);
                }
            };

            child.stdout?.on('data', handleOutput('stdout'));
            child.stderr?.on('data', handleOutput('stderr'));

            child.on('error', (err) => {
                console.error(`[SSH Tunnel] Spawn error for agent "${entry.agentId}":`, err.message);
                entry.running = false;
                entry.process = null;
                settle(err);
            });

            child.on('exit', (code, signal) => {
                const wasRunning = entry.running;
                entry.running = false;
                entry.process = null;

                console.log(`[SSH Tunnel] Process exited for agent "${entry.agentId}" (code=${code}, signal=${signal})`);

                // If we never settled (tunnel never came up), reject
                settle(new Error(`SSH tunnel exited before becoming ready (code=${code})`));

                // Auto-reconnect if the tunnel was running and this wasn't intentional
                if (wasRunning && !entry.intentionalStop) {
                    scheduleReconnect(entry);
                }
            });

            // Wait for the tunnel to be ready by probing the local port
            const localPort = extractLocalPort(entry.config.command);
            if (localPort) {
                waitForPort(entry, localPort, settle);
            } else {
                // No port to probe — use delay heuristic
                setTimeout(() => {
                    if (entry.process && !entry.intentionalStop) {
                        entry.running = true;
                        entry.reconnecting = false;
                        entry.reconnectAttempts = 0;
                        console.log(`[SSH Tunnel] Tunnel ready (delay heuristic) for agent "${entry.agentId}"`);
                        settle();
                    }
                }, TUNNEL_READY_PROBE_DELAY_MS);
            }
        } catch (err) {
            entry.running = false;
            settle(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

/**
 * Poll for the local port to accept connections, then declare the tunnel ready.
 */
function waitForPort(entry: TunnelEntry, port: number, settle: (err?: Error) => void): void {
    let attempts = 0;
    const maxAttempts = 15; // 15 * 1000ms = 15s max (SSH + password can take a few seconds)
    const intervalMs = 1000;

    const timer = setInterval(async () => {
        attempts++;
        if (entry.intentionalStop || !entry.process) {
            clearInterval(timer);
            return;
        }

        const ok = await probePort(port);
        if (ok) {
            clearInterval(timer);
            entry.running = true;
            entry.reconnecting = false;
            entry.reconnectAttempts = 0;
            console.log(`[SSH Tunnel] Tunnel ready (port ${port} open) for agent "${entry.agentId}"`);
            settle();
        } else if (attempts >= maxAttempts) {
            clearInterval(timer);
            // Declare ready anyway — the port might only open on first inbound connection
            entry.running = true;
            entry.reconnecting = false;
            entry.reconnectAttempts = 0;
            console.log(`[SSH Tunnel] Tunnel assumed ready (port probe timed out) for agent "${entry.agentId}"`);
            settle();
        }
    }, intervalMs);
}

/**
 * Schedule an automatic reconnect with exponential backoff.
 */
function scheduleReconnect(entry: TunnelEntry): void {
    if (entry.reconnectTimer || entry.intentionalStop) return;

    entry.reconnecting = true;
    entry.reconnectAttempts++;

    const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, entry.reconnectAttempts - 1),
        MAX_RECONNECT_DELAY_MS
    );

    console.log(`[SSH Tunnel] Scheduling reconnect for agent "${entry.agentId}" in ${delay}ms (attempt ${entry.reconnectAttempts})`);

    entry.reconnectTimer = setTimeout(async () => {
        entry.reconnectTimer = null;
        if (entry.intentionalStop) return;

        try {
            await spawnTunnel(entry);
            console.log(`[SSH Tunnel] Reconnected tunnel for agent "${entry.agentId}"`);
        } catch (err) {
            console.error(`[SSH Tunnel] Reconnect failed for agent "${entry.agentId}":`,
                err instanceof Error ? err.message : err);
            // Schedule another attempt
            if (!entry.intentionalStop) {
                scheduleReconnect(entry);
            }
        }
    }, delay);
}
