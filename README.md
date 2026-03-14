# kanbantool-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server for [KanbanTool.com](https://kanbantool.com), enabling AI assistants like Claude to read and manage your Kanban boards.

## Features

- List tasks, swimlanes, and workflow stages for any board
- Create, move, modify, and delete tasks
- Search tasks by keyword
- Fully typed with TypeScript

## Prerequisites

- Node.js ≥ 20
- A KanbanTool account with API access
- Your KanbanTool API token (found under *Profile → API access*)

## Installation

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `KANBANTOOL_DOMAIN` | Your subdomain (e.g. `mycompany` for `mycompany.kanbantool.com`) |
| `KANBANTOOL_API_TOKEN` | Your personal API token from KanbanTool |

## Usage

### Run directly

```bash
KANBANTOOL_DOMAIN=mycompany KANBANTOOL_API_TOKEN=xxx node dist/index.js
```

### Claude Code / Claude Desktop

Add to your MCP config (e.g. `~/.claude/mcp.json`):

```json
{
  "mcpServers": {
    "kanbantool": {
      "command": "node",
      "args": ["/absolute/path/to/kanbantool-mcp/dist/index.js"],
      "env": {
        "KANBANTOOL_DOMAIN": "mycompany",
        "KANBANTOOL_API_TOKEN": "your_token"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|---|---|
| `get_tasks` | Get all tasks for a board, optionally filtered by swimlane or workflow stage |
| `get_swimlanes` | List all swimlanes for a board |
| `get_workflow_states` | List all workflow stages (columns) for a board |
| `search_tasks` | Search tasks by keyword across name and description |
| `create_task` | Create a new task in a specific swimlane and column |
| `move_task` | Move a task to a different swimlane and/or workflow stage |
| `modify_task` | Update a task's name, description, due date, or priority |
| `delete_task` | Delete a task by ID |

## Development

```bash
npm run dev        # Run with hot reload via tsx
npm run typecheck  # TypeScript type checking
npm run lint       # Lint with Biome
npm run format     # Auto-format with Biome
npm run build      # Compile to dist/
```

## License

MIT
