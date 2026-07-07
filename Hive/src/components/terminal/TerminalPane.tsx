'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm, ITerminalOptions } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { invoke } from '@tauri-apps/api/core';

interface TerminalPaneProps {
  paneId?: string;
  workingDir?: string | null;
}

export default function TerminalPane({ paneId = 'terminal-1', workingDir }: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isSpawned, setIsSpawned] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    let mounted = true;

    const initTerminal = async () => {
      try {
        const { Terminal } = await import('xterm');
        const { FitAddon } = await import('xterm-addon-fit');
        const { SearchAddon } = await import('xterm-addon-search');

        const options: ITerminalOptions = {
          cursorBlink: true,
          cursorStyle: 'block',
          fontSize: 14,
          fontFamily: 'Cascadia Code, Consolas, "Courier New", monospace',
          fontWeight: '400',
          fontWeightBold: '700',
          lineHeight: 1.2,
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
          scrollback: 1000,
        };

        const terminal = new Terminal(options);
        const fitAddon = new FitAddon();
        const searchAddon = new SearchAddon();

        terminal.loadAddon(fitAddon);
        terminal.loadAddon(searchAddon);
        fitAddonRef.current = fitAddon;

        terminal.open(terminalRef.current!);
        fitAddon.fit();

        // Get working directory
        let spawnDir = workingDir;
        if (!spawnDir) {
          try {
            spawnDir = await invoke<string>('get_project_path');
          } catch (e) {
            try {
              spawnDir = await invoke<string>('get_home_dir');
            } catch (e2) {
              console.error('Failed to get working directory:', e2);
            }
          }
        }

        // Spawn PowerShell terminal
        try {
          await invoke('spawn_terminal', {
            paneId,
            command: 'powershell.exe',
            args: [],
            workingDir: spawnDir,
          });
          
          if (mounted) {
            setIsSpawned(true);
            
            // Start reading output
            const readOutput = async () => {
              while (mounted && isSpawned) {
                try {
                  const output = await invoke<string>('read_from_terminal', { paneId });
                  if (output && mounted) {
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
          }
        } catch (e) {
          if (mounted) {
            terminal.writeln(`\x1b[31mFailed to spawn terminal: ${e}\x1b[0m`);
          }
        }

        if (mounted) {
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
        }
      } catch (e) {
        console.error('Failed to initialize terminal:', e);
      }
    };

    initTerminal();

    return () => {
      mounted = false;
    };
  }, [paneId, workingDir]);

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
    }
  }, [isSpawned, paneId]);

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
