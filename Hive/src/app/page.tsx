'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import EditorPanel from '@/components/editor/EditorPanel';
import ADEPanel from '@/components/terminal/ADEPanel';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { File, Terminal, Settings, Search, GitBranch, Plus, Minus, Square, X } from 'lucide-react';

export default function Home() {
  const [sidebarMode, setSidebarMode] = useState<'editor' | 'ade'>('editor');
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'settings'>('explorer');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const initializeNectar = async () => {
      try {
        const path = await invoke<string>('get_project_path');
        setProjectPath(path);
        await invoke('ensure_nectar_structure', { projectPath: path });
        setInitialized(true);
      } catch (e) {
        console.error('Failed to initialize Nectar:', e);
      }
    };
    initializeNectar();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setSidebarMode(sidebarMode === 'ade' ? 'editor' : 'ade');
      }
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarMode, sidebarCollapsed]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 150 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleWindowAction = async (action: 'minimize' | 'maximize' | 'close') => {
    try {
      const window = getCurrentWindow();
      switch (action) {
        case 'minimize':
          await window.minimize();
          break;
        case 'maximize':
          await window.toggleMaximize();
          break;
        case 'close':
          await window.destroy();
          break;
      }
    } catch (e) {
      console.error('Window action failed:', e);
    }
  };

  const menuItems = {
    file: [
      { label: 'New File', action: () => console.log('New file') },
      { label: 'Open File...', action: () => console.log('Open file') },
      { label: 'Open Folder...', action: () => console.log('Open folder') },
      { label: '-', action: () => {} },
      { label: 'Save', action: () => console.log('Save') },
      { label: 'Save As...', action: () => console.log('Save as') },
      { label: '-', action: () => {} },
      { label: 'Exit', action: () => handleWindowAction('close') },
    ],
    edit: [
      { label: 'Undo', action: () => console.log('Undo') },
      { label: 'Redo', action: () => console.log('Redo') },
      { label: '-', action: () => {} },
      { label: 'Cut', action: () => console.log('Cut') },
      { label: 'Copy', action: () => console.log('Copy') },
      { label: 'Paste', action: () => console.log('Paste') },
    ],
    view: [
      { label: 'Command Palette', action: () => console.log('Command palette') },
      { label: '-', action: () => {} },
      { label: 'Explorer', action: () => setActiveView('explorer') },
      { label: 'Search', action: () => setActiveView('search') },
      { label: 'Source Control', action: () => setActiveView('git') },
      { label: 'Settings', action: () => setActiveView('settings') },
      { label: '-', action: () => {} },
      { label: 'Toggle Sidebar', action: () => setSidebarCollapsed(!sidebarCollapsed) },
    ],
    terminal: [
      { label: 'New Terminal', action: () => setSidebarMode('ade') },
      { label: 'Split Terminal', action: () => console.log('Split terminal') },
      { label: '-', action: () => {} },
      { label: 'Clear Terminal', action: () => console.log('Clear terminal') },
    ],
    help: [
      { label: 'Welcome', action: () => console.log('Welcome') },
      { label: 'About', action: () => console.log('About') },
    ],
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-white font-sans select-none">
      {/* Title Bar */}
      <div className="h-8 bg-[#323233] flex items-center justify-between px-2 border-b border-[#252526]" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center text-xs font-bold">H</div>
          <span className="text-sm font-medium text-gray-300">Hiveory</span>
          
          {/* Editor/ADE Toggle */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setSidebarMode('editor')}
              className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 transition-colors ${
                sidebarMode === 'editor' 
                  ? 'bg-[#1e1e1e] text-white' 
                  : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-white'
              }`}
            >
              <File size={12} />
              Editor
            </button>
            <button
              onClick={() => setSidebarMode('ade')}
              className={`px-3 py-1 text-xs rounded flex items-center gap-1.5 transition-colors ${
                sidebarMode === 'ade' 
                  ? 'bg-[#1e1e1e] text-white' 
                  : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-white'
              }`}
            >
              <Terminal size={12} />
              ADE
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {Object.keys(menuItems).map((menu) => (
            <div key={menu} className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                className="px-3 py-1 text-xs text-gray-300 hover:bg-[#404040] rounded transition-colors capitalize"
              >
                {menu}
              </button>
              {activeMenu === menu && (
                <div className="absolute left-0 top-full mt-1 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50 min-w-48">
                  {menuItems[menu as keyof typeof menuItems].map((item, index) => (
                    item.label === '-' ? (
                      <div key={index} className="h-px bg-[#3c3c3c] my-1" />
                    ) : (
                      <button
                        key={item.label}
                        onClick={() => {
                          item.action();
                          setActiveMenu(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#094771] text-gray-300"
                      >
                        {item.label}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center">
          <button onClick={() => handleWindowAction('minimize')} className="w-10 h-8 flex items-center justify-center hover:bg-[#404040] text-gray-400 hover:text-white">
            <Minus size={14} />
          </button>
          <button onClick={() => handleWindowAction('maximize')} className="w-10 h-8 flex items-center justify-center hover:bg-[#404040] text-gray-400 hover:text-white">
            <Square size={12} />
          </button>
          <button onClick={() => handleWindowAction('close')} className="w-10 h-8 flex items-center justify-center hover:bg-[#e81123] text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity Bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-1 border-r border-[#252526]">
          <button
            onClick={() => { setActiveView('explorer'); setSidebarCollapsed(false); }}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'explorer' ? 'text-white' : 'text-gray-500'}`}
            title="Explorer"
          >
            <File size={20} />
          </button>
          <button
            onClick={() => { setActiveView('search'); setSidebarCollapsed(false); }}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'search' ? 'text-white' : 'text-gray-500'}`}
            title="Search"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => { setActiveView('git'); setSidebarCollapsed(false); }}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'git' ? 'text-white' : 'text-gray-500'}`}
            title="Source Control"
          >
            <GitBranch size={20} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => { setActiveView('settings'); setSidebarCollapsed(false); }}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'settings' ? 'text-white' : 'text-gray-500'}`}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <>
            <div 
              className="bg-[#252526] flex flex-col border-r border-[#1e1e1e]" 
              style={{ width: `${sidebarWidth}px` }}
            >
              <div className="h-9 flex items-center justify-between px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <span>{activeView === 'explorer' ? 'Explorer' : activeView === 'search' ? 'Search' : activeView === 'git' ? 'Source Control' : 'Settings'}</span>
                <button onClick={() => setSidebarCollapsed(true)} className="text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <Sidebar
                mode={sidebarMode}
                onModeChange={setSidebarMode}
                onFileSelect={setOpenFile}
              />
            </div>
            <div 
              className="w-1 bg-[#252526] hover:bg-[#007acc] cursor-col-resize transition-colors"
              onMouseDown={handleMouseDown}
            />
          </>
        )}

        {/* Main Panel */}
        <div className="flex-1 overflow-hidden">
          {sidebarMode === 'editor' ? (
            <EditorPanel openFile={openFile} />
          ) : (
            <ADEPanel workingDir={projectPath} />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-xs text-white">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <GitBranch size={12} />
            main
          </span>
          <span>0 errors, 0 warnings</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ln 1, Col 1</span>
          <span>UTF-8</span>
          <span>TypeScript</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
}
