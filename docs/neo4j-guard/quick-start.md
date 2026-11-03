---
title: Quick start
description: Install neo4j-guard by Zices and guard a Neo4j driver, LangChain Neo4jGraph, or the Neo4j MCP server with guard().
sidebar_position: 4
---

Requires Python 3.10+ and the `neo4j` driver 5.8+.

## Install

```sh
pip install neo4j-guard
```

## Guard the driver

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver(URL, auth=AUTH))

try:
    driver.execute_query("CREATE (:Person {name: 'Ada'})")
except GuardError as error:
    print(error)  # CREATE is not allowed in read mode
```

## Guard LangChain Neo4jGraph

Install `langchain-neo4j`:

```sh
pip install langchain-neo4j
```

Guard the driver of `Neo4jGraph` with `guard(graph._driver)`, after creating `Neo4jGraph`. `Neo4jGraph` loads the schema when it is created, using APOC procedures that read mode blocks, so `graph.refresh_schema()` after `guard()` raises `GuardError`.

```python
from langchain_neo4j import Neo4jGraph
from neo4j_guard import GuardError, guard

graph = Neo4jGraph(url=URL, username=AUTH[0], password=AUTH[1])
guard(graph._driver)

try:
    graph.query("MATCH (p:Person) DETACH DELETE p")
except GuardError as error:
    print(error)  # DELETE is not allowed in read mode
```

`GraphCypherQAChain` runs the LLM's queries through `graph.query()`, so pass it the guarded graph and they go through the guarded driver. The chain raises `ValueError` unless you set `allow_dangerous_requests=True`.

## Guard the Neo4j MCP server

Install `mcp-neo4j-cypher`:

```sh
pip install mcp-neo4j-cypher
```

Pass a guarded driver to `create_mcp_server()`, and save this as `server.py`. The server's `get_neo4j_schema` tool calls `apoc.meta.schema`, so allow it.

```python
import asyncio

from mcp_neo4j_cypher.server import create_mcp_server
from neo4j import AsyncGraphDatabase
from neo4j_guard import guard


async def main() -> None:
    driver = guard(
        AsyncGraphDatabase.driver(URL, auth=AUTH),
        allow=["apoc.meta.schema"],
    )
    await create_mcp_server(driver, read_only=True).run_stdio_async()


asyncio.run(main())
```

In the MCP client config, run `server.py` instead of the `mcp-neo4j-cypher` command:

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
