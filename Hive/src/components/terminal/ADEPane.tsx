'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm, ITerminalOptions } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import { SearchAddon } from 'xterm-addon-search';
import { Terminal, X, Maximize2, Minimize2, Copy, Trash2, Bot, ChevronDown } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface ADEPaneProps {
  paneId: string;
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

type AgentType = 'shell' | 'claude-code' | 'codex-cli' | 'aider' | 'gemini-cli' | 'antigravity' | 'open-code' | 'kimi-code' | 'cursor' | 'windsurf';

const AGENT_LABELS: Record<AgentType, string> = {
  'shell': 'Shell',
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
  'aider': 'Aider',
  'gemini-cli': 'Gemini CLI',
  'antigravity': 'Antigravity',
  'open-code': 'Open Code',
  'kimi-code': 'Kimi Code',
  'cursor': 'Cursor',
  'windsurf': 'Windsurf',
};

export default function ADEPane({ paneId, onClose, onMaximize, isMaximized }: ADEPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isSpawned, setIsSpawned] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('shell');
  const [showAgentMenu, setShowAgentMenu] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      const { WebglAddon } = await import('xterm-addon-webgl');
      const { SearchAddon } = await import('xterm-addon-search');

      const options: ITerminalOptions = {
        cursorBlink: true,
        cursorStyle: 'block',
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
        fontWeight: '400',
        fontWeightBold: '700',
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#ffffff',
          cursorAccent: '#000000',
          selectionBackground: '#264f78',
          selectionForeground: '#ffffff',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
        allowTransparency: false,
        rightClickSelectsWord: true,
      };

      const terminal = new Terminal(options);
      const fitAddon = new FitAddon();
      const webglAddon = new WebglAddon();
      const searchAddon = new SearchAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(searchAddon);
      fitAddonRef.current = fitAddon;
      
      try {
        terminal.loadAddon(webglAddon);
      } catch (e) {
        // WebGL might not be available, fall back to canvas
        console.warn('WebGL addon failed to load, using canvas renderer');
      }

      terminal.open(terminalRef.current!);
      fitAddon.fit();

      // Spawn shell or agent
      try {
        const command = selectedAgent === 'shell' ? 'cmd.exe' : selectedAgent;
        await invoke('spawn_terminal', {
          paneId,
          command,
          args: [],
        });
        setIsSpawned(true);
        
        // Start reading output
        const readOutput = async () => {
          while (isSpawned) {
            try {
              const output = await invoke<string>('read_from_terminal', { paneId });
              if (output) {
                terminal.write(output);
              }
              await new Promise(resolve => setTimeout(resolve, 50));
            } catch (e) {
              console.error('Read error:', e);
              break;
            }
          }
        };
        readOutput();
      } catch (e) {
        terminal.writeln(`\x1b[31mFailed to spawn terminal: ${e}\x1b[0m`);
      }

      terminalInstance.current = terminal;

      const handleResize = () => {
        fitAddon.fit();
        if (terminalInstance.current) {
          const { rows, cols } = terminalInstance.current;
          invoke('resize_terminal', { paneId, rows, cols }).catch(console.error);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        terminal.dispose();
        setIsSpawned(false);
      };
    };

    initTerminal();
  }, [paneId]);

  const handleCopy = () => {
    if (terminalInstance.current) {
      const selection = terminalInstance.current.getSelection();
      if (selection) {
        navigator.clipboard.writeText(selection);
      }
    }
  };

  const handleClear = () => {
    if (terminalInstance.current) {
      terminalInstance.current.clear();
    }
  };

  const handleTerminalInput = (data: string) => {
    if (isSpawned) {
      invoke('write_to_terminal', {
        paneId,
        data,
      }).catch(console.error);
    }
  };

  useEffect(() => {
    if (terminalInstance.current && isSpawned) {
      const handleData = (data: string) => {
        handleTerminalInput(data);
      };

      terminalInstance.current.onData(handleData);

      return () => {
        // xterm.js doesn't have offData, we use a flag to ignore events
      };
    }
  }, [isSpawned, paneId, selectedAgent]);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* ADE header */}
      <div className="h-8 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-gray-400" />
          <span className="text-sm text-gray-300 font-medium">ADE {paneId}</span>
          <span className="text-xs px-1.5 py-0.5 bg-[#1e1e1e] rounded text-gray-400">{AGENT_LABELS[selectedAgent]}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button
              onClick={() => setShowAgentMenu(!showAgentMenu)}
              className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
              title="Select agent"
            >
              <Bot size={14} />
            </button>
            {showAgentMenu && (
              <div className="absolute right-0 top-8 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-10 min-w-40 max-h-96 overflow-y-auto">
                {(Object.keys(AGENT_LABELS) as AgentType[]).map((agent) => (
                  <button
                    key={agent}
                    onClick={() => {
                      setSelectedAgent(agent);
                      setShowAgentMenu(false);
                      setIsSpawned(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[#3c3c3c] text-gray-300 flex items-center gap-2"
                  >
                    <Bot size={12} />
                    {AGENT_LABELS[agent]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
            title="Copy selection"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={14} />
          </button>
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
              title="Close terminal"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Terminal footer/status */}
      <div className="h-6 bg-[#252526] border-t border-[#3c3c3c] flex items-center justify-between px-3 text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>LF</span>
        </div>
      </div>
    </div>
  );
}
