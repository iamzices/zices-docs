---
title: How to make Neo4j read-only for an LLM
description: Guard the Neo4j driver the LLM uses with guard(). Read mode is the default. Compatible with Neo4j Community Edition, Enterprise Edition and Aura.
sidebar_position: 2
---

To make Neo4j read-only for an LLM, guard the Neo4j driver the LLM uses with `guard()`. Read mode is the default. Blocked queries raise `GuardError` and are never sent. It is compatible with Neo4j Community Edition, Enterprise Edition and Aura.

## Install

```sh
pip install neo4j-guard
```

## Guard the driver

Give the LLM its own driver and guard it. Other drivers are not checked, so the rest of the application can still write.

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")))

try:
    driver.execute_query("MERGE (p:Person {name: 'Ada'})")
except GuardError as error:
    print(error)  # MERGE is not allowed in read mode
```

|                                                                               | Read mode |
| ----------------------------------------------------------------------------- | --------- |
| Read clauses (`MATCH`, `RETURN`, `WITH`, ...)                                 | Allowed   |
| Write clauses (`CREATE`, `MERGE`, `SET`, ...)                                 | Blocked   |
| Delete clauses (`DELETE`, `DETACH DELETE`)                                    | Blocked   |
| Other clauses (`LOAD CSV`, `USE`)                                             | Blocked   |
| Built-in functions (`toUpper`, `count`, ...)                                  | Allowed   |
| Schema and search procedures (`db.labels`, `db.index.vector.queryNodes`, ...) | Allowed   |
| Other procedures and functions (`apoc.*`, `dbms.*`, ...)                      | Blocked   |
| Admin commands (`SHOW USERS`, `CREATE INDEX`, ...)                            | Blocked   |
