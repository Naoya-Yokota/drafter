# Drafter MCP server

Let an AI agent (Claude Desktop, Cursor, Claude Code, …) **read and write
`design.json` directly** through the [Model Context Protocol](https://modelcontextprotocol.io).

The server is **deterministic**: every tool just reads/writes/validates/renders
the IR. It never calls an LLM itself, so it adds **no AI cost** — the host AI
does the thinking and uses these tools (BYOA stays BYOA), and there is **nothing
to host** (it runs locally, like the dev server).

## Tools

| Tool | What it does |
|------|--------------|
| `get_schema` | Returns the IR JSON Schema + node types. **Call first** to learn the format. |
| `list_designs` | Lists `design.json` files in the project. |
| `read_design` | Reads + validates a design, returns the IR. |
| `validate_design` | Validates an IR object; returns `valid` or the errors. |
| `write_design` | Validates and writes an IR to disk (create/overwrite). |
| `edit_node` | Merges a patch into one node (props/style/frame/…) and saves. |
| `generate_html` | `IR -> standalone HTML` (pure, no AI). |
| `describe_design` | Natural-language summary of the layout tree. |
| `export_ai_pack` | Description + IR + HTML in one markdown doc. |

## Typical agent loop

1. `get_schema` → learn the exact `design.json` shape.
2. Compose a screen as IR and `write_design` (or `read_design` an existing one).
3. A human tweaks it in the Drafter GUI (`npm run dev`).
4. `read_design` / `edit_node` to refine, `generate_html` or `export_ai_pack` to build the real app from it.

## Configure your client

The server is started by the MCP client. Point it at `mcp/server.ts` and pass
your project root as the first argument.

**Claude Desktop / Cursor** (`mcpServers` in the client's JSON config):

```json
{
  "mcpServers": {
    "drafter": {
      "command": "node",
      "args": ["/absolute/path/to/drafter/mcp/server.ts", "/absolute/path/to/drafter"]
    }
  }
}
```

**Claude Code** (CLI):

```bash
claude mcp add drafter -- node /absolute/path/to/drafter/mcp/server.ts /absolute/path/to/drafter
```

Requires Node 22+ (the server is TypeScript, run directly via Node's type
stripping). The project root may also be set via the `DRAFTER_ROOT` env var;
it defaults to the current working directory.

## Notes

- Transport: stdio, JSON-RPC 2.0, newline-delimited messages. Logs go to stderr;
  stdout carries only protocol messages.
- File access is restricted to within the project root.
