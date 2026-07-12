"use client";

import { useState } from "react";
import { X, Server, Puzzle, Bot, Shield, Globe, CheckSquare, Monitor, Sparkles, Bell, BookOpen, TextSelect, List, Atom, Languages, Info } from "lucide-react";
import ProvidersSection from "./ProvidersSection";
import ModelsSection from "./ModelsSection";

interface SettingsPageProps {
  onClose: () => void;
}

type SectionId =
  | "models"
  | "providers"
  | "agent-behaviour"
  | "auto-approve"
  | "browser"
  | "checkpoints"
  | "display"
  | "autocomplete"
  | "notifications"
  | "context"
  | "commit-message"
  | "indexing"
  | "experimental"
  | "language"
  | "about";

interface NavItem {
  id: SectionId;
  label: string;
  icon: typeof Server;
}

const NAV_ITEMS: NavItem[] = [
  { id: "models", label: "Models", icon: Server },
  { id: "providers", label: "Providers", icon: Puzzle },
  { id: "agent-behaviour", label: "Agent Behaviour", icon: Bot },
  { id: "auto-approve", label: "Auto-Approve", icon: Shield },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "checkpoints", label: "Checkpoints", icon: CheckSquare },
  { id: "display", label: "Display", icon: Monitor },
  { id: "autocomplete", label: "Autocomplete", icon: Sparkles },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "context", label: "Context", icon: BookOpen },
  { id: "commit-message", label: "Commit Message", icon: TextSelect },
  { id: "indexing", label: "Indexing", icon: List },
  { id: "experimental", label: "Experimental", icon: Atom },
  { id: "language", label: "Language", icon: Languages },
  { id: "about", label: "About", icon: Info },
];

function ComingSoonPlaceholder({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-bee-textMuted">
      <Bot size={40} className="opacity-30 mb-3" />
      <p className="text-sm font-medium text-bee-textDim">{section}</p>
      <p className="text-[10px] mt-1">Coming soon</p>
    </div>
  );
}

export default function SettingsPage({ onClose }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<SectionId>("models");

  const renderSection = () => {
    switch (activeSection) {
      case "models":
        return <ModelsSection />;
      case "providers":
        return <ProvidersSection />;
      default:
        const item = NAV_ITEMS.find((n) => n.id === activeSection);
        return <ComingSoonPlaceholder section={item?.label || activeSection} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
      <div
        className="w-full max-w-4xl h-[80vh] glass-hi rounded-2xl overflow-hidden animate-scale-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-bee-border/50 flex-shrink-0">
          <span className="text-sm font-semibold text-bee-text">Settings</span>
          <div className="flex items-center gap-2">
            {["Local Config", "Global Config", "Reload"].map((label) => (
              <button
                key={label}
                onClick={() => {
                  console.warn(`[Settings] ${label} — reloading page`);
                  window.location.reload();
                }}
                className="px-2.5 py-1 rounded-lg text-[10px] bg-bee-gold/10 border border-bee-gold/20 text-bee-goldHi hover:bg-bee-gold/20 transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-bee-border/60 text-bee-textMuted hover:text-bee-text transition-colors ml-2"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <nav className="w-[220px] flex-shrink-0 border-r border-bee-border/50 overflow-y-auto p-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                    activeSection === item.id
                      ? "bg-bee-gold/10 text-bee-goldHi border border-bee-gold/20"
                      : "text-bee-textDim hover:text-bee-text hover:bg-bee-border/40"
                  }`}
                >
                  <Icon size={14} className="flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 overflow-y-auto p-5">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
