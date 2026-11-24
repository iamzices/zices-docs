---
title: "How to Evaluate a Neo4j Knowledge Graph With kgeval: A Step-by-Step Tutorial"
description: A step-by-step kgeval tutorial. Evaluate a Neo4j knowledge graph in Python, read the report, add a schema, ground truth, and LLM judge, and run it in CI.
slug: evaluate-neo4j-knowledge-graph-with-kgeval
authors: zices-bot
---

This tutorial takes you from installing [kgeval](https://github.com/kgeval/kgeval) to an evaluation of your Neo4j knowledge graph that runs in CI. kgeval scores a graph on up to 29 metrics, such as duplicate entities, schema conformance, and facts that the source text doesn't support, and lists every defect with the IDs of the nodes and relationships involved.

It works with any knowledge graph in Neo4j, including graphs built by Neo4j LLM Graph Builder, neo4j-graphrag, LangChain, and Graphiti.

<!-- truncate -->

## How kgeval works

kgeval is an open-source evaluation framework for knowledge graphs, written in Python and released under the Apache 2.0 license. It reads a graph from Neo4j through a read-only session, evaluates a snapshot of it in memory, and writes a report of scores and findings. The first run needs only the graph. Steps 6 to 9 each add an input, such as a schema or an LLM judge, that enables more metrics.

## Prerequisites

- Python 3.11 or later
- Neo4j 5.10 or later, or Neo4j Aura, with a knowledge graph in it
- For the LLM judge, an API key for a model provider, or a local model server

## Step 1: Install kgeval

```sh
pip install kgeval
```

Check the installation and list every metric:

```sh
kgeval --version
kgeval metrics
```

## Step 2: Connect to your Neo4j database

kgeval reads the connection from environment variables:

| Variable         | Default                  | Description                                             |
| ---------------- | ------------------------ | ------------------------------------------------------- |
| `NEO4J_URI`      | `neo4j://localhost:7687` | The connection URI                                      |
| `NEO4J_USERNAME` | `neo4j`                  | The user                                                |
| `NEO4J_PASSWORD` | None                     | The password, or none to connect without authentication |
| `NEO4J_DATABASE` | The server's default     | The database to read                                    |

```sh
export NEO4J_URI=<uri>
export NEO4J_USERNAME=<username>
export NEO4J_PASSWORD=<password>
```

For Neo4j Aura, use the `neo4j+s://` URI from the instance's connection details. In a terminal, kgeval prompts for any setting that is missing, so you can also skip this step. Each variable also has a command-line option, such as `--uri` and `--database`.

## Step 3: Run your first evaluation

Run kgeval with no inputs:

```sh
kgeval run
```

kgeval loads the graph, runs the ten intrinsic metrics, and prints the report. To save the report instead, write it to a file as Markdown or JSON:

```sh
kgeval run -o report.md
kgeval run --format json -o report.json
```

The JSON report holds every finding, and `kgeval compare` reads it, as shown in Step 11.

## Step 4: Read the report

The examples in this tutorial come from kgeval's [example notebook](https://github.com/kgeval/kgeval/blob/main/examples/singapore/evaluate.ipynb), which evaluates a small graph about Lee Kuan Yew with one planted defect for every metric. Element IDs are shortened.

### Summary

The report opens with the size of the graph and how kgeval read it:

```text
- Graph: 19 nodes (11 entities, 7 lexical nodes, 1 community node, 0 other nodes) and 40 relationships (11 facts, 14 provenance relationships)
- Layout: lexical labels Chunk, Document; community labels __Community__; base labels __Entity__; names from name, title, id
```

kgeval gives each node a role. Entities are the things the graph is about, lexical nodes are the documents and chunks they were extracted from, and community nodes are summaries. A relationship between two entities is a fact, and a relationship between an entity and a chunk is a provenance relationship. If the counts look wrong, see [Troubleshooting](#troubleshooting).

### Scores

Each metric gets a score, the share of units that pass, so 100% is perfect:

| Metric            | Score | Failed                      |
| ----------------- | ----: | --------------------------- |
| entity_uniqueness | 90.0% | 1 / 10 entities with a name |
| entity_naming     | 81.8% | 2 / 11 entities             |
| fact_uniqueness   | 90.9% | 1 / 11 facts                |

A metric with nothing to evaluate is skipped, and the report shows the reason instead of a score.

### Findings

Each finding describes one defect and lists the elements involved:

```text
### entity_uniqueness: 1 of 10 entities with a name failed

- 2 entities share the normalized name 'lee kuan yew': "Lee Kuan Yew" (Person), "lee kuan yew" (Person)
  - nodes: `4:9e64…:4`, `4:9e64…:9`
```

The Markdown report lists up to 10 findings per metric, and `--max-findings` changes that limit.

## Step 5: Inspect the findings in Neo4j Browser

Paste the element IDs from a finding into Neo4j Browser to see the nodes at fault:

```cypher
MATCH (n) WHERE elementId(n) IN ['4:9e64…:4', '4:9e64…:9'] RETURN n
```

## Step 6: Add a graph schema

A schema declares which node types, relationship types, and patterns the graph may contain. kgeval reads the `GraphSchema` format of neo4j-graphrag, so a schema written for `SimpleKGPipeline` works as it is. If you don't have a schema, draft one from the current graph:

```sh
kgeval infer-schema -o schema.yaml
```

The draft copies the graph's defects, such as a `PERSON` node type next to `Person`, so review it and remove them. Then evaluate the graph against it:

```sh
kgeval run --schema schema.yaml
```

The four schema metrics check that every entity and fact conforms to the schema, and that the graph uses every type and property the schema declares.

## Step 7: Add a ground truth and test questions

A ground truth lists the facts that the graph should contain. It doesn't need to cover the whole corpus: list a few documents under `documents`, and kgeval compares only the facts extracted from them. Use `aliases` for other names of an entity:

```yaml title="ground_truth.yaml"
facts:
  - [Lee Kuan Yew, BORN_IN, Singapore]
  - [Lee Kuan Yew, FOUNDED, "People's Action Party"]
  - [Lee Kuan Yew, FOUNDED, "Lee & Lee"]
documents:
  - {fileName: singapore.txt}
aliases:
  Lee Kuan Yew: [LKY, Harry Lee]
```

Test questions list the questions your application must answer, with the facts each answer needs:

```yaml title="questions.yaml"
- text: What did Lee Kuan Yew co-found?
  supporting_facts:
    - [Lee Kuan Yew, FOUNDED, "People's Action Party"]
    - [Lee Kuan Yew, FOUNDED, "Lee & Lee"]
```

```sh
kgeval run --ground ground_truth.yaml --questions questions.yaml
```

kgeval adds precision, recall, and F1 for facts and entities, and `competency`, the share of questions the graph can answer. Names match regardless of case, accents, punctuation, and spacing, so you can write them the way a person would.

## Step 8: Evaluate with an LLM judge

Six metrics ask a language model what rules can't check, such as whether a chunk supports a fact, or whether two entities with different names are the same thing. Name the model as `provider:model`:

```sh
export OPENAI_API_KEY=<api-key>
kgeval run --judge openai:<model> --judge-cache verdicts.sqlite
```

kgeval supports OpenAI, Azure OpenAI, Google Gemini, Mistral, xAI, DeepSeek, Groq, Together AI, Fireworks AI, and OpenRouter. To use a local model, run it with Ollama, LM Studio, or vLLM, which need no API key:

```sh
kgeval run --judge ollama:<model>
```

Each judged finding includes the judge's reason:

```text
- the chunks do not support the node types of "Fitzwilliam College" (Person): The chunk describes Fitzwilliam College as an educational institution where Lee studied, not as a person.
```

The judged metrics that check entities and facts evaluate a reproducible sample of up to 100 units each, set with `--sample-size`, so the cost stays bounded on large graphs. The cache stores every verdict, so a rerun gives the same scores without calling the model again.

## Step 9: Evaluate your GraphRAG retriever

To evaluate a retriever, record the element IDs it returns for each test question, in rank order:

```json title="retrievals.json"
{
  "What did Lee Kuan Yew co-found?": ["4:9e64…:4", "5:9e64…:12"]
}
```

```sh
kgeval run --questions questions.yaml --retrievals retrievals.json
```

`retrieval_recall` measures whether the retriever returned the facts each answer needs, and `retrieval_precision` whether what it returned was needed. With `--top-k`, only the top-ranked results count.

Because `retrieval_recall` counts only the facts the graph has, comparing it with `competency` shows where a wrong answer comes from. If `competency` fails, the graph lacks a fact the answer needs. If `competency` passes and `retrieval_recall` fails, the retriever missed it.

## Step 10: Run kgeval in CI

A threshold sets a minimum score for a metric. When a metric scores below its threshold, `kgeval run` exits with status 1, which fails a CI job:

```sh
kgeval run -t entity_uniqueness=0.98 -t fact_provenance=0.95
```

This GitHub Actions workflow evaluates the graph on every push, reading the connection from repository secrets:

```yaml title=".github/workflows/kgeval.yml"
name: Evaluate knowledge graph
on: [push]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.12"
      - run: pip install kgeval
      - run: kgeval run --ground ground_truth.yaml -t entity_uniqueness=0.98 -t fact_recall=0.9
        env:
          NEO4J_URI: ${{ secrets.NEO4J_URI }}
          NEO4J_USERNAME: ${{ secrets.NEO4J_USERNAME }}
          NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
```

Outside a terminal, kgeval reads the environment variables without prompting, so it runs unattended in CI.

## Step 11: Compare two builds of a graph

To test a change to the extraction pipeline, such as a new prompt or model, evaluate the graph before and after the change, and compare the two JSON reports:

```sh
kgeval run --metadata model=<base-model> --format json -o base.json
kgeval run --metadata model=<head-model> --format json -o head.json
kgeval compare base.json head.json --max-drop 0.01
```

The comparison opens with a verdict, REGRESSED or NO REGRESSION, and then shows how each score moved, which findings are new, and which were resolved. `kgeval compare` exits with status 1 when a metric regressed. `--max-drop` allows for the small changes that rebuilding a graph with an LLM causes even when nothing else changed.

## Evaluate a knowledge graph in Python

The Python API runs the same evaluation, so you can use it in a notebook, a script, or a test suite:

```python
import kgeval
from neo4j import GraphDatabase

with GraphDatabase.driver("<uri>", auth=("<username>", "<password>")) as driver:
    graph = kgeval.Neo4jSource(driver).load()

metrics = kgeval.default_metrics(
    schema=kgeval.load_schema("schema.yaml"),
    ground_truth=kgeval.load_ground_truth("ground_truth.yaml"),
    questions=kgeval.load_questions("questions.yaml"),
    judge=kgeval.CachedJudge(kgeval.create_judge("openai:<model>"), "verdicts.sqlite"),
)
report = kgeval.evaluate(graph, metrics)
print(report.to_markdown())
```

Each result holds its score and findings, and each finding holds the element IDs involved:

```python
result = report["entity_uniqueness"]
print(f"{result.score:.1%} of {result.evaluated} {result.unit} pass")
for finding in result.findings:
    print(finding.message, finding.node_ids)
```

To check a graph in a test suite, give a metric a threshold and assert that the report passed:

```python
def test_graph_has_no_duplicate_entities():
    report = kgeval.evaluate(graph, [kgeval.EntityUniqueness(threshold=0.98)])
    assert report.passed, report.to_markdown()
```

In a notebook, a report renders itself as Markdown.

## Evaluate graphs from LLM Graph Builder, neo4j-graphrag, LangChain, and Graphiti

kgeval detects the layout of a graph from the labels that common builders use, so these graphs need no configuration:

| Graph builder           | How kgeval reads it                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Neo4j LLM Graph Builder | Chunks and documents as lexical nodes, and `__Entity__` entities named by `id`              |
| neo4j-graphrag          | Chunks and documents as lexical nodes, and `__Entity__` and `__KGBuilder__` entities        |
| LangChain               | Documents as lexical nodes, and entities named by `id`                                      |
| Graphiti                | Episodes as lexical nodes, relationship types from `RELATES_TO`, and expired facts left out |

For a graph with other labels or property keys, write a layout file with only the fields that differ, and pass it with `--layout`:

```yaml title="layout.yaml"
lexical_labels: [Passage]
name_keys: [label]
text_keys: [body]
```

```sh
kgeval run --layout layout.yaml
```

## Troubleshooting

### The counts in the summary look wrong

kgeval detected a different layout than your graph uses. Check the layout line of the summary, and pass a layout file with the correct labels and property keys.

### A metric is skipped

A metric with nothing to evaluate is skipped, and the report gives the reason. For example, the provenance metrics are skipped for a graph without chunks, and the judged metrics need chunks that hold text.

### A threshold names a metric that isn't enabled

A metric named by `--threshold` or `--metric` must be enabled by the inputs. For example, `--threshold fact_recall=0.9` requires `--ground`.

### kgeval exits with status 2

Status 2 means an error, such as an invalid input file or a failed connection. Run with `--verbose` to log progress to standard error.

### The retrievals are rejected

Element IDs belong to one database, so the retrievals must come from the database that kgeval evaluates. kgeval rejects retrievals that contain no ID of the graph, such as retrievals of chunk texts instead of IDs.

### The judge gives no usable verdicts

kgeval retries rate-limited requests for about a minute, and asks once more when a verdict doesn't parse. Small local models judge most reliably with structured outputs and thinking turned off.

## kgeval command cheat sheet

| Task                        | Command                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| Evaluate a graph            | `kgeval run`                                                         |
| List every metric           | `kgeval metrics`                                                     |
| Draft a schema              | `kgeval infer-schema -o schema.yaml`                                 |
| Validate against a schema   | `kgeval run --schema schema.yaml`                                    |
| Compare with a ground truth | `kgeval run --ground ground_truth.yaml`                              |
| Check test questions        | `kgeval run --questions questions.yaml`                              |
| Evaluate a retriever        | `kgeval run --questions questions.yaml --retrievals retrievals.json` |
| Evaluate with an LLM judge  | `kgeval run --judge openai:<model> --judge-cache verdicts.sqlite`    |
| Run one metric              | `kgeval run -m entity_uniqueness`                                    |
| Fail below a threshold      | `kgeval run -t entity_uniqueness=0.98`                               |
| Write a JSON report         | `kgeval run --format json -o report.json`                            |
| Compare two reports         | `kgeval compare base.json head.json`                                 |

## Next steps

Next, read [12 Common Knowledge Graph Quality Issues and How to Fix Them](/blog/common-knowledge-graph-quality-issues) to learn how to fix the most common defects. The full guide is in the [kgeval documentation](https://kgeval.github.io/kgeval/), and the source code is on [GitHub](https://github.com/kgeval/kgeval).
