import { useEffect, useRef, useState } from 'react';
import type { ColumnId, TaskCard } from '../board.js';
import { DEFAULT_COLUMNS, Board, COLUMNS } from '../board.js';
import { groupTasksByColumn } from './taskcomb-worktree-groups.js';
import { useTaskCombSelection } from './use-taskcomb-selection.js';
import { useTaskCombCardPointerDrag } from './use-taskcomb-card-pointer-drag.js';
import TaskCombLaneGrid from './TaskCombLaneGrid.js';
import TaskCombDrawerHeader from './TaskCombDrawerHeader.js';

const BOARD_COLUMN_WIDTH_DEFAULT = 280;

export interface TaskCombDrawerProps {
  open: boolean;
  dragPreview?: boolean;
  tasks: TaskCard[];
  onTasksChange: (tasks: TaskCard[]) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export default function TaskCombDrawer({
  open, dragPreview, tasks, onTasksChange, onClose, style,
}: TaskCombDrawerProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(BOARD_COLUMN_WIDTH_DEFAULT);

  const columns = DEFAULT_COLUMNS;
  const tasksByColumn = groupTasksByColumn(tasks, columns);
  const allTaskIds = tasks.map((t) => t.id);

  const { selectedIds, selectedCount, clearSelection, handleGesture } = useTaskCombSelection(allTaskIds);

  const handleDrop = (taskIds: string[], targetColumn: ColumnId, targetIndex?: number) => {
    const updated = tasks.map((t) => {
      if (taskIds.includes(t.id)) {
        return { ...t, column: targetColumn, sortOrder: targetIndex !== undefined ? targetIndex + taskIds.indexOf(t.id) : t.sortOrder };
      }
      return t;
    });
    onTasksChange(updated);
  };

  const { onPointerDownCapture } = useTaskCombCardPointerDrag(handleDrop);

  const handleCardClick = (e: React.MouseEvent, taskId: string) => handleGesture(e, taskId);

  const handleAddTask = (colId: ColumnId) => {
    const newTask: TaskCard = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'New task',
      description: '',
      column: colId,
      sortOrder: tasks.length,
      owns: [], reads: [], dependsOn: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    onTasksChange([...tasks, newTask]);
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if ((e.target as HTMLElement).closest('[role="menu"]') || (e.target as HTMLElement).closest('[role="dialog"]')) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (boardRef.current && !boardRef.current.contains(e.target as Node)) {
        const t = e.target as HTMLElement;
        if (t.closest('[data-workspace-board-trigger]') || t.closest('[role="menu"]') || t.closest('[role="dialog"]')) return;
        onClose();
      }
    };
    const id = requestAnimationFrame(() => window.addEventListener('mousedown', handleClick));
    return () => { cancelAnimationFrame(id); window.removeEventListener('mousedown', handleClick); };
  }, [open, onClose]);

  useEffect(() => { if (open) clearSelection(); }, [open, clearSelection]);

  if (!open && !dragPreview) return null;

  return (
    <div ref={boardRef} data-workspace-board-selection-surface
      data-workspace-board-drag-preview={dragPreview ? 'true' : undefined}
      className="taskcomb-sheet-content absolute z-50 flex flex-col overflow-hidden"
      style={{
        top: '36px', bottom: 0,
        left: style?.left ?? '0px',
        width: style?.width ?? 'min(calc(100vw - 48px), 1080px)',
        background: 'rgb(36 31 28 / 0.92)',
        backdropFilter: 'blur(18px) saturate(1.08)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.08)',
        borderRight: '1px solid rgba(61, 46, 31, 0.65)',
        boxShadow: 'inset 1px 0 0 rgba(61,46,31,0.8), 4px 0 24px rgba(0,0,0,0.4)',
        opacity: dragPreview ? '0.42' : '1',
        pointerEvents: dragPreview ? 'none' : 'auto',
        ...style,
      }}
    >
      <TaskCombDrawerHeader selectedCount={selectedCount} onClose={onClose} />
      {tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-[11px] text-bee-textMuted italic">No tasks — create one to start tracking</div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <TaskCombLaneGrid columns={columns} tasksByColumn={tasksByColumn}
            selectedIds={selectedIds} columnWidth={columnWidth} onCommitWidth={setColumnWidth}
            onCardPointerDownCapture={onPointerDownCapture} onCardClick={handleCardClick} onAddTask={handleAddTask} />
        </div>
      )}
    </div>
  );
}
