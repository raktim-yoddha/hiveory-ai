'use client';

import TerminalPane from './TerminalPane';

interface TerminalPanelProps {
  layout: 1 | 2;
}

export default function TerminalPanel({ layout }: TerminalPanelProps) {
  return (
    <div className="flex-1 flex flex-col">
      {layout === 1 ? (
        <div className="flex-1">
          <TerminalPane paneId="1" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 border-b border-gray-700">
            <TerminalPane paneId="1" />
          </div>
          <div className="flex-1">
            <TerminalPane paneId="2" />
          </div>
        </div>
      )}
    </div>
  );
}
