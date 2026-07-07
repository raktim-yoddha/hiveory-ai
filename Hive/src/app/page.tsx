'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import EditorPanel from '@/components/editor/EditorPanel';
import TerminalPanel from '@/components/terminal/TerminalPanel';

export default function Home() {
  const [sidebarMode, setSidebarMode] = useState<'editor' | 'terminals'>('editor');
  const [terminalLayout, setTerminalLayout] = useState<1 | 2>(1);
  const [openFile, setOpenFile] = useState<string | null>(null);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white">
      {/* Top bar */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4">
        <span className="font-semibold">Hiveory v1</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          mode={sidebarMode}
          onModeChange={setSidebarMode}
          terminalLayout={terminalLayout}
          onTerminalLayoutChange={setTerminalLayout}
          onFileSelect={setOpenFile}
        />

        {/* Main panel */}
        <div className="flex-1 flex overflow-hidden">
          {sidebarMode === 'editor' ? (
            <EditorPanel openFile={openFile} />
          ) : (
            <TerminalPanel layout={terminalLayout} />
          )}
        </div>
      </div>
    </div>
  );
}
