---
title: How to block unsafe Cypher queries in the Neo4j MCP server
description: Guard the driver passed to create_mcp_server() in mcp-neo4j-cypher.
sidebar_position: 4
---

To block unsafe Cypher queries in the Neo4j MCP server, guard the driver passed to `create_mcp_server()` in `mcp-neo4j-cypher`. Blocked queries raise `GuardError` and are never sent.

## Install

```sh
pip install neo4j-guard mcp-neo4j-cypher
```

## Guard the driver

Save this as `server.py`. The server's `get_neo4j_schema` tool calls `apoc.meta.schema`, so allow it.

```python
import asyncio

from mcp_neo4j_cypher.server import create_mcp_server
from neo4j import AsyncGraphDatabase
from neo4j_guard import guard


async def main() -> None:
    driver = guard(
        AsyncGraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")),
        allow=["apoc.meta.schema"],
    )
    await create_mcp_server(driver, read_only=True).run_stdio_async()


asyncio.run(main())
```

## Add the server to the MCP client

Run `server.py` instead of the `mcp-neo4j-cypher` command:

```json
{
  "mcpServers": {
    "neo4j": {
      "command": "python",
      "args": ["/path/to/server.py"]
    }
  }
}
```

## Compare with `read_only`

The server's `read_only` option removes the `write_neo4j_cypher` tool and rejects queries that Neo4j classifies as writes. The guarded driver also blocks:

- APOC and other procedures, except entries in `allow`.
- `LOAD CSV`, which reads files and URLs.
- Labels and properties in `disallow`, in queries and in returned records.
