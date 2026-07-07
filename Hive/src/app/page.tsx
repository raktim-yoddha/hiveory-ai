'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import EditorPanel from '@/components/editor/EditorPanel';
import ADEPanel from '@/components/terminal/ADEPanel';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { File, Terminal, Settings, Search, GitBranch, FolderOpen, Save as SaveIcon, Plus, Minus, Square, X } from 'lucide-react';

export default function Home() {
  const [sidebarMode, setSidebarMode] = useState<'editor' | 'ade'>('editor');
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'settings'>('explorer');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const initializeNectar = async () => {
      try {
        const projectPath = await invoke<string>('get_project_path');
        await invoke('ensure_nectar_structure', { projectPath });
        setInitialized(true);
      } catch (e) {
        console.error('Failed to initialize Nectar:', e);
      }
    };
    initializeNectar();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S - Save file
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        console.log('Save shortcut triggered');
      }
      // Ctrl+` - Toggle ADE
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setSidebarMode(sidebarMode === 'ade' ? 'editor' : 'ade');
      }
      // Ctrl+B - Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
      // Ctrl+P - Command palette (placeholder)
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        console.log('Command palette triggered');
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
      const newWidth = e.clientX - 48; // Subtract activity bar width
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

  const handleOpenFile = async () => {
    try {
      const path = await invoke<string>('open_file_dialog');
      if (path) {
        setOpenFile(path);
      }
    } catch (e) {
      console.error('Failed to open file:', e);
    }
  };

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
          await window.close();
          break;
      }
    } catch (e) {
      console.error('Window action failed:', e);
    }
  };

  const menuItems = {
    file: [
      { label: 'New File', action: () => console.log('New file') },
      { label: 'New Window', action: () => console.log('New window') },
      { label: 'Open File...', action: handleOpenFile },
      { label: 'Open Folder...', action: () => console.log('Open folder') },
      { label: '-', action: () => {} },
      { label: 'Save', action: () => console.log('Save') },
      { label: 'Save As...', action: () => console.log('Save as') },
      { label: 'Save All', action: () => console.log('Save all') },
      { label: '-', action: () => {} },
      { label: 'Close Editor', action: () => console.log('Close editor') },
      { label: 'Close Folder', action: () => console.log('Close folder') },
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
      { label: '-', action: () => {} },
      { label: 'Find', action: () => console.log('Find') },
      { label: 'Replace', action: () => console.log('Replace') },
      { label: '-', action: () => {} },
      { label: 'Go to Line', action: () => console.log('Go to line') },
    ],
    selection: [
      { label: 'Select All', action: () => console.log('Select all') },
      { label: '-', action: () => {} },
      { label: 'Expand Selection', action: () => console.log('Expand selection') },
      { label: 'Shrink Selection', action: () => console.log('Shrink selection') },
      { label: '-', action: () => {} },
      { label: 'Copy Line Up', action: () => console.log('Copy line up') },
      { label: 'Copy Line Down', action: () => console.log('Copy line down') },
      { label: 'Move Line Up', action: () => console.log('Move line up') },
      { label: 'Move Line Down', action: () => console.log('Move line down') },
    ],
    view: [
      { label: 'Command Palette', action: () => console.log('Command palette') },
      { label: '-', action: () => {} },
      { label: 'Explorer', action: () => setActiveView('explorer') },
      { label: 'Search', action: () => setActiveView('search') },
      { label: 'Source Control', action: () => setActiveView('git') },
      { label: 'Extensions', action: () => setActiveView('settings') },
      { label: '-', action: () => {} },
      { label: 'Toggle Sidebar', action: () => setSidebarCollapsed(!sidebarCollapsed) },
      { label: 'Toggle Activity Bar', action: () => console.log('Toggle activity bar') },
      { label: '-', action: () => {} },
      { label: 'Appearance', action: () => console.log('Appearance') },
    ],
    go: [
      { label: 'Go to File...', action: () => console.log('Go to file') },
      { label: 'Go to Line...', action: () => console.log('Go to line') },
      { label: 'Go to Symbol...', action: () => console.log('Go to symbol') },
      { label: '-', action: () => {} },
      { label: 'Back', action: () => console.log('Back') },
      { label: 'Forward', action: () => console.log('Forward') },
      { label: '-', action: () => {} },
      { label: 'Go to Definition', action: () => console.log('Go to definition') },
      { label: 'Peek Definition', action: () => console.log('Peek definition') },
    ],
    run: [
      { label: 'Run Task', action: () => console.log('Run task') },
      { label: '-', action: () => {} },
      { label: 'Start Debugging', action: () => console.log('Start debugging') },
      { label: 'Run and Debug', action: () => console.log('Run and debug') },
      { label: '-', action: () => {} },
      { label: 'Stop Debugging', action: () => console.log('Stop debugging') },
      { label: 'Restart Debugging', action: () => console.log('Restart debugging') },
    ],
    terminal: [
      { label: 'New Terminal', action: () => setSidebarMode('ade') },
      { label: 'Split Terminal', action: () => console.log('Split terminal') },
      { label: '-', action: () => {} },
      { label: 'Clear Terminal', action: () => console.log('Clear terminal') },
      { label: '-', action: () => {} },
      { label: 'Configure Default Shell', action: () => console.log('Configure shell') },
    ],
    help: [
      { label: 'Welcome', action: () => console.log('Welcome') },
      { label: 'Documentation', action: () => console.log('Documentation') },
      { label: '-', action: () => {} },
      { label: 'Keyboard Shortcuts', action: () => console.log('Keyboard shortcuts') },
      { label: '-', action: () => {} },
      { label: 'Check for Updates', action: () => console.log('Check updates') },
      { label: 'About', action: () => console.log('About') },
    ],
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-white font-sans">
      {/* Single Windows-style Title Bar */}
      <div className="h-8 bg-[#323233] flex items-center justify-between px-2 border-b border-[#252526] select-none" data-tauri-drag-region>
        {/* Left: Editor/ADE tabs */}
        <div className="flex items-center gap-1">
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

        {/* Center: App name */}
        <div className="text-gray-400 text-xs font-medium">Hiveory v1</div>

        {/* Right: Menu items + Window controls */}
        <div className="flex items-center gap-1">
          {Object.keys(menuItems).map((menu) => (
            <div key={menu} className="relative">
              <button
                onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                className="px-2 py-1 text-xs text-gray-300 hover:bg-[#404040] rounded transition-colors capitalize"
              >
                {menu}
              </button>
              {activeMenu === menu && (
                <div className="absolute right-0 top-6 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50 min-w-40 max-h-96 overflow-y-auto">
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
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#3c3c3c] text-gray-300"
                      >
                        {item.label}
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
          
          <div className="w-px h-4 bg-[#252526] mx-1" />
          
          <button
            onClick={() => handleWindowAction('minimize')}
            className="w-8 h-6 flex items-center justify-center hover:bg-[#404040] text-gray-400 hover:text-white transition-colors"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => handleWindowAction('maximize')}
            className="w-8 h-6 flex items-center justify-center hover:bg-[#404040] text-gray-400 hover:text-white transition-colors"
          >
            <Square size={10} />
          </button>
          <button
            onClick={() => handleWindowAction('close')}
            className="w-8 h-6 flex items-center justify-center hover:bg-[#e81123] text-gray-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4 border-r border-[#252526]">
          <button
            onClick={() => activeView === 'explorer' ? setSidebarCollapsed(true) : setActiveView('explorer')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'explorer' ? 'text-white' : 'text-gray-500'}`}
            title="Explorer"
          >
            <File size={20} />
          </button>
          <button
            onClick={() => activeView === 'search' ? setSidebarCollapsed(true) : setActiveView('search')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'search' ? 'text-white' : 'text-gray-500'}`}
            title="Search"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => activeView === 'git' ? setSidebarCollapsed(true) : setActiveView('git')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'git' ? 'text-white' : 'text-gray-500'}`}
            title="Source Control"
          >
            <GitBranch size={20} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => activeView === 'settings' ? setSidebarCollapsed(true) : setActiveView('settings')}
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
              <div className="h-9 flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {activeView === 'explorer' ? 'Explorer' : activeView === 'search' ? 'Search' : activeView === 'git' ? 'Source Control' : 'Settings'}
              </div>
              <Sidebar
                mode={sidebarMode}
                onModeChange={setSidebarMode}
                onFileSelect={setOpenFile}
              />
            </div>
            {/* Resize handle */}
            <div 
              className="w-1 bg-[#3c3c3c] hover:bg-[#007acc] cursor-col-resize transition-colors"
              onMouseDown={handleMouseDown}
            />
          </>
        )}

        {/* Main panel */}
        <div className="flex-1 flex overflow-hidden">
          {sidebarMode === 'editor' ? (
            <EditorPanel openFile={openFile} />
          ) : (
            <ADEPanel />
          )}
        </div>
      </div>

      {/* Status bar */}
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
