"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Settings, Pin, PinOff, ExternalLink } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useProviderStore } from "@/stores/providerStore";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

type QueenBeeMode = "Steward" | "Forager" | "Stinger";

const MODE_LABELS: Record<QueenBeeMode, string> = {
  Steward: "Steward",
  Forager: "Forager",
  Stinger: "Stinger",
};

const MODE_BADGES: Record<QueenBeeMode, string> = {
  Steward: "📋",
  Forager: "🔎",
  Stinger: "⚡",
};

function detectModeIntent(text: string): QueenBeeMode | null {
  const lower = text.toLowerCase();
  const stewardKeywords = ["plan", "build", "feature", "implement", "create", "task", "breakdown", "workerbee", "dispatch", "summarize", "what's done", "hello", "hi", "hey", "help", "what", "how"];
  const foragerKeywords = ["bug", "review", "wrong", "fix", "error", "issue", "problem", "broken", "crash", "defect"];
  const stingerKeywords = ["security", "vulnerability", "hack", "exploit", "injection", "xss", "sql", "auth", "password", "token", "secret", "unsafe"];

  const scores = {
    Steward: stewardKeywords.filter(k => lower.includes(k)).length,
    Forager: foragerKeywords.filter(k => lower.includes(k)).length,
    Stinger: stingerKeywords.filter(k => lower.includes(k)).length,
  };

  if (scores.Steward === 0 && scores.Forager === 0 && scores.Stinger === 0) return null;

  if (scores.Forager > scores.Steward && scores.Forager >= scores.Stinger) return "Forager";
  if (scores.Stinger > scores.Steward && scores.Stinger >= scores.Forager) return "Stinger";
  return "Steward";
}

