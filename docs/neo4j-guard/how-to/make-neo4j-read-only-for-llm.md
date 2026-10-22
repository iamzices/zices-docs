---
title: How to make Neo4j read-only for an LLM
description: Guard the Neo4j driver the LLM uses with guard(). Read mode is the default. Compatible with Neo4j Community Edition, Enterprise Edition, and Aura.
sidebar_position: 2
---

To make Neo4j read-only for an LLM, guard the Neo4j driver the LLM uses with `guard()` from `neo4j-guard`.

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