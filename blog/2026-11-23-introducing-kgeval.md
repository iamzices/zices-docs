---
title: "Introducing kgeval: An Evaluation Framework for Knowledge Graphs"
description: An introduction to kgeval, an open-source Python framework that evaluates knowledge graphs in Neo4j. What it measures, how it reads a graph, and how to run it.
slug: introducing-kgeval
authors: zices-bot
---

Knowledge graphs are increasingly built by language models rather than by hand. Tools such as [Neo4j LLM Graph Builder](https://neo4j.com/labs/genai-ecosystem/llm-graph-builder/), the [neo4j-graphrag knowledge graph builder](https://neo4j.com/docs/neo4j-graphrag-python/current/user_guide_kg_builder.html), [LangChain's graph transformer](https://python.langchain.com/docs/how_to/graph_constructing/), and [Graphiti](https://github.com/getzep/graphiti) extract entities and relationships from documents and store them in Neo4j, where they often serve as the retrieval layer of a GraphRAG application, an approach described in Microsoft's [From Local to Global](https://arxiv.org/abs/2404.16130).

Extraction by a language model introduces errors, and a graph built this way needs to be evaluated like any other data. [kgeval](https://github.com/kgeval/kgeval) is an open-source Python framework for that evaluation. It scores a graph in Neo4j on 29 metrics, covering duplicate entities, conformance to a schema, agreement with a ground truth, and whether each fact is supported by the text it was extracted from. Every defect it finds comes with the nodes and relationships involved, so you can go straight to the part of the graph to fix.

This article describes the problem kgeval addresses, how it reads and scores a graph, and how to run it on your own graph.

<!-- truncate -->

## Why evaluate the graph

The errors that extraction introduces are rarely visible in a visualization of the graph. Common ones include:

- The same entity extracted twice under slightly different names
- A pronoun, such as "He", stored as an entity
- An entity with the wrong type, such as a college labeled as a person
- One entity that stands for two different things that share a name
- Two spellings of the same relationship type, such as `FOUNDED` and `Founded`
- A relationship that the source text does not state

These errors don't cause failures. They affect retrieval instead: a duplicate splits an entity's facts across two nodes, and a wrong type excludes an entity from queries that filter by label.

Evaluation tools for retrieval-augmented generation, such as [Ragas](https://docs.ragas.io/en/stable/), measure the answers an application produces. Evaluating the graph itself shows whether a problem comes from the graph or from the retriever that reads it, and which nodes and relationships are at fault. The quality of knowledge graphs and linked data is well studied, and a widely cited [survey of linked data quality](https://www.semantic-web-journal.net/content/quality-assessment-linked-data-survey) identifies 18 quality dimensions and 69 metrics. kgeval brings the measures that matter for graphs extracted by language models together in one tool that runs against a graph in Neo4j with a single command.

## What kgeval is

kgeval is a Python package with a command-line interface and a Python API. With it, you can:

- Score a graph on 29 built-in metrics
- Trace every finding to the nodes and relationships involved
- Evaluate a graph on its own, or against a schema, a ground truth, and test questions
- Compare evaluations of two versions of a graph to see what improved or regressed

It requires Python 3.11 or later and Neo4j 5.10 or later, or Neo4j Aura, and it is released under the Apache 2.0 license.

```sh
pip install kgeval
kgeval run
```

`kgeval run` connects to Neo4j through a read-only session, loads the graph into memory, evaluates that snapshot, and prints a report. It reads the connection from `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD`, and prompts for any that are missing when run in a terminal. The same evaluation in Python looks like this:

```python
import kgeval
from neo4j import GraphDatabase

with GraphDatabase.driver("<uri>", auth=("<username>", "<password>")) as driver:
    graph = kgeval.Neo4jSource(driver).load()

report = kgeval.evaluate(graph)
print(report.to_markdown())
```

## How kgeval reads a graph

A graph built by a language model pipeline contains more than extracted knowledge. It usually also stores the documents and chunks that the knowledge came from, and some builders add community summaries. kgeval assigns each node a role based on its labels:

- **Entities** are the things the graph is about, such as people and organizations.
- **Lexical nodes** are the documents and chunks that entities were extracted from.
- **Community nodes** are summaries of groups of entities.

A relationship between two entities is a **fact**. A relationship between an entity and a chunk is a **provenance relationship**, which records where the entity was found.

kgeval detects these roles from the labels that common builders use. For example, it reads entity names from `id` in graphs from LLM Graph Builder and LangChain, and it excludes facts that Graphiti has marked as expired. The report states the layout it detected:

```text
- Graph: 19 nodes (11 entities, 7 lexical nodes, 1 community node, 0 other nodes) and 40 relationships (11 facts, 14 provenance relationships)
- Layout: lexical labels Chunk, Document; community labels __Community__; base labels __Entity__; names from name, title, id
```

For a graph with other labels or property names, a layout file overrides the detected values, as described in [Configuration](https://kgeval.github.io/kgeval/guide/configuration/).

## Scores and findings

Each metric checks a population of units, such as entities or facts, and reports the share that pass:

```text
score = (evaluated - failed) / evaluated
```

A score of 100% means that no unit failed. When a metric has nothing to evaluate, such as a provenance metric on a graph without chunks, it is skipped, and the report gives the reason.

Each failed unit produces a finding. A finding describes the defect and lists the element IDs of the nodes and relationships involved:

```text
### entity_uniqueness: 1 of 10 entities with a name failed

- 2 entities share the normalized name 'lee kuan yew': "Lee Kuan Yew" (Person), "lee kuan yew" (Person)
  - nodes: `4:9e64…:4`, `4:9e64…:9`
```

The IDs can be used directly in Neo4j Browser to inspect the nodes:

```cypher
MATCH (n) WHERE elementId(n) IN ['4:9e64…:4', '4:9e64…:9'] RETURN n
```

Reports are available as Markdown or JSON, and in Python as a `Report` object whose findings carry the same IDs.

## Metrics

kgeval has 29 metrics in five categories. The intrinsic metrics need only the graph and run by default. The other categories run when you provide the input they need:

| Input          | Evaluates                                                               |
| -------------- | ----------------------------------------------------------------------- |
| Graph only     | Uniqueness, connectivity, naming, provenance, consistency, and coverage |
| Graph schema   | Conformance and completeness                                            |
| Ground truth   | Graph precision, recall, and F1                                         |
| Test questions | Answerability                                                           |
| Retrievals     | Retriever precision and recall                                          |
| LLM judge      | Accuracy, resolution, disambiguation, and extraction completeness       |

The [metrics guide](https://kgeval.github.io/kgeval/guide/metrics/) defines each metric, its unit, and the condition for passing. The sections below summarize each category.

### Intrinsic metrics

The ten intrinsic metrics are deterministic checks on the graph itself. They find entities and facts that appear more than once, entities connected to no other entity, entities named by a pronoun or a bare number, entities and facts with no chunk as their source, spelling variants of node and relationship types, property values whose type differs from the rest, missing embeddings, and chunks from which nothing was extracted.

### Schema metrics

A graph schema declares which node types, relationship types, and patterns the graph may contain. kgeval reads the `GraphSchema` format of neo4j-graphrag, so a schema written for its `SimpleKGPipeline` can be used unchanged. The schema metrics check that entities and facts conform to the schema, and that the graph uses the types and properties the schema declares. For a graph without a schema, `kgeval infer-schema` drafts one from the current graph, so you can start from a draft instead of writing a schema from scratch.

### Reference metrics

A ground truth lists the facts that the graph should contain, written as `[source, relationship type, target]`:

```yaml title="ground_truth.yaml"
facts:
  - [Lee Kuan Yew, BORN_IN, Singapore]
  - [Lee Kuan Yew, FOUNDED, "People's Action Party"]
  - [Kwa Geok Choo, MARRIED, Lee Kuan Yew]
```

From it, kgeval computes precision, recall, and F1 for facts and for entities. Test questions list questions the graph should be able to answer, each with the facts its answer depends on, and the `competency` metric checks that the graph contains those facts. Names are matched regardless of case, accents, punctuation, and spacing, and relationship types regardless of separators, camel case, and plural form, so `BORN_IN` and `born in` match. The [inputs guide](https://kgeval.github.io/kgeval/guide/inputs/) describes each file format.

### Judged metrics

Some properties of a graph cannot be checked with rules, such as whether "IBM" and "International Business Machines" refer to the same company, or whether a chunk states the fact attributed to it. Six metrics ask a language model to decide. They check for duplicate entities under different names, entities that stand for several things, node types and facts that the source text does not support, synonymous types and property keys, and facts stated in the text but missing from the graph. Each judged finding includes the model's reason.

Any model available through an OpenAI-compatible API can serve as the judge, including hosted providers and local servers such as Ollama, LM Studio, and vLLM:

```sh
export OPENAI_API_KEY=<api-key>
kgeval run --judge openai:<model> --judge-cache verdicts.sqlite
```

Judging scales to large graphs. Following the sampling approach of [Efficient Knowledge Graph Accuracy Evaluation](https://arxiv.org/abs/1907.09657), the judged metrics that check entities and facts evaluate a sample of up to 100 units each, so the cost stays bounded however large the graph grows, and a sampled score comes with a 95% confidence interval. The sample is selected by hashing each unit's content with a seed, so the same graph produces the same sample on every run. The cache stores each verdict in a SQLite file, so rerunning an evaluation gives the same scores without calling the model again. The [LLM judges guide](https://kgeval.github.io/kgeval/guide/judges/) lists the supported providers and options.

### Retrieval metrics

Retrievals record which elements a retriever returned for each test question, as element IDs in rank order. Any pipeline can write them as a JSON file, and in Python, `kgeval.retrieve()` collects them from a retriever function. The retrieval metrics measure whether the retriever returned the facts each answer needs, and whether what it returned was needed.

Together with `competency`, they separate the two causes of a wrong answer, so you know whether to fix the extraction or the retriever:

| `competency` | `retrieval_recall`              | Cause                                           |
| ------------ | ------------------------------- | ----------------------------------------------- |
| Fails        | Does not count the missing fact | The graph does not contain a required fact.     |
| Passes       | Fails                           | The retriever missed a fact that the graph has. |

## An example

The kgeval repository includes an [example notebook](https://github.com/kgeval/kgeval/blob/main/examples/singapore/evaluate.ipynb) that evaluates a small graph about Lee Kuan Yew. The graph follows the layout of LLM Graph Builder output, with two documents, five chunks, eleven entities, and eleven facts, and it contains one planted defect for each metric. Running the intrinsic metrics on it produces these scores:

| Metric                    | Score | Failed                      |
| ------------------------- | ----: | --------------------------- |
| entity_uniqueness         | 90.0% | 1 / 10 entities with a name |
| entity_connectivity       | 90.9% | 1 / 11 entities             |
| entity_naming             | 81.8% | 2 / 11 entities             |
| entity_provenance         | 90.9% | 1 / 11 entities             |
| fact_uniqueness           | 90.9% | 1 / 11 facts                |
| fact_provenance           | 90.9% | 1 / 11 facts                |
| vocabulary_uniqueness     | 85.7% | 2 / 14 vocabulary terms     |
| property_type_consistency | 92.3% | 1 / 13 property values      |
| embedding_consistency     | 80.0% | 1 / 5 expected embeddings   |
| extraction_coverage       | 80.0% | 1 / 5 chunks                |

Adding a ground truth and test questions finds a fact that extraction missed:

```text
- 'What did Lee Kuan Yew co-found?': the graph lacks "Lee Kuan Yew" -[:FOUNDED]-> "Lee & Lee"
```

The judged metrics find defects that the rule-based metrics cannot, such as an entity named "Raffles" that refers both to a school and to a person:

```text
- "Raffles" (Organization) stands for more than one thing: The first chunk uses "Raffles" as part of the organization name "Raffles Institution," while the second uses "Raffles" as the person who founded Singapore.
```

## Thresholds and comparisons

A threshold sets a minimum score for a metric. When a metric scores below its threshold, `kgeval run` exits with status 1, which allows it to run as a check in CI:

```sh
kgeval run -t entity_uniqueness=0.98 -t fact_provenance=0.95
```

To measure the effect of a change to the pipeline, such as a different extraction prompt or model, evaluate the graph before and after the change, and compare the two JSON reports:

```sh
kgeval run --metadata model=<base-model> --format json -o base.json
kgeval run --metadata model=<head-model> --format json -o head.json
kgeval compare base.json head.json
```

The comparison reports the change in each score, along with the findings that are new and the findings that were resolved. Findings are matched by their content rather than by element ID, so they still match after the graph is rebuilt. For sampled scores, the comparison includes a 95% confidence interval for the change, so sampling noise is not reported as a regression. The [comparing builds guide](https://kgeval.github.io/kgeval/guide/comparing/) explains how to read the result.

## Background

The metric names follow the established terms of their fields. Conformance follows the W3C [Shapes Constraint Language](https://www.w3.org/TR/shacl/) and [Text2KGBench](https://arxiv.org/abs/2308.02357), completeness follows the survey of linked data quality, test questions follow the competency questions used in ontology design, and supporting facts follow [HotpotQA](https://arxiv.org/abs/1809.09600). The [references](https://kgeval.github.io/kgeval/guide/metrics/#references) section of the metrics guide lists every source.

## Getting started

kgeval is available on [PyPI](https://pypi.org/project/kgeval/). To evaluate your own graph, install it and run it against your Neo4j database:

```sh
pip install kgeval
kgeval run
```

The [Quickstart](https://kgeval.github.io/kgeval/quickstart/) evaluates a graph and explains each part of the report, and the [example notebook](https://github.com/kgeval/kgeval/blob/main/examples/singapore/evaluate.ipynb) demonstrates every metric on one graph. All commands and options are documented in the [CLI reference](https://kgeval.github.io/kgeval/reference/cli/), and all classes and functions in the [Python API reference](https://kgeval.github.io/kgeval/reference/api/). For a hands-on walkthrough, read [How to Evaluate a Neo4j Knowledge Graph With kgeval](/blog/evaluate-neo4j-knowledge-graph-with-kgeval). For the methods behind the metrics, read [How to Evaluate a Knowledge Graph](/blog/how-to-evaluate-a-knowledge-graph), and for the defects they find, read [12 Common Knowledge Graph Quality Issues and How to Fix Them](/blog/common-knowledge-graph-quality-issues).

The full guide is in the [kgeval documentation](https://kgeval.github.io/kgeval/). The source code is on [GitHub](https://github.com/kgeval/kgeval), where issues and contributions are welcome.
