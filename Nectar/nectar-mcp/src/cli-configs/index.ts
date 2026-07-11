import { CliConfigAction, McpServerSpec } from './types.js';
import { opencodeConfig } from './opencode.js';
import { claudeCodeConfig } from './claude-code.js';
import { codexConfig } from './codex.js';
import { kiloCodeConfig } from './kilo-code.js';
import { clineConfig } from './cline.js';
import { antigravityConfig } from './antigravity.js';

export * from './types.js';
export { opencodeConfig, claudeCodeConfig, codexConfig, kiloCodeConfig, clineConfig, antigravityConfig };

// One clean map from CLI id -> pure config builder. This replaces the previous
// tangled `if (cli === ...) { ... } else if ...` chain in WorkerBeePane.tsx.
// Adding a CLI = add one file + one entry here.
//
// NOTE: `agy` (Antigravity) is intentionally NOT in this default map. Its
// plugin-based MCP path is proven to load but a live model-initiated tool call
// has not yet been confirmed, so it is gated behind an explicit opt-in (see
// `buildCliConfig` options). Until then Antigravity uses the stdin fallback.
const BUILDERS: Record<string, (spec: McpServerSpec) => CliConfigAction> = {
  opencode: opencodeConfig,
  claude: claudeCodeConfig,
  codex: codexConfig,
  kilo: kiloCodeConfig,
  cline: clineConfig,
};

/** CLI ids that have a Nectar MCP config builder active by default. */
export const MCP_CAPABLE_CLIS = Object.keys(BUILDERS);

/**
 * CLI ids that have a builder available but gated behind an opt-in flag.
 * Currently: Antigravity's plugin path (unproven end-to-end tool call).
 */
export const EXPERIMENTAL_MCP_CLIS = ['agy'];

export interface BuildCliConfigOptions {
  /**
   * Enable experimental/opt-in MCP paths that are not proven end-to-end.
   * When true, Antigravity (`agy`) returns its plugin `writePluginDir` action
   * instead of a `noop`. Default false -> Antigravity falls back to stdin.
   */
  enableAntigravityPlugin?: boolean;
}

/**
 * Resolve the config action for a CLI. Returns a `noop` action for CLIs with
 * no MCP support (e.g. `kimi`), and — unless explicitly opted in — for
 * Antigravity too, so the host falls back to stdin injection.
 */
export function buildCliConfig(
  cli: string,
  spec: McpServerSpec,
  options: BuildCliConfigOptions = {},
): CliConfigAction {
  // Experimental, opt-in only: Antigravity plugin path.
  if (cli === 'agy') {
    if (options.enableAntigravityPlugin) {
      return antigravityConfig(spec);
    }
    return {
      kind: 'noop',
      reason:
        "Antigravity plugin path is opt-in (not yet proven end-to-end); using stdin fallback. " +
        'Enable via enableAntigravityPlugin.',
    };
  }

  const builder = BUILDERS[cli];
  if (!builder) {
    return { kind: 'noop', reason: `No MCP support for '${cli}', use stdin fallback` };
  }
  return builder(spec);
}
