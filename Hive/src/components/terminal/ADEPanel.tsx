'use client';

import { useState } from 'react';
import ADEPane from './ADEPane';
import ResizeHandle from './ResizeHandle';
import { Plus } from 'lucide-react';

interface ADEPanelProps {
  layout?: 1 | 2;
}

interface PaneSize {
  id: string;
  size: number;
}

export default function ADEPanel({ layout }: ADEPanelProps) {
  const [panes, setPanes] = useState<string[]>(['1']);
  const [paneSizes, setPaneSizes] = useState<PaneSize[]>([{ id: '1', size: 100 }]);
  const [maximizedPane, setMaximizedPane] = useState<string | null>(null);

  const addPane = () => {
    if (panes.length >= 16) return; // Max 16 panes like Bridge Space
    const newId = (panes.length + 1).toString();
    setPanes([...panes, newId]);
    // Equal distribution for all panes
    const newSize = 100 / (panes.length + 1);
    setPaneSizes([...panes, newId].map(id => ({ id, size: newSize })));
  };

  const removePane = (paneId: string) => {
    const newPanes = panes.filter(p => p !== paneId);
    setPanes(newPanes);
    // Re-distribute sizes equally
    const newSize = newPanes.length > 0 ? 100 / newPanes.length : 100;
    setPaneSizes(newPanes.map(id => ({ id, size: newSize })));
    if (maximizedPane === paneId) {
      setMaximizedPane(null);
    }
  };

  const handleResize = (paneId: string, delta: number) => {
    const paneIndex = paneSizes.findIndex(p => p.id === paneId);
    if (paneIndex === -1 || paneIndex === paneSizes.length - 1) return;

    const newSizes = [...paneSizes];
    const currentSize = newSizes[paneIndex].size;
    const nextSize = newSizes[paneIndex + 1].size;
    
    // Calculate new sizes (in percentage)
    const totalSize = currentSize + nextSize;
    const newSize = Math.max(5, Math.min(95, currentSize + delta * 0.1));
    const newNextSize = totalSize - newSize;

    newSizes[paneIndex].size = newSize;
    newSizes[paneIndex + 1].size = newNextSize;
    setPaneSizes(newSizes);
  };

  const toggleMaximize = (paneId: string) => {
    setMaximizedPane(maximizedPane === paneId ? null : paneId);
  };

  const getGridColumns = () => {
    const count = panes.length;
    if (count === 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-3';
    if (count <= 9) return 'grid-cols-3';
    if (count <= 12) return 'grid-cols-4';
    return 'grid-cols-4';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e]">
      {/* ADE toolbar */}
      <div className="h-8 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-300 font-semibold">ADE</span>
          <span className="text-xs text-gray-500 bg-[#1e1e1e] px-2 py-0.5 rounded">
            {panes.length}/16
          </span>
        </div>
        
        <button
          onClick={addPane}
          disabled={panes.length >= 16}
          className="p-1.5 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Add new ADE pane"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* ADE panes - Grid layout like Bridge Space */}
      <div className="flex-1 p-2 overflow-auto">
        {maximizedPane ? (
          <div className="h-full">
            <ADEPane
              paneId={maximizedPane}
              onClose={() => removePane(maximizedPane)}
              onMaximize={() => toggleMaximize(maximizedPane)}
              isMaximized={true}
            />
          </div>
        ) : (
          <div className={`h-full grid gap-2 ${getGridColumns()}`}>
            {panes.map((paneId) => (
              <div key={paneId} className="h-full min-h-0 relative">
                <ADEPane
                  paneId={paneId}
                  onClose={panes.length > 1 ? () => removePane(paneId) : undefined}
                  onMaximize={() => toggleMaximize(paneId)}
                  isMaximized={false}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
