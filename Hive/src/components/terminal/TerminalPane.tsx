'use client';

import { useEffect, useRef } from 'react';

interface TerminalPaneProps {
  paneId: string;
}

export default function TerminalPane({ paneId }: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<any>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      const { WebglAddon } = await import('xterm-addon-webgl');

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'monospace',
        theme: {
          background: '#1a1a1a',
          foreground: '#ffffff',
        },
      });

      const fitAddon = new FitAddon();
      const webglAddon = new WebglAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webglAddon);

      terminal.open(terminalRef.current!);
      fitAddon.fit();

      terminal.writeln(`Welcome to Hiveory Terminal [${paneId}]`);
      terminal.writeln('$ ');

      terminalInstance.current = terminal;

      return () => {
        terminal.dispose();
      };
    };

    initTerminal();
  }, [paneId]);

  return <div ref={terminalRef} className="w-full h-full" />;
}
