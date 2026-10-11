---
title: Overview
description: neo4j-guard is a guardrail for LLM-generated Cypher, built for Neo4j.
sidebar_position: 1
---

`neo4j-guard` is a guardrail for LLM-generated Cypher, built for Neo4j. It checks every query a guarded driver sends and every record it returns. A query or result that is not allowed raises `GuardError`.

By default, only read queries are allowed. Writes, `LOAD CSV` and APOC procedures are blocked unless explicitly allowed.

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")))

try:
    driver.execute_query("MATCH (p:Person) DETACH DELETE p")
except GuardError as error:
    print(error)  # DELETE is not allowed in read mode
```

## How it works

- Queries are parsed with Neo4j's Cypher 25 grammar. Admin commands, unknown clauses and invalid Cypher are blocked, and a blocked query is never sent.
- Records are checked for blocked labels and properties before the driver returns them.
- Only guarded drivers are checked. Other drivers in the same process are unchanged.

It works with the sync and async Neo4j drivers (5.8+), LangChain's `Neo4jGraph` and the Neo4j MCP server.

## Limits

- One mode per driver. Create a separate driver for each mode.
- A blocked result from an auto-commit `session.run` is raised after the query has run. `execute_query` and explicit transactions roll back.
- A query can reach labels and properties without naming them, for example through `labels(n)`. `neo4j-guard` does not replace Neo4j's access control.
