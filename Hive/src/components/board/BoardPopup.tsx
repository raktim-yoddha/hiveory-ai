"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, Clock } from "lucide-react";

type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';

interface Card {
  id: string;
  title: string;
  description: string;
  role: string;
  cli: string;
  column: ColumnId;
  blockedBy?: string;
}

interface Column {
  id: ColumnId;
  title: string;
}

const COLUMNS: Column[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'Todo' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

const COLUMN_ORDER: ColumnId[] = ['backlog', 'todo', 'in-progress', 'review', 'done'];

function nextColumn(col: ColumnId): ColumnId | null {
  const idx = COLUMN_ORDER.indexOf(col);
  return idx < COLUMN_ORDER.length - 1 ? COLUMN_ORDER[idx + 1] : null;
}

function prevColumn(col: ColumnId): ColumnId | null {
  const idx = COLUMN_ORDER.indexOf(col);
  return idx > 0 ? COLUMN_ORDER[idx - 1] : null;
}

const ROLE_DOT: Record<string, string> = {
  builder: 'bg-bee-gold',
  reviewer: 'bg-blue-400',
  scout: 'bg-purple-400',
  coordinator: 'bg-red-400',
};

const SAMPLE_CARDS: Card[] = [
  { id: 'task-1', title: 'Implement OAuth login', description: 'Add Google OAuth2 flow with session management', role: 'builder', cli: 'Claude Code', column: 'backlog' },
  { id: 'task-2', title: 'Set up database schema', description: 'Design and migrate user/project tables', role: 'builder', cli: 'Codex CLI', column: 'todo' },
  { id: 'task-3', title: 'Create API endpoints', description: 'REST API for CRUD operations on projects', role: 'builder', cli: 'Aider', column: 'in-progress', blockedBy: 'Set up database schema' },
];

interface BoardPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BoardPopup({ isOpen, onClose }: BoardPopupProps) {
  const [cards, setCards] = useState<Card[]>(SAMPLE_CARDS);
  const popupRef = useRef<HTMLDivElement>(null);

  const moveCard = (cardId: string, targetCol: ColumnId) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, column: targetCol } : c)),
    );
  };

  const cardsByColumn = (col: ColumnId) => cards.filter((c) => c.column === col);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const id = requestAnimationFrame(() => window.addEventListener("mousedown", handleClick));
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="absolute top-2 right-2 z-50 glass-hi rounded-xl overflow-hidden animate-scale-in"
      style={{ width: "480px", height: "400px" }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-bee-border/50">
        <span className="text-xs font-semibold text-bee-gold uppercase tracking-wider">Kanban Board</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-bee-border/60 text-bee-textMuted hover:text-bee-text transition-colors"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2 p-2 overflow-x-auto h-[calc(100%-36px)]">
        {COLUMNS.map((col) => {
          const colCards = cardsByColumn(col.id);
          return (
            <div key={col.id} className="flex flex-col flex-shrink-0 w-48 glass rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-bee-border/50">
                <span className="text-[10px] font-semibold text-bee-text uppercase tracking-wider">
                  {col.title}
                </span>
                <span className="text-[9px] font-mono text-bee-textMuted bg-bee-border/30 px-1.5 py-0.5 rounded-full">
                  {colCards.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 min-h-0">
                {colCards.length === 0 ? (
                  <div className="text-[10px] text-bee-textMuted text-center py-3 italic">No tasks</div>
                ) : (
                  colCards.map((card) => (
                    <div key={card.id} className="glass-hi rounded-lg p-2 space-y-1.5">
                      <span className="text-[11px] font-medium text-bee-text leading-snug block">
                        {card.title}
                      </span>
                      <p className="text-[9px] text-bee-textMuted leading-relaxed line-clamp-2">
                        {card.description}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium bg-bee-gold/10 text-bee-goldHi border border-bee-gold/20">
                          <span className={`w-1 h-1 rounded-full ${ROLE_DOT[card.role] || 'bg-bee-textMuted'}`} />
                          {card.role}
                        </span>
                        <span className="text-[8px] font-mono text-bee-textMuted">{card.cli}</span>
                      </div>
                      {card.blockedBy && (
                        <div className="flex items-center gap-1 text-[8px] text-bee-warn bg-bee-warn/10 px-1.5 py-0.5 rounded">
                          <Clock size={8} />
                          waiting on: {card.blockedBy}
                        </div>
                      )}
                      <div className="flex items-center gap-1 pt-0.5">
                        {prevColumn(card.column) && (
                          <button onClick={() => moveCard(card.id, prevColumn(card.column)!)}
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-bee-textMuted hover:text-bee-text hover:bg-bee-border/40 transition-colors"
                          >
                            <ChevronRight size={8} className="rotate-180" />
                            {prevColumn(card.column) === 'backlog' ? 'Backlog' : prevColumn(card.column) === 'todo' ? 'Todo' : prevColumn(card.column) === 'in-progress' ? 'In Progress' : 'Review'}
                          </button>
                        )}
                        {nextColumn(card.column) && (
                          <button onClick={() => moveCard(card.id, nextColumn(card.column)!)}
                            className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-bee-textMuted hover:text-bee-text hover:bg-bee-border/40 transition-colors"
                          >
                            {nextColumn(card.column) === 'todo' ? 'Todo' : nextColumn(card.column) === 'in-progress' ? 'In Progress' : nextColumn(card.column) === 'review' ? 'Review' : 'Done'}
                            <ChevronRight size={8} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
