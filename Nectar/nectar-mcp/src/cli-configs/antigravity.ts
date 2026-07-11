import { CliConfigAction, McpServerSpec, nectarCommand } from './types.js';

// Antigravity CLI (`agy`) — plugin-based MCP integration.
//
// Antigravity has NO project-config MCP mechanism like the other 5 CLIs, but it
// DOES support plugins that bundle an MCP server, giving the agent the same
// on-demand `nectar_query` tool. This was verified empirically against agy
// v1.1.1 (see the investigation notes):
//
//   * `agy plugin validate` reported "✔ mcpServers : 1 processed" only when the
//     MCP server was declared in a file named EXACTLY `mcp_config.json` at the
//     plugin root — NOT `.mcp.json`, NOT inline in plugin.json. Do not rename.
//   * The confirmed working activation path is `agy plugin install <dir>`
//     (auto-discovery via `.agents/plugins/` validated but did not demonstrably
//     load in headless sessions). So we emit that install command.
//   * A live trace confirmed agy spawns this server, calls initialize +
//     tools/list, and caches the `nectar_query` tool spec.
//
// NOT yet proven: a model-initiated `tools/call nectar_query` end-to-end (agy's
// headless --print mode runs in a scratch sandbox and never left it). Because
// of that, this builder is wired behind an explicit opt-in flag and is NOT the
// default for Antigravity — stdin injection remains the active default until a
// live interactive WorkerBee pane confirms the tool call. See index.ts.
export function antigravityConfig(spec: McpServerSpec): CliConfigAction {
  const command = nectarCommand(spec); // ['node', <serverPath>, '--project', <projectPath>]

  // plugin.json — the manifest that marks the directory as a plugin.
  const pluginManifest = {
    name: 'nectar',
    version: '0.1.0',
    description: 'Nectar cross-agent memory (nectar_query tool)',
  };

  // mcp_config.json — MUST be this exact filename for agy to detect the server.
  const mcpConfig = {
    mcpServers: {
      nectar: {
        command: command[0],
        args: command.slice(1),
      },
    },
  };

  return {
    kind: 'writePluginDir',
    pluginDir: spec.projectPath + '/.agents/plugins/nectar',
    files: [
      { relativePath: 'plugin.json', content: JSON.stringify(pluginManifest, null, 2) },
      { relativePath: 'mcp_config.json', content: JSON.stringify(mcpConfig, null, 2) },
    ],
    // Confirmed working activation path. Idempotent-ish: re-installing the same
    // plugin name simply refreshes the registration.
    installCommand: {
      command: 'agy',
      args: ['plugin', 'install', spec.projectPath + '/.agents/plugins/nectar'],
    },
  };
}
