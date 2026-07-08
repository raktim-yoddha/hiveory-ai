'use client';

import { useState } from 'react';
import { Terminal, Plus, X } from 'lucide-react';
import TerminalPane from '../terminal/TerminalPane';

interface EditorTerminalPanelProps {
  workingDir?: string | null;
  height?: number;
}

interface TerminalTab {
  id: string;
  name: string;
}

export default function EditorTerminalPanel({ workingDir, height = 256 }: EditorTerminalPanelProps) {
  const [tabs, setTabs] = useState<TerminalTab[]>([
    { id: 'terminal-1', name: 'Terminal 1' }
  ]);
  const [activeTab, setActiveTab] = useState('terminal-1');
  const [collapsed, setCollapsed] = useState(false);

  const addTerminal = () => {
    if (tabs.length >= 4) return;
    const newId = `terminal-${tabs.length + 1}`;
    setTabs([...tabs, { id: newId, name: `Terminal ${tabs.length + 1}` }]);
    setActiveTab(newId);
  };

  const closeTerminal = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
  };

  if (collapsed) {
    return (
      <div className="h-8 bg-[#241f1c] border-t border-[#3d2e1f] flex items-center justify-between px-3">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 text-xs text-[#c9b896] hover:text-[#f5f0e6]"
        >
          <Terminal size={14} />
          <span>Terminal</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1614] flex flex-col border-t border-[#3d2e1f]" style={{ height: `${height}px` }}>
      {/* Terminal toolbar */}
      <div className="h-8 bg-[#241f1c] flex items-center justify-between px-3">
        <div className="flex items-center gap-1">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1 text-xs rounded cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#3d2e1f] text-[#f5f0e6]'
                    : 'text-[#8a7b5c] hover:bg-[#3d2e1f]/50 hover:text-[#c9b896]'
                }`}
              >
                <span>{tab.name}</span>
                <button
                  onClick={(e) => closeTerminal(tab.id, e)}
                  className="p-0.5 rounded hover:bg-[#1a1614] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={addTerminal}
              disabled={tabs.length >= 4}
              className="p-1 rounded hover:bg-[#3d2e1f] text-[#8a7b5c] hover:text-[#c9a227] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add new terminal"
            >
              <Plus size={12} />
            </button>
        </div>
        
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-[#3d2e1f] text-[#8a7b5c] hover:text-[#c9b896] transition-colors"
          title="Collapse terminal"
        >
          <X size={14} />
        </button>
      </div>

      {/* Active terminal */}
      <div className="flex-1 overflow-hidden">
        <TerminalPane paneId={activeTab} workingDir={workingDir} />
      </div>
    </div>
  );
}
