---
title: How to block unsafe Cypher queries in LangChain Neo4jGraph
description: Guard the driver of Neo4jGraph with guard(graph._driver).
sidebar_position: 3
---

To block unsafe Cypher queries in LangChain Neo4jGraph, guard the driver of `Neo4jGraph` with `guard(graph._driver)`. Blocked queries raise `GuardError` and are never sent.

## Install

```sh
pip install neo4j-guard langchain-neo4j langchain-anthropic
```

## Guard the driver

Guard the driver after creating `Neo4jGraph`. `Neo4jGraph` loads the schema when it is created, using APOC procedures that read mode blocks. Calling `graph.refresh_schema()` after `guard()` raises `GuardError`.

```python
from langchain_neo4j import Neo4jGraph
from neo4j_guard import GuardError, guard

graph = Neo4jGraph(url="neo4j://localhost:7687", username="neo4j", password="password")
guard(graph._driver)

try:
    graph.query("MATCH (p:Person) DETACH DELETE p")
except GuardError as error:
    print(error)  # DELETE is not allowed in read mode
```

## Use the graph in GraphCypherQAChain

`GraphCypherQAChain` runs the LLM's queries through `graph.query()`, so they go through the guarded driver. The chain requires `allow_dangerous_requests=True`.

```python
from langchain_anthropic import ChatAnthropic
from langchain_neo4j import GraphCypherQAChain, Neo4jGraph
from neo4j_guard import GuardError, guard

graph = Neo4jGraph(url="neo4j://localhost:7687", username="neo4j", password="password")
guard(graph._driver)

chain = GraphCypherQAChain.from_llm(
    ChatAnthropic(model="claude-opus-5-5"),
    graph=graph,
    allow_dangerous_requests=True,
)

try:
    print(chain.invoke({"query": "Delete every person named Ada"})["result"])
except GuardError as error:
    print(error)  # DELETE is not allowed in read mode
```
