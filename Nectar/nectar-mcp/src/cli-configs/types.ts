// Shared types for per-CLI MCP config builders.
//
// These builders are PURE: they take the resolved paths and return a plain
// description of *what* config to write or *what* command to run. They perform
// no file I/O and import no Tauri APIs, so they can be unit-tested in plain
// Node and reused from any host (the Tauri renderer does the actual I/O via
// its own `invoke()` calls).

export interface McpServerSpec {
  /** Absolute path to the Nectar MCP server entry (index.js). */
  mcpServerPath: string;
  /** Absolute path to the project whose .nectar/ should be queried. */
  projectPath: string;
}

/** A config-file write the host should perform. */
export interface FileConfigAction {
  kind: 'writeFile';
  /** Absolute path of the JSON/JSONC config file to write. */
  path: string;
  /**
   * Existing file content is merged in by the host before writing; the builder
   * returns a `merge(existing)` function so per-CLI merge rules stay local to
   * each CLI file instead of being duplicated in the host.
   */
  merge: (existingRaw: string | null) => string;
}

/** A one-off command the host should run (e.g. `codex mcp add ...`). */
export interface CommandConfigAction {
  kind: 'runCommand';
  command: string;
  args: string[];
}

/** No MCP support for this CLI; host should fall back to stdin injection. */
export interface NoopConfigAction {
  kind: 'noop';
  reason: string;
}

/** A single file the host should write as part of a plugin directory. */
export interface PluginFile {
  /** Path relative to the plugin directory root (e.g. "plugin.json"). */
  relativePath: string;
  /** Exact file contents to write (already serialized). */
  content: string;
}

/**
 * Write a whole plugin directory, then optionally run a registration command.
 *
 * Used by Antigravity (`agy`): its plugins are directories containing a
 * `plugin.json` manifest plus a `mcp_config.json` declaring the MCP server.
 * The confirmed activation path is `agy plugin install <dir>` (NOT
 * auto-discovery), so `installCommand` carries that one-off command.
 */
export interface PluginDirConfigAction {
  kind: 'writePluginDir';
  /** Absolute path of the plugin directory to create (contains the files). */
  pluginDir: string;
  /** Files to write under `pluginDir`. */
  files: PluginFile[];
  /** Optional command to register/activate the plugin after files are written. */
  installCommand?: { command: string; args: string[] };
}

export type CliConfigAction =
  | FileConfigAction
  | CommandConfigAction
  | NoopConfigAction
  | PluginDirConfigAction;

/** The `node <mcpServerPath> --project <projectPath>` invocation, as argv. */
export function nectarCommand(spec: McpServerSpec): string[] {
  return ['node', spec.mcpServerPath, '--project', spec.projectPath];
}
