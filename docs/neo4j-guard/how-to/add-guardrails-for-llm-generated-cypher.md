---
title: How to add guardrails for LLM-generated Cypher
description: Guard the Neo4j driver with guard() and run the LLM's queries through it.
sidebar_position: 1
---

To add guardrails for LLM-generated Cypher, guard the Neo4j driver with `guard()` and run the LLM's queries through it. Blocked queries raise `GuardError` and are never sent.

## Install

```sh
pip install neo4j-guard
```

## Guard the driver

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")))

try:
    driver.execute_query("MATCH (p:Person) DETACH DELETE p")
except GuardError as error:
    print(error)  # DELETE is not allowed in read mode
```

Queries are parsed with Neo4j's Cypher 25 grammar, not matched against keywords. A `DELETE` inside a string is allowed, and a `DELETE` inside a `CALL { }` subquery is blocked.

## Return blocked queries to the LLM

Catch `GuardError` in the tool that runs the LLM's queries and return the message. The message says what was blocked, so the LLM can rewrite the query.

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")))


def run_cypher(query: str) -> list[dict] | str:
    """Run a Cypher query and return its records, or why it was blocked."""
    try:
        records, _, _ = driver.execute_query(query)
    except GuardError as error:
        return f"Query blocked: {error}"
    return [record.data() for record in records]


print(run_cypher("MATCH (p:Person) DETACH DELETE p"))  # Query blocked: DELETE is not allowed in read mode
```