const MODE_SYSTEM_PROMPTS: Record<QueenBeeMode, string> = {
  Steward: `You are QueenBee Steward — the strategic layer of Hiveory. Your ONLY job is to plan, break down goals, and dispatch WorkerBees (Claude Code, Codex CLI, Aider, etc.) to execute the actual work. You NEVER write code, edit a file, or touch a terminal directly — that is what WorkerBees are for. Even a one-line fix goes through a WorkerBee. This rule cannot be overridden.

Character: Decisive, brief, allocates rather than explains. Don't narrate your reasoning at length — state the plan, state the assignment, move on.

Workflow:
1. Listen — parse the goal. If genuinely ambiguous, ask one batched clarifying question — never more than one round before proposing a plan.
2. Read Nectar first — architecture.md + conventions.md via nectar_query. A breakdown proposed without this step is invalid.
3. Break down — task list, each with owns/reads/depends-on, shown as draft cards. Flag overlapping owns as a sequencing dependency.
4. Assign — propose CLI + role per task (Builder by default; Scout first if scope is unclear). Human can edit any assignment before dispatch.
5. Confirm — show the plan and get human approval before any dispatch. "Just build it" still gets the plan shown once first.
6. Dispatch — hand off to HiveMind. Steward's involvement pauses here.
7. Track — watch TaskComb status via HiveMind's reporting, not by polling WorkerBee panes directly.
8. Summarize — on mission completion: what shipped, what changed, what's still open. Terse — a changed-files list and one-line outcome per task.

Hard rule: If asked to write code, edit a file, or run a command — refuse and dispatch a WorkerBee instead. No exceptions for task size.`,

  Forager: `You are QueenBee Forager — an autonomous bug-hunter. Unlike HiveMind's task-scoped Reviewer role (which diffs one WorkerBee's branch before merge), Forager has no assigned task. It picks its own targets.

Character: Restless. Read code like a hostile reviewer — assume something's wrong until you check. Ask pointed, specific questions ("what happens if userId is null here?" not "is this code good?"). Comfortable saying nothing found — don't manufacture findings to look busy.

Activation: Explicit ("scan the codebase") or proactive — a mission reaching Done in TaskComb, or a fresh unreviewed git diff. On proactive trigger, announce yourself before scanning.

Workflow:
1. Pick a target — prioritize: (a) uncommitted/unreviewed diff, (b) most recently merged mission's changed files, (c) module-by-module sweep, one per pass.
2. Scan — check for null/undefined handling, off-by-one, error paths that silently swallow, algorithmic inefficiency, dead code, logic contradicting comments/tests.
3. Probe — where intent is unclear, ask the specific question rather than guessing. A probe is not a finding.
4. Report — findings in the fixed format below.
5. Redirect — if asked to build or fix, don't do the work yourself and don't silently switch — state it belongs in Steward mode and offer to hand off.

Finding format:
[TYPE] file:line · issue (≤12 words) · suggested fix (≤12 words)
TYPE ∈ BUG (will misbehave) / LOGIC (wrong result, no crash) / PERF (inefficiency) / CODEQL (quality, no functional risk).
Sort by TYPE: BUG > LOGIC > PERF > CODEQL. End of scan: "N findings — B bugs / L logic / P perf / C quality."

Memory: Findings write to .nectar/memory/code-review.md. New audits diff against last run — report only new/still-open, state resolved-count separately.

Conversational fallback: You can still chat about the code normally — proactive scanning is your default, not your only behavior.`,

  Stinger: `You are QueenBee Stinger — a specialized security auditor. You are paranoid by design: every input is attacker-controlled until proven otherwise; the codebase is guilty until it demonstrates innocence.

Personality: Terse. Findings first, praise never. Speak in severity → location → exploit → fix, always in that order. Refuse to rubber-stamp — if a check can't be verified, say so.

On first activation in a project, build a tech profile (frontend/backend/auth/database/payments/deploy target) by reading the repo or asking the user once. This profile determines which checks apply.

## The Five Checks (SEC-01–SEC-05)

SEC-01 — Secret Leak Prevention: No secrets as string literals. Stack-aware (Supabase anon key needs RLS on every table, service-role key never in client code, Stripe publishable vs secret key, DB connection strings env-only). Frontend env vars with NEXT_PUBLIC_/REACT_APP_ are browser-visible — flag sensitive ones. .env in .gitignore, .env.example exists. console.log/error handlers/API responses don't echo secrets. Secrets once hardcoded are still in git history — flag for rotation.

SEC-02 — Personal Data Flow Audit: Map every PII collection point → where it goes. Logs/errors scrubbed of PII. Third-party SDKs: list what user data is sent; strip what they don't need. Passwords: bcrypt/argon2/scrypt only. Cookies: httpOnly, secure, sameSite. PII never in localStorage. API responses: field-level filtering, never over-return. Account/data deletion path exists.

SEC-03 — Pre-Deploy Production Audit: Every required env var fails loud if missing. Debug code removed (console.log, commented blocks, test routes). Client errors: generic message + correlation ID only — no stack traces. Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, CSP. Auth endpoints rate-limited (5/min/IP login, 3/hr reset). CORS not wildcard. DB connection TLS in production.

SEC-04 — Deep Logic Audit: Every protected route has real middleware, not UI hiding. No IDOR. Password-reset tokens: random, single-use, ≤15min expiry. JWTs: strong secret, expiry, blacklist on logout. Payment logic (skip if no payment processor): server recalculates price — never trusts client-sent totals. Webhook signatures verified. Input handling: parameterized queries, sanitized output, file uploads validated server-side.

SEC-05 — Attacker's-Perspective Review: ID manipulation, auth bypass, privilege escalation, feature abuse (rate limits), content injection (XSS/SQLi), internal exposure (debug endpoints, .env reachable), business-logic abuse (negative amounts, infinite discount stacking, self-referral).

## Finding format
[SEV] SEC-ID · file:line · issue (≤12 words) · fix (≤12 words)
SEV ∈ CRIT/HIGH/MED/LOW. Sort CRIT→LOW, grouped by SEC-ID. CRIT findings get one extra line naming the concrete exploit.

## Workflow
1. Audit — run relevant SEC checks, produce findings.
2. Plan — propose QueenBee-style task breakdown for findings the user wants acted on.
3. Confirm — user approves the plan.
4. Dispatch — hand approved tasks to HiveMind. Never dispatch WorkerBees on your own.

## Hard rules
- Never downgrade/delete a finding to make an audit look cleaner.
- Never invent findings to look thorough — empty sections stay empty.
- Standing disclaimer: "Not a substitute for professional security review."
- Proactively suggest re-running SEC-05 after security fixes land.`,
};

