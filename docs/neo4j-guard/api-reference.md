---
title: neo4j-guard API reference
sidebar_label: API reference
description: Signatures, parameters, defaults and errors of neo4j-guard.
sidebar_position: 6
---

## `guard()`

```python
guard(driver, mode="read", *, allow=None, disallow=None)
```

Guard a Neo4j driver so it only runs allowed queries and only returns allowed results.

Every query the driver sends is checked first, through `execute_query`, sessions and transactions. A blocked query raises `GuardError` and is never sent. A blocked result raises `GuardError` while it is read, which rolls back `execute_query` and explicit transactions. An auto-commit query from `session.run` has already run.

**Parameters**

| Name       | Type                                               | Description                                                                                                          |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `driver`   | `neo4j.Driver` or `neo4j.AsyncDriver`              | The driver to guard.                                                                                                 |
| `mode`     | `"read"`, `"write"`, `"readonly"` or `"readwrite"` | The defaults to start from. `"readonly"` and `"readwrite"` are aliases for `"read"` and `"write"`. Default `"read"`. |
| `allow`    | `list[str]` or `None`                              | Entries to allow on top of the mode's defaults.                                                                      |
| `disallow` | `list[str]` or `None`                              | Entries to block. They take precedence over `allow`.                                                                 |

**Returns**

The same driver, now guarded.

**Raises**

- `ValueError`: `mode` or an entry is invalid, or the driver is already guarded.
- `TypeError`: `allow` or `disallow` is a single string instead of a list.

## `GuardError`

```python
class GuardError(Exception)
```

Raised when a query or its result is blocked, or the query is invalid Cypher. The message describes what was blocked, so it can be returned to the LLM.

## Mode defaults

|                                                                               | Read mode | Write mode |
| ----------------------------------------------------------------------------- | --------- | ---------- |
| Read clauses (`MATCH`, `RETURN`, `WITH`, ...)                                 | Allowed   | Allowed    |
| Write clauses (`CREATE`, `MERGE`, `SET`, ...)                                 | Blocked   | Allowed    |
| Delete clauses (`DELETE`, `DETACH DELETE`)                                    | Blocked   | Blocked    |
| Other clauses (`LOAD CSV`, `USE`)                                             | Blocked   | Blocked    |
| Built-in functions (`toUpper`, `count`, ...)                                  | Allowed   | Allowed    |
| Schema and search procedures (`db.labels`, `db.index.vector.queryNodes`, ...) | Allowed   | Allowed    |
| Other procedures and functions (`apoc.*`, `dbms.*`, ...)                      | Blocked   | Blocked    |
| Admin commands (`SHOW USERS`, `CREATE INDEX`, ...)                            | Blocked   | Blocked    |

Admin commands are blocked in every mode and cannot be allowed. A leading `EXPLAIN` or `PROFILE` is removed before the query is checked.

## Entries

| Entry                      | Example                             | `allow` | `disallow` |
| -------------------------- | ----------------------------------- | ------- | ---------- |
| Clause                     | `"DELETE"`                          | ✓       | ✓          |
| Procedure or function      | `"apoc.load.json"`, `"apoc.meta.*"` | ✓       | ✓          |
| Label or relationship type | `"Employee"`                        |         | ✓          |
| Property                   | `"Person.ssn"`                      |         | ✓          |

Clause, procedure and function names ignore case. Labels and properties are case-sensitive, as in Neo4j.

Blocked labels and properties are checked in the query and in returned nodes, relationships and paths. While a property is blocked, `properties()`, `n {.*}`, `n[key]` and map comprehensions over maps are blocked. While a label is blocked, dynamic labels are blocked.
