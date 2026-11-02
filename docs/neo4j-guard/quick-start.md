---
title: Quick start
description: Install neo4j-guard by Zices, guard a Neo4j driver with guard(), and block a write query.
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

## Next steps

- [How to block unsafe Cypher queries in LangChain Neo4jGraph](/blog/block-unsafe-cypher-queries-langchain-neo4jgraph)
- [How to block unsafe Cypher queries in the Neo4j MCP server](/blog/block-unsafe-cypher-queries-neo4j-mcp-server)
