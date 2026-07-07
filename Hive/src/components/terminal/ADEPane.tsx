'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm, ITerminalOptions } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';
import { SearchAddon } from 'xterm-addon-search';
import { Terminal, X, Maximize2, Minimize2, Copy, Trash2, Bot, ChevronDown, Terminal as TerminalIcon, Cpu, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface ADEPaneProps {
  paneId: string;
  onClose?: () => void;
  onMaximize?: () => void;
  isMaximized?: boolean;
}

type TerminalType = 'cmd' | 'powershell' | 'git-bash' | 'wsl';
type AgentType = 'none' | 'claude-code' | 'codex-cli' | 'aider' | 'gemini-cli' | 'antigravity' | 'open-code' | 'kimi-code' | 'cursor' | 'windsurf';

const TERMINAL_LABELS: Record<TerminalType, string> = {
  'cmd': 'CMD',
  'powershell': 'PowerShell',
  'git-bash': 'Git Bash',
  'wsl': 'WSL',
};

const AGENT_LABELS: Record<AgentType, string> = {
  'none': 'No Agent',
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

const TERMINAL_COMMANDS: Record<TerminalType, string> = {
  'cmd': 'cmd.exe',
  'powershell': 'powershell.exe',
  'git-bash': 'bash.exe',
  'wsl': 'wsl.exe',
};

export default function ADEPane({ paneId, onClose, onMaximize, isMaximized }: ADEPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isSpawned, setIsSpawned] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalType>('cmd');
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('none');
  const [showTerminalMenu, setShowTerminalMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

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

      // Spawn terminal
      try {
        const command = TERMINAL_COMMANDS[selectedTerminal];
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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleDelete = () => {
    if (onClose) {
      onClose();
    }
    setShowContextMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(false);
      setShowTerminalMenu(false);
      setShowAgentMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
    <div className="flex flex-col h-full bg-[#1e1e1e] relative" onContextMenu={handleContextMenu}>
      {/* ADE header */}
      <div className="h-9 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-gray-400" />
          <span className="text-xs text-gray-300 font-medium">ADE {paneId}</span>
          
          {/* Terminal selector - improved UI */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowTerminalMenu(!showTerminalMenu); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#1e1e1e] border border-[#3c3c3c] rounded hover:border-[#007acc] text-gray-300 hover:text-white transition-all"
            >
              <TerminalIcon size={11} className="text-blue-400" />
              {TERMINAL_LABELS[selectedTerminal]}
              <ChevronDown size={10} className="text-gray-500" />
            </button>
            {showTerminalMenu && (
              <div className="absolute left-0 top-8 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-20 min-w-36">
                <div className="px-2 py-1.5 text-xs text-gray-500 font-medium border-b border-[#3c3c3c]">Terminal Type</div>
                {(Object.keys(TERMINAL_LABELS) as TerminalType[]).map((terminal) => (
                  <button
                    key={terminal}
                    onClick={(e) => { e.stopPropagation(); setSelectedTerminal(terminal); setShowTerminalMenu(false); setIsSpawned(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#3c3c3c] flex items-center gap-2 ${selectedTerminal === terminal ? 'bg-[#3c3c3c] text-white' : 'text-gray-300'}`}
                  >
                    <TerminalIcon size={11} className={selectedTerminal === terminal ? 'text-blue-400' : 'text-gray-500'} />
                    {TERMINAL_LABELS[terminal]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Agent selector - improved UI */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowAgentMenu(!showAgentMenu); }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-[#1e1e1e] border border-[#3c3c3c] rounded hover:border-[#007acc] text-gray-300 hover:text-white transition-all"
            >
              <Bot size={11} className={selectedAgent === 'none' ? 'text-gray-500' : 'text-purple-400'} />
              {AGENT_LABELS[selectedAgent]}
              <ChevronDown size={10} className="text-gray-500" />
            </button>
            {showAgentMenu && (
              <div className="absolute left-0 top-8 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-20 min-w-40 max-h-64 overflow-y-auto">
                <div className="px-2 py-1.5 text-xs text-gray-500 font-medium border-b border-[#3c3c3c]">AI Agent</div>
                {(Object.keys(AGENT_LABELS) as AgentType[]).map((agent) => (
                  <button
                    key={agent}
                    onClick={(e) => { e.stopPropagation(); setSelectedAgent(agent); setShowAgentMenu(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#3c3c3c] flex items-center gap-2 ${selectedAgent === agent ? 'bg-[#3c3c3c] text-white' : 'text-gray-300'}`}
                  >
                    <Bot size={11} className={selectedAgent === agent ? 'text-purple-400' : 'text-gray-500'} />
                    {AGENT_LABELS[agent]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
            title="Copy selection"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={12} />
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
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50 min-w-40"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDelete}
            className="w-full px-3 py-2 text-left text-xs hover:bg-[#e81123] text-red-400 flex items-center gap-2"
          >
            <Trash2 size={12} />
            Delete Terminal
          </button>
        </div>
      )}

      {/* Terminal content */}
      <div className="flex-1 overflow-hidden">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Terminal footer/status */}
      <div className="h-5 bg-[#252526] border-t border-[#3c3c3c] flex items-center justify-between px-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className={isSpawned ? 'text-green-400' : 'text-yellow-400'}>
            {isSpawned ? '●' : '○'}
          </span>
          <span>{isSpawned ? 'Running' : 'Stopped'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
}
