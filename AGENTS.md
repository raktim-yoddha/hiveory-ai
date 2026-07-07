# AGENTS.md — Hiveory v1

This file is the operating manual for any coding agent (Claude Code, Codex CLI, Aider, etc.) working on this repository. Read it fully before writing code. It defines what v1 is, what it is explicitly not, and the rules that keep the codebase coherent as multiple agent sessions touch it over time.

---

## 0. What Hiveory Is (Full Vision, For Context Only)

Hiveory is a local-first, open-source, AI-native dev environment built around one idea: **project intelligence lives in the project, not in a chat session.** The full product has seven modules — Hive, Nectar, HiveMind, QueenBee, WorkerBees, taskComb, HiveSDK. Each is independently usable and composes with the others.

**You are not building the full product.** You are building v1, which is a deliberately small slice. Do not implement HiveMind, QueenBee, taskComb, or HiveSDK. Do not add multi-agent orchestration, role systems, file-ownership locks, or kanban dispatch. If a task seems to require any of those, stop and flag it rather than building a partial version — partial orchestration is worse than no orchestration.

---

## 1. Scope of v1

v1 = **Hive (shell + terminal) + WorkerBees (CLI agent execution) + Nectar (unified project memory)**.

The single outcome v1 must deliver: **a user opens a project, works in a terminal pane that runs any supported CLI coding agent, and that agent automatically reads from and writes to one shared, project-scoped memory store — so switching from Claude Code to Codex CLI to Aider mid-project does not mean starting over.**

That's it. No editor polish beyond "good enough to read/edit files." No 16-pane grid required for v1 — start with 1 and 2-pane layouts, design the layout system so it scales later, but don't build panes 4 through 16 now. No agent-to-agent communication. No task board.

### In scope

- Tauri v2 shell (Next.js App Router + shadcn/ui + Tailwind frontend)
- Terminal panes via `xterm.js` + `xterm-addon-webgl`, backed by `portable-pty` in Rust
- Minimal file explorer + Monaco-based editor (read/write, no advanced Git panel yet — basic status/diff is enough)
- Nectar: `.nectar/` folder structure, SQLite storage, vector + keyword hybrid search, memory injection pipeline
- WorkerBees: launching Claude Code, Codex CLI, Gemini CLI, Aider as child processes inside a pane, with Nectar wired into their stdin/context
- The retrieval-and-write discipline described in §4 below (this is the actual hard part of v1)

### Explicitly out of scope

- HiveMind (agent registry, shared mailbox, task routing, roles, file locks)
- QueenBee (planning/breakdown/assignment)
- taskComb (kanban, drag-to-dispatch)
- HiveSDK (plugins, extensions)
- Multi-agent parallelism of any kind — v1 is one human, one pane, one agent at a time (multiple panes can exist, but they are independent, not coordinated)

---

## 2. Tech Stack for v1

Only pull in what v1 needs. Don't scaffold for later modules.

