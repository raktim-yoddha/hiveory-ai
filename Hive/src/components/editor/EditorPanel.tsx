'use client';

import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

interface EditorPanelProps {
  openFile: string | null;
}

export default function EditorPanel({ openFile }: EditorPanelProps) {
  const editorRef = useRef<any>(null);

  return (
    <div className="flex-1 flex flex-col">
      {/* File tabs */}
      <div className="h-10 bg-gray-800 border-b border-gray-700 flex items-center px-4">
        <span className="text-sm text-gray-300">
          {openFile || 'No file open'}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          value={openFile ? `// ${openFile}\n// File content would be loaded here` : '// Select a file to edit'}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {/* Inline terminal */}
      <div className="h-48 bg-gray-900 border-t border-gray-700">
        <div className="h-8 bg-gray-800 border-b border-gray-700 flex items-center px-4">
          <span className="text-xs text-gray-400">Terminal</span>
        </div>
        <div className="p-2 font-mono text-sm text-green-400">
          $ Ready for commands...
        </div>
      </div>
    </div>
  );
}
