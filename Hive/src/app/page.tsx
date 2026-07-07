'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import EditorPanel from '@/components/editor/EditorPanel';
import ADEPanel from '@/components/terminal/ADEPanel';
import { invoke } from '@tauri-apps/api/core';
import { File, Terminal, Settings, Search, GitBranch, Menu, FolderOpen, Save as SaveIcon, Plus } from 'lucide-react';

export default function Home() {
  const [sidebarMode, setSidebarMode] = useState<'editor' | 'ade'>('editor');
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'git' | 'settings'>('explorer');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

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

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] text-white font-sans">
      {/* Single Windows-style Title Bar */}
      <div className="h-10 bg-[#323233] flex items-center justify-between px-3 border-b border-[#252526]">
        {/* Left: File menu + Tabs */}
        <div className="flex items-center gap-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="px-3 py-1.5 text-sm text-gray-300 hover:bg-[#404040] rounded transition-colors flex items-center gap-2"
            >
              <Menu size={16} />
              File
            </button>
            {showFileMenu && (
              <div className="absolute left-0 top-10 bg-[#252526] border border-[#3c3c3c] rounded shadow-lg z-50 min-w-48">
                <button
                  onClick={handleOpenFile}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[#3c3c3c] text-gray-300 flex items-center gap-2"
                >
                  <FolderOpen size={14} />
                  Open File
                </button>
                <button
                  onClick={() => console.log('New file')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[#3c3c3c] text-gray-300 flex items-center gap-2"
                >
                  <Plus size={14} />
                  New File
                </button>
                <button
                  onClick={() => console.log('Save file')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-[#3c3c3c] text-gray-300 flex items-center gap-2"
                >
                  <SaveIcon size={14} />
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-[#252526] mx-1" />

          {/* Editor/ADE Tabs */}
          <button
            onClick={() => setSidebarMode('editor')}
            className={`px-4 py-1.5 text-sm rounded flex items-center gap-2 transition-colors ${
              sidebarMode === 'editor' 
                ? 'bg-[#1e1e1e] text-white' 
                : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <File size={16} />
            Editor
          </button>
          <button
            onClick={() => setSidebarMode('ade')}
            className={`px-4 py-1.5 text-sm rounded flex items-center gap-2 transition-colors ${
              sidebarMode === 'ade' 
                ? 'bg-[#1e1e1e] text-white' 
                : 'text-gray-400 hover:bg-[#2a2d2e] hover:text-white'
            }`}
          >
            <Terminal size={16} />
            ADE
          </button>
        </div>

        {/* Center: App name */}
        <div className="text-gray-400 text-sm font-medium">Hiveory v1</div>

        {/* Right: Window controls (Windows style) */}
        <div className="flex items-center gap-1">
          <button className="w-10 h-8 flex items-center justify-center hover:bg-[#404040] text-gray-400 hover:text-white transition-colors">
            <span className="text-lg">─</span>
          </button>
          <button className="w-10 h-8 flex items-center justify-center hover:bg-[#404040] text-gray-400 hover:text-white transition-colors">
            <span className="text-lg">□</span>
          </button>
          <button className="w-10 h-8 flex items-center justify-center hover:bg-[#e81123] text-gray-400 hover:text-white transition-colors">
            <span className="text-lg">✕</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Activity bar */}
        <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-4 border-r border-[#252526]">
          <button
            onClick={() => setActiveView('explorer')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'explorer' ? 'text-white' : 'text-gray-500'}`}
            title="Explorer"
          >
            <File size={20} />
          </button>
          <button
            onClick={() => setActiveView('search')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'search' ? 'text-white' : 'text-gray-500'}`}
            title="Search"
          >
            <Search size={20} />
          </button>
          <button
            onClick={() => setActiveView('git')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'git' ? 'text-white' : 'text-gray-500'}`}
            title="Source Control"
          >
            <GitBranch size={20} />
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setActiveView('settings')}
            className={`p-2 rounded hover:bg-[#2a2d2e] transition-colors ${activeView === 'settings' ? 'text-white' : 'text-gray-500'}`}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Sidebar */}
        {!sidebarCollapsed && (
          <div className="w-64 bg-[#252526] flex flex-col border-r border-[#1e1e1e]">
            <div className="h-9 flex items-center px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {activeView === 'explorer' ? 'Explorer' : activeView === 'search' ? 'Search' : activeView === 'git' ? 'Source Control' : 'Settings'}
            </div>
            <Sidebar
              mode={sidebarMode}
              onModeChange={setSidebarMode}
              onFileSelect={setOpenFile}
            />
          </div>
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
