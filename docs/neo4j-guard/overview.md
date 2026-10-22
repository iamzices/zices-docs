---
title: neo4j-guard overview
sidebar_label: Overview
description: neo4j-guard is a guardrail for Cypher, built for Neo4j.
sidebar_position: 1
---

`neo4j-guard` is a Python library that blocks unsafe Cypher queries before execution. It parses Cypher using ANTLR and Neo4j’s Cypher 25 grammar, then traverses the resulting syntax tree to validate query operations against built-in safety rules. A query or result that is not allowed raises `GuardError`. By default, only read queries are allowed.

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver(URL, auth=AUTH))

try:
    driver.execute_query("CREATE (:Person {name: 'Ada'})")
except GuardError as error:
    print(error)  # CREATE is not allowed in read mode
```

It works with the Neo4j driver (5.8+), LangChain's `Neo4jGraph`, and the Neo4j MCP server. It is compatible with Neo4j Community Edition, Enterprise Edition, and Aura.
