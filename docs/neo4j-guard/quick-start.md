---
title: neo4j-guard quick start
sidebar_label: Quick start
description: Install neo4j-guard, guard a Neo4j driver and block a write query.
sidebar_position: 4
---

Requires Python 3.10+ and the `neo4j` driver 5.8+.

## Install

```sh
pip install neo4j-guard
```

## Guard the driver

Pass the driver to `guard()`. Read queries run. Writes raise `GuardError` and are never sent.

```python
from neo4j import GraphDatabase
from neo4j_guard import GuardError, guard

driver = guard(GraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")))

records, _, _ = driver.execute_query("MATCH (n) RETURN count(n) AS nodes")
print(records[0]["nodes"])

try:
    driver.execute_query("CREATE (:Person {name: 'Ada'})")
except GuardError as error:
    print(error)  # CREATE is not allowed in read mode
```
