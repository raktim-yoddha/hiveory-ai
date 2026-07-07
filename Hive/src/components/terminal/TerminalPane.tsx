'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebglAddon } from 'xterm-addon-webgl';

interface TerminalPaneProps {
  paneId: string;
}

export default function TerminalPane({ paneId }: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

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

    terminal.open(terminalRef.current);
    fitAddon.fit();

    terminal.writeln(`Welcome to Hiveory Terminal [${paneId}]`);
    terminal.writeln('$ ');

    terminalInstance.current = terminal;

    return () => {
      terminal.dispose();
    };
  }, [paneId]);

  return <div ref={terminalRef} className="w-full h-full" />;
}