| Layer          | Choice                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| Shell          | Tauri v2 (Rust)                                                                               |
| Frontend       | Next.js (App Router), shadcn/ui, Tailwind                                                     |
| Frontend state | Zustand (simpler than Jotai for v1's needs); TanStack Query for async                         |
| Terminal       | `xterm.js` + `xterm-addon-webgl` + `xterm-addon-fit` + `xterm-addon-search`                   |
| PTY            | `portable-pty` (Rust), driven via `child_process` bridge                                      |
| Editor         | Monaco (`@monaco-editor/react`)                                                               |
| Storage        | SQLite via `rusqlite` → `nectar.db`                                                           |
| Vector search  | `sqlite-vec` (prefer over `usearch` for v1 — one less native dependency, ships inside SQLite) |
| Keyword search | SQLite `FTS5`                                                                                 |
| Memory parsing | `gray-matter` + `remark`/`unified` for the markdown memory files                              |
| Git            | `simple-git` (basic status/diff only for v1)                                                  |
| Monorepo       | `pnpm` workspaces + Turborepo                                                                 |
| Testing        | Vitest (unit), Playwright + `tauri-driver` (e2e)                                              |

Do not add HiveMind's event bus (`EventEmitter`/WebSocket), `dnd-kit`, or any kanban dependency in v1.

---

## 3. Repo Structure for v1

```
hiveory/
├── Hive/                          # Tauri app (Next.js frontend + Rust backend)
│   ├── src/                       # Next.js frontend
│   │   ├── app/
│   │   ├── components/
│   │   │   ├── editor/            # Monaco wrapper, file explorer
│   │   │   └── terminal/          # xterm panes, layout grid (1/2 only for v1)
│   │   ├── stores/                # Zustand stores
│   │   └── lib/
│   └── src-tauri/                 # Rust: PTY management, filesystem, Nectar IPC bridge
│
├── Nectar/                        # Standalone package — must work independent of Hive
│   ├── src/
│   │   ├── db/                    # rusqlite or Node-side sqlite bindings, schema, migrations
│   │   ├── memory/                # read/write .nectar/memory/*.md
│   │   ├── search/                # hybrid retrieval (vector + FTS5 + ranking)
│   │   ├── injection/             # context assembly — see §4
│   │   └── index.ts               # public API
│   └── tests/
│
├── WorkerBees/                    # CLI agent adapters
│   ├── src/
│   │   ├── adapters/              # one file per agent: claude-code.ts, codex.ts, aider.ts, gemini.ts
│   │   ├── launcher.ts            # spawns process in a pane, wires Nectar hooks
│   │   └── index.ts
│   └── tests/
│
├── .nectar/                       # created per-project at runtime, not committed here
├── pnpm-workspace.yaml
└── turbo.json
```

`Nectar` and `WorkerBees` must each build and be tested standalone, without Hive running. If a change to either module requires the desktop app to be running to test it, that's a design smell — fix the boundary.

---

## 4. Nectar: The Part That Actually Matters in v1

Everything else in v1 is scaffolding around this. Get this wrong and the product has no reason to exist.

### 4.1 Structure on disk

```
.nectar/
├── memory/
│   ├── project.md          # what this project is, high-level
│   ├── architecture.md     # system design, module boundaries
│   ├── decisions.md        # ADR-style log, append-only by convention
│   ├── conventions.md      # coding style, naming, patterns the project follows
│   ├── patterns.md         # recurring solutions, "how we do X here"
│   ├── bugs.md              # known issues, footguns, past bugs and their fixes
│   └── knowledge.md        # anything that doesn't fit the above
├── agents/
│   ├── sessions/            # one file per agent session, timestamped
│   ├── summaries/           # compressed session outcomes
│   └── handoffs.md          # what the last agent left for the next one
├── tasks/
│   └── state.md
├── index/                    # vector + FTS5 index artifacts, gitignored
└── nectar.db                 # SQLite: metadata, embeddings, FTS5 tables
```

Every file in `memory/` and `agents/` is plain markdown, human-readable, git-diffable. `nectar.db` and `index/` are derived/rebuildable and should be gitignored — they are a cache over the markdown, never the source of truth. If `nectar.db` is deleted, re-indexing the markdown files must fully reconstruct it.

### 4.2 The retrieval discipline — "efficient, not dumb"

This is the specific thing the user called out: **the terminal must force every CLI agent invocation through Nectar retrieval, and that retrieval must be small, ranked, and relevant — never a full-context dump.**

Concretely:

1. **Never inject whole files.** Memory files can grow large. Injection pulls ranked _chunks_ (paragraph/section-level, produced at write-time — see 4.3), not entire documents.
2. **Hybrid retrieval, always both signals.** Every query runs vector similarity (`sqlite-vec`) AND keyword match (`FTS5`) against the chunk index, then merges with a ranking function (start simple: reciprocal rank fusion of the two result sets). Don't ship vector-only or keyword-only — either alone misses cases the other catches.
3. **Query construction is the agent's job, not the user's.** Before a WorkerBee process starts (or before each turn, for agents that support it), the launcher builds a retrieval query from: the task/prompt text, the current open file(s), and recent git diff — not just the raw user prompt. This is what makes it "not dumb": the system infers what's relevant instead of relying on the human to describe it.
4. **Hard cap on injected context.** Define a token budget (config value, sane default ~2-4k tokens of injected memory) and truncate by rank, not by file order. If nothing clears a minimum relevance threshold, inject nothing — an empty injection is better than noise.
5. **Every injection is logged**, not just used silently: write which chunks were retrieved and their scores to `agents/sessions/<timestamp>.md`. This is what lets `decisions.md` and `bugs.md` stay honest over time and lets a human audit why an agent did something.
6. **Writes are structured, not free-form dumps.** When a WorkerBee session ends (or at defined checkpoints), the adapter prompts the underlying agent to emit a structured summary (what changed, why, any decision worth recording) and Nectar routes that into the correct memory file — a bug fix goes to `bugs.md`, an architectural choice to `decisions.md`, etc. Don't append raw transcripts to memory files; that recreates the "dumb full-context" problem on the write side.
7. **Model-agnostic injection.** The injection layer produces plain text/markdown context blocks, not a format tied to one agent's API. Each adapter in `WorkerBees/adapters/` is responsible for translating that block into whatever that specific CLI expects (system prompt, `--context` flag, stdin prefix, etc.).

### 4.3 Indexing pipeline

```
memory file saved → chunk (by heading/paragraph) → embed → upsert into sqlite-vec
                                                  → upsert into FTS5 table
                                                  → update nectar.db metadata (source file, chunk range, timestamp)
```

Re-chunking should be incremental (only re-index the file that changed), not a full project re-index on every save.

### 4.4 What "unified memory, swap any model" means concretely

The user's core v1 requirement is: change WorkerBee (Claude Code → Codex → Aider) mid-project without losing context. This works because:

- Memory lives in `.nectar/`, keyed to the project, never to a specific agent or session.
- Every adapter goes through the same `Nectar` retrieval/injection API — no adapter gets a special/richer path.
- No adapter is allowed to write directly to `.nectar/db` or the markdown files — all writes go through `nectar`'s structured-write API in §4.2 point 6, so the schema stays consistent regardless of which CLI produced the content.

If you're implementing a new adapter and you find yourself reaching for something outside the shared `nectar` API to get "better" results for that one agent, stop — that breaks the unification guarantee and defeats the point of v1.

---

## 5. WorkerBees for v1

- Support, in this order: Claude Code, Codex CLI, Aider, Gemini CLI. Local models are stretch, not required for v1.
- Each adapter implements one interface (define this early, in `WorkerBees/src/adapters/types.ts`): `launch(pane, task, nectarContext) → process handle`, `onOutput`, `onSessionEnd(summary) → routes to Nectar`.
- A WorkerBee is launched by opening a terminal pane and running the CLI directly — the human can still type into that pane like a normal terminal. Nectar injection happens at process launch (as an initial context block) and, where the CLI supports it, at each new turn. Don't build a hidden abstraction that hides the terminal from the user — transparency of what's actually running is part of the product's trust model.

---

## 6. Hive (Shell) for v1

- Two sidebar modes as in the full spec (Code Editor / Terminals), but Terminals mode only needs 1 and 2-pane layouts for v1. Build the layout component so adding grid sizes later is a config change, not a rewrite.
- Editor mode needs: file tree, Monaco open/edit/save, inline single terminal, basic git status/diff. No git panel with staging/commit UI yet unless trivial.
- No settings/preferences system beyond what's needed to pick a default WorkerBee and a token budget for Nectar injection.

---

## 7. Non-Goals to Actively Resist

Agents working on this repo will be tempted to "future-proof" toward the full seven-module vision. Resist this:

- No event bus / message passing between agents — there's only one agent per pane in v1.
- No task/kanban state beyond what's needed for the human to track their own work manually.
- No role system, no file-ownership locking — irrelevant when only one agent runs at a time.
- No plugin/extension API.

If a PR or task touches any of these, it's out of scope for v1 — flag it rather than building it.

---

## 8. Definition of Done for v1

v1 is done when someone can:

1. Open a project folder in Hive.
2. Open a terminal pane, launch Claude Code, ask it to do something involving the codebase, and see Nectar-relevant memory get pulled in automatically (visible in session logs) without them manually pasting context.
3. Close that session, open a new pane, launch Aider instead, and have it pick up relevant decisions/conventions from the same project — recorded by Claude Code in the previous session — without the user re-explaining anything.
4. Inspect `.nectar/memory/*.md` and see it's readable, sensible, and git-diffable.
5. Delete `nectar.db` and `.nectar/index/`, re-run indexing, and get the same retrieval behavior back from the markdown alone.

If all five hold, v1 is complete. Everything else is v2+.