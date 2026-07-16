import { describe, it, expect, vi } from "vitest";
import { executeTool, toolsForMode, ToolError, ASYNC_TOOLS, type ToolContext } from "./queenbeeTools";

function ctx(over: Partial<ToolContext> = {}): ToolContext {
  return {
    createWorkspace: vi.fn(() => "ws-1"),
    listWorkspaces: vi.fn(() => [{ id: "ws-1", name: "Default" }]),
    addTask: vi.fn(),
    listTasks: vi.fn(() => [{ id: "t-1", title: "A", column: "todo" }]),
    moveTask: vi.fn(() => true),
    launchWorkerBee: vi.fn(),
    setBoardOpen: vi.fn(),
    openSettings: vi.fn(() => true),
    ...over,
  };
}

describe("queenbeeTools mode gating", () => {
  it("Steward gets mutating tools; Forager/Stinger do not", () => {
    expect(toolsForMode("Steward").some((t) => t.mutates)).toBe(true);
    expect(toolsForMode("Forager").every((t) => !t.mutates)).toBe(true);
    expect(toolsForMode("Stinger").every((t) => !t.mutates)).toBe(true);
  });

  it("read-only mode cannot call a mutating tool", () => {
    expect(() => executeTool("Forager", "add_task", { title: "x" }, ctx())).toThrow(ToolError);
  });
});

describe("executeTool", () => {
  it("creates a workspace", () => {
    const c = ctx();
    expect(executeTool("Steward", "create_workspace", { name: "New" }, c)).toContain("New");
    expect(c.createWorkspace).toHaveBeenCalledWith("New");
  });

  it("rejects missing required args", () => {
    expect(() => executeTool("Steward", "add_task", {}, ctx())).toThrow(/Missing required/);
  });

  it("rejects an invalid column", () => {
    expect(() => executeTool("Steward", "move_task", { taskId: "t-1", column: "nope" }, ctx())).toThrow(/Invalid column/);
  });

  it("surfaces a missing task on move", () => {
    expect(() => executeTool("Steward", "move_task", { taskId: "zzz", column: "done" }, ctx({ moveTask: () => false }))).toThrow(/No task found/);
  });

  it("Forager may read the board", () => {
    expect(executeTool("Forager", "list_tasks", {}, ctx())).toContain("A");
  });

  it("opens settings", () => {
    const c = ctx();
    expect(executeTool("Steward", "open_settings", {}, c)).toContain("Opened");
    expect(c.openSettings).toHaveBeenCalled();
  });

  it("reports when settings cannot be opened", () => {
    expect(executeTool("Steward", "open_settings", {}, ctx({ openSettings: () => false }))).toContain("can't");
  });

  it("refuses async tools — the host must run them", () => {
    for (const name of ASYNC_TOOLS) {
      expect(() => executeTool("Steward", name, { goal: "x", path: "p", query: "q" }, ctx())).toThrow(/must be executed by the host/);
    }
  });
});

describe("read-only memory tools", () => {
  it("are available to every mode (auditors must read memory)", () => {
    for (const mode of ["Steward", "Forager", "Stinger"] as const) {
      const names = toolsForMode(mode).map((t) => t.name);
      expect(names).toContain("search_memory");
      expect(names).toContain("read_memory_file");
      expect(names).toContain("list_memory_files");
    }
  });

  it("dispatch_goal stays Steward-only", () => {
    expect(toolsForMode("Forager").map((t) => t.name)).not.toContain("dispatch_goal");
    expect(toolsForMode("Steward").map((t) => t.name)).toContain("dispatch_goal");
  });
});
