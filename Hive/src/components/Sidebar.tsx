'use client';

import { useState } from 'react';

interface SidebarProps {
  mode: 'editor' | 'terminals';
  onModeChange: (mode: 'editor' | 'terminals') => void;
  terminalLayout: 1 | 2;
  onTerminalLayoutChange: (layout: 1 | 2) => void;
  onFileSelect: (file: string) => void;
}

export default function Sidebar({
  mode,
  onModeChange,
  terminalLayout,
  onTerminalLayoutChange,
  onFileSelect,
}: SidebarProps) {
  const [files] = useState([
    'src/app/page.tsx',
    'src/components/Sidebar.tsx',
    'src/components/editor/EditorPanel.tsx',
    'src/components/terminal/TerminalPanel.tsx',
  ]);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Mode toggle */}
      <div className="p-2 border-b border-gray-700 flex gap-2">
        <button
          onClick={() => onModeChange('editor')}
          className={`flex-1 px-3 py-1 text-sm rounded ${
            mode === 'editor' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => onModeChange('terminals')}
          className={`flex-1 px-3 py-1 text-sm rounded ${
            mode === 'terminals' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          Terminals
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {mode === 'editor' ? (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Files</h3>
            <ul className="space-y-1">
              {files.map((file) => (
                <li
                  key={file}
                  onClick={() => onFileSelect(file)}
                  className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-700 rounded"
                >
                  {file}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2 uppercase">Layout</h3>
            <div className="flex gap-2">
              <button
                onClick={() => onTerminalLayoutChange(1)}
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  terminalLayout === 1 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                1 Pane
              </button>
              <button
                onClick={() => onTerminalLayoutChange(2)}
                className={`flex-1 px-3 py-2 text-sm rounded ${
                  terminalLayout === 2 ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                2 Panes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