interface QueenBeeChatProps {
  docked?: boolean;
  onToggleDock?: () => void;
}

export default function QueenBeeChat({ docked, onToggleDock }: QueenBeeChatProps) {
  const [activeMode, setActiveMode] = useState<QueenBeeMode>("Steward");
  const welcomeText: Record<QueenBeeMode, string> = {
    Steward: "I'm QueenBee Steward. Tell me what you want to build and I'll dispatch WorkerBees to execute the work.",
    Forager: "I'm QueenBee Forager. I'll proactively scan the codebase for bugs and issues.",
    Stinger: "I'm QueenBee Stinger. I'll audit your code for security vulnerabilities.",
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: welcomeText.Steward,
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const queenbeeModel = useSettingsStore((s) => s.queenbeeModel);
  const setQueenbeeModel = useSettingsStore((s) => s.setQueenbeeModel);
  const availableModels = useProviderStore((s) => s.availableModels);
  const providers = useProviderStore((s) => s.providers);
  const hasConnectedProviders = providers.some((p) => p.verified && p.enabled);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const findProviderForModel = () => {
    const modelEntry = availableModels.find((m) => m.model === queenbeeModel);
    if (modelEntry) {
      const p = providers.find((pr) => pr.id === modelEntry.providerId);
      return p || null;
    }
    const knownMap: Record<string, string> = {
      "anthropic": "anthropic",
      "openai": "openai",
      "google": "google",
      "opencode": "opencode",
      "openrouter": "openrouter",
    };
    const prefix = queenbeeModel.split("/")[0];
    const knownId = knownMap[prefix];
    if (knownId) {
      return providers.find((p) => p.id === knownId) || null;
    }
    return providers.find((p) => p.apiKey) || providers[0] || null;
  };

  const callApi = async (message: string): Promise<string> => {
    const provider = findProviderForModel();
    const apiKey = provider?.apiKey || "";
    const providerId = provider?.id || "unknown";

    if (!apiKey) {
      return `[${activeMode}] No API key configured for model "${queenbeeModel}". Connect a provider in Settings.`;
    }

    const history = messages
      .filter(m => m.id !== "welcome")
      .slice(-10)
      .map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));

    const systemPrompt = MODE_SYSTEM_PROMPTS[activeMode];

    try {
      console.log(`[QueenBee/${activeMode}] Calling provider=${providerId} model=${queenbeeModel}`);

      const isAnthropic = provider?.apiType === "anthropic-messages";
      const baseUrl = provider?.baseUrl?.replace(/\/+$/, "") || "";

      if (isAnthropic) {
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: queenbeeModel.replace("anthropic/", ""),
            system: systemPrompt,
            messages: [...history, { role: "user", content: message }],
            max_tokens: 1000,
          }),
        });
        const data = await resp.json();
        return data?.content?.[0]?.text || `[${activeMode}] No response from model.`;
      }

      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(provider?.headers || {}),
        },
        body: JSON.stringify({
          model: queenbeeModel.includes("/") ? queenbeeModel.split("/").slice(1).join("/") : queenbeeModel,
          messages: [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message },
          ],
          max_tokens: 1000,
        }),
      });
      const data = await resp.json();
      console.log(`[QueenBee/${activeMode}] Response received:`, data?.choices?.[0]?.message?.content?.slice(0, 80));
      return data?.choices?.[0]?.message?.content || `[${activeMode}] No response from model.`;
    } catch (e: any) {
      console.error(`[QueenBee/${activeMode}] API error:`, e);
      return `[${activeMode}] Error: ${e?.message || "API call failed"}`;
    }
  };

  const handleModeSwitch = (newMode: QueenBeeMode) => {
    setActiveMode(newMode);
    setShowModeMenu(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || thinking) return;

    const userText = inputValue.trim();

    const detectedMode = detectModeIntent(userText);
    if (detectedMode && detectedMode !== activeMode) {
      setActiveMode(detectedMode);
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      text: userText,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setThinking(true);

    const responseText = await callApi(userMsg.text);

    const agentMsg: Message = {
      id: `msg-${Date.now()}-resp`,
      text: responseText,
      sender: "agent",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, agentMsg]);
    setThinking(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full w-full glass-hi border-l border-bee-border/60 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-bee-border/50 relative">
        <div className="relative">
          <button
            onClick={() => setShowModeMenu(!showModeMenu)}
            className="flex items-center gap-1.5 text-xs font-semibold text-bee-gold hover:text-bee-goldHi transition-colors"
          >
            QueenBee
            <span className="text-[9px] opacity-70">▼</span>
          </button>
          {showModeMenu && (
            <div className="absolute left-0 top-full mt-1 glass-hi rounded-lg z-50 min-w-40 p-1 animate-fade-in">
              {(["Steward", "Forager", "Stinger"] as QueenBeeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleModeSwitch(mode)}
                  className={`w-full px-2.5 py-1.5 text-left text-xs rounded-md transition-colors ${
                    activeMode === mode
                      ? "bg-bee-gold/10 text-bee-goldHi"
                      : "text-bee-textDim hover:text-bee-text hover:bg-bee-border/40"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-bee-textMuted font-mono">{activeMode}</span>
          <button
            onClick={onToggleDock}
            className="p-1 rounded-md hover:bg-bee-border/60 text-bee-textMuted hover:text-bee-text transition-colors"
            title={docked ? "Switch to floating overlay" : "Dock to side"}
          >
            {docked ? <PinOff size={12} /> : <Pin size={12} />}
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-1 rounded-md hover:bg-bee-border/60 text-bee-textMuted hover:text-bee-text transition-colors"
            title="QueenBee model config"
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="px-3 py-2 border-b border-bee-border/50 bg-bee-canvas/40 space-y-2">
          {!hasConnectedProviders ? (
            <div className="text-[10px] text-bee-textMuted space-y-2">
              <p>No providers connected.</p>
              <a
                onClick={() => {}}
                className="inline-flex items-center gap-1 text-bee-gold hover:text-bee-goldHi transition-colors cursor-pointer"
              >
                <ExternalLink size={10} />
                Connect a provider in Settings
              </a>
            </div>
          ) : availableModels.length === 0 ? (
            <div className="text-[10px] text-bee-textMuted">
              <p>Connected providers have no models.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-bee-textMuted uppercase tracking-wider">Model</label>
              <select
                value={queenbeeModel}
                onChange={(e) => setQueenbeeModel(e.target.value)}
                className="bg-bee-canvas/70 border border-bee-border rounded px-2 py-1 text-[10px] text-bee-text outline-none focus:ring-1 focus:ring-bee-gold transition-colors"
              >
                {availableModels.map((m) => (
                  <option key={`${m.providerId}-${m.model}`} value={m.model}>
                    {m.model} ({m.providerName})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="text-[8px] text-bee-textMuted">
            Model: {queenbeeModel} — this powers QueenBee's own reasoning; WorkerBees use their own models
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                msg.sender === "user"
                  ? "bg-bee-gold/15 text-bee-text border border-bee-gold/20"
                  : "glass text-bee-textDim"
              }`}
            >
              <div className="text-[10px] text-bee-textMuted mb-0.5">
                {msg.sender === "user" ? "You" : `🐝→${MODE_BADGES[activeMode]} ${activeMode}:`}
                <span className="ml-1.5 opacity-60">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="leading-relaxed">{msg.id === "welcome" ? welcomeText[activeMode] : msg.text}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-2 border-t border-bee-border/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeMode}…`}
            className="flex-1 bg-bee-canvas/70 border border-bee-border rounded-lg px-3 py-1.5 text-xs text-bee-text placeholder-bee-textMuted outline-none focus:ring-1 focus:ring-bee-gold transition-colors"
          />
          {thinking ? (
            <div className="flex items-center justify-center p-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-bee-gold border-t-transparent animate-spin" />
            </div>
          ) : (
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center p-1.5 rounded-lg bg-bee-gold/10 border border-bee-gold/20 text-bee-goldHi hover:bg-bee-gold/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
