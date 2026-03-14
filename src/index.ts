import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DOMAIN = process.env.KANBANTOOL_DOMAIN;
const TOKEN = process.env.KANBANTOOL_API_TOKEN;

if (!DOMAIN || !TOKEN) {
  console.error("Missing required environment variables: KANBANTOOL_DOMAIN, KANBANTOOL_API_TOKEN");
  process.exit(1);
}

const BASE_URL = `https://${DOMAIN}.kanbantool.com/api/v3`;

async function apiRequest(path: string, method = "GET", body?: object): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KanbanTool API error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

const server = new McpServer({
  name: "kanbantool",
  version: "1.0.0",
});

// ── get_tasks ────────────────────────────────────────────────────────────────

server.tool(
  "get_tasks",
  "Get all tasks for a specific board",
  {
    board_id: z.number().describe("The board ID"),
    swimlane_id: z.number().optional().describe("Filter by swimlane ID"),
    workflow_stage_id: z.number().optional().describe("Filter by workflow stage ID"),
  },
  async ({ board_id, swimlane_id, workflow_stage_id }) => {
    const params = new URLSearchParams({ board_id: String(board_id) });
    if (swimlane_id) params.set("swimlane_id", String(swimlane_id));
    if (workflow_stage_id) params.set("workflow_stage_id", String(workflow_stage_id));

    const data = await apiRequest(`/tasks/search.json?${params}`);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── get_workflow_states ──────────────────────────────────────────────────────

server.tool(
  "get_workflow_states",
  "Get all workflow stages (columns) for a specific board",
  {
    board_id: z.number().describe("The board ID"),
  },
  async ({ board_id }) => {
    const data = await apiRequest(`/boards/${board_id}.json`) as { workflow_stages?: unknown };
    const stages = data?.workflow_stages ?? data;
    return { content: [{ type: "text", text: JSON.stringify(stages, null, 2) }] };
  }
);

// ── get_swimlanes ────────────────────────────────────────────────────────────

server.tool(
  "get_swimlanes",
  "Get all swimlanes for a specific board",
  {
    board_id: z.number().describe("The board ID"),
  },
  async ({ board_id }) => {
    const data = await apiRequest(`/boards/${board_id}.json`) as { swimlanes?: unknown };
    const swimlanes = data?.swimlanes ?? data;
    return { content: [{ type: "text", text: JSON.stringify(swimlanes, null, 2) }] };
  }
);

// ── create_task ──────────────────────────────────────────────────────────────

server.tool(
  "create_task",
  "Create a new task on a board in a specific swimlane and workflow state",
  {
    board_id: z.number().describe("The board ID"),
    name: z.string().describe("Task title"),
    swimlane_id: z.number().describe("The swimlane ID to place the task in"),
    workflow_stage_id: z.number().describe("The workflow stage (column) ID to place the task in"),
    description: z.string().optional().describe("Task description"),
    due_date: z.string().optional().describe("Due date in YYYY-MM-DD format"),
    priority: z.number().int().min(0).max(3).optional().describe("Priority: 0=none, 1=low, 2=medium, 3=high"),
  },
  async ({ board_id, name, swimlane_id, workflow_stage_id, description, due_date, priority }) => {
    const body: Record<string, unknown> = { board_id, name, swimlane_id, workflow_stage_id };
    if (description !== undefined) body.description = description;
    if (due_date !== undefined) body.due_date = due_date;
    if (priority !== undefined) body.priority = priority;

    const data = await apiRequest("/tasks.json", "POST", body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── move_task ────────────────────────────────────────────────────────────────

server.tool(
  "move_task",
  "Move a task to a different swimlane and/or workflow state",
  {
    task_id: z.number().describe("The task ID"),
    swimlane_id: z.number().optional().describe("Target swimlane ID"),
    workflow_stage_id: z.number().optional().describe("Target workflow stage (column) ID"),
  },
  async ({ task_id, swimlane_id, workflow_stage_id }) => {
    if (!swimlane_id && !workflow_stage_id) {
      return { content: [{ type: "text", text: "Error: provide at least one of swimlane_id or workflow_stage_id" }], isError: true };
    }

    const body: Record<string, unknown> = {};
    if (swimlane_id) body.swimlane_id = swimlane_id;
    if (workflow_stage_id) body.workflow_stage_id = workflow_stage_id;

    const data = await apiRequest(`/tasks/${task_id}.json`, "PATCH", body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── modify_task ──────────────────────────────────────────────────────────────

server.tool(
  "modify_task",
  "Modify a task's description, due date, and/or priority",
  {
    task_id: z.number().describe("The task ID"),
    name: z.string().optional().describe("New task title"),
    description: z.string().optional().describe("New description"),
    due_date: z.string().optional().describe("New due date in YYYY-MM-DD format, or empty string to clear"),
    priority: z.number().int().min(0).max(3).optional().describe("Priority: 0=none, 1=low, 2=medium, 3=high"),
  },
  async ({ task_id, name, description, due_date, priority }) => {
    const body: Record<string, unknown> = {};
    if (name !== undefined) body.name = name;
    if (description !== undefined) body.description = description;
    if (due_date !== undefined) body.due_date = due_date;
    if (priority !== undefined) body.priority = priority;

    if (Object.keys(body).length === 0) {
      return { content: [{ type: "text", text: "Error: provide at least one field to modify" }], isError: true };
    }

    const data = await apiRequest(`/tasks/${task_id}.json`, "PATCH", body);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ── search_tasks ─────────────────────────────────────────────────────────────

server.tool(
  "search_tasks",
  "Search tasks on a board by keyword (matches against task name and description)",
  {
    board_id: z.number().describe("The board ID"),
    keyword: z.string().describe("Keyword to search for in task name and description"),
    swimlane_id: z.number().optional().describe("Optionally filter by swimlane ID"),
    workflow_stage_id: z.number().optional().describe("Optionally filter by workflow stage ID"),
  },
  async ({ board_id, keyword, swimlane_id, workflow_stage_id }) => {
    const params = new URLSearchParams({ board_id: String(board_id) });
    if (swimlane_id) params.set("swimlane_id", String(swimlane_id));
    if (workflow_stage_id) params.set("workflow_stage_id", String(workflow_stage_id));

    const data = await apiRequest(`/tasks/search.json?${params}`) as unknown[];
    const lower = keyword.toLowerCase();
    const results = data.filter((t: unknown) => {
      const task = t as { name?: string; description?: string };
      return (
        task.name?.toLowerCase().includes(lower) ||
        task.description?.toLowerCase().includes(lower)
      );
    });

    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

// ── delete_task ──────────────────────────────────────────────────────────────

server.tool(
  "delete_task",
  "Delete a task by ID",
  {
    task_id: z.number().describe("The task ID to delete"),
  },
  async ({ task_id }) => {
    await apiRequest(`/tasks/${task_id}.json`, "DELETE");
    return { content: [{ type: "text", text: `Task ${task_id} deleted successfully.` }] };
  }
);

// ── start server ─────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
