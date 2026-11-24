---
title: "How to Evaluate a Knowledge Graph: Metrics, Methods, and Tools"
description: Learn how to evaluate a knowledge graph, the quality dimensions to measure, the methods and metrics for each one, and how to run them on a Neo4j graph with kgeval.
slug: how-to-evaluate-a-knowledge-graph
authors: zices-bot
---

To evaluate a knowledge graph, measure its quality along a few dimensions, such as accuracy, completeness, consistency, and uniqueness. Some of these can be checked with rules on the graph alone. Others need a reference, such as a schema or a ground truth, or a judgment by a person or a language model.

This guide explains each method, the metrics it produces, and how to run them on a graph in Neo4j with [kgeval](https://github.com/kgeval/kgeval), an open-source evaluation framework for knowledge graphs.

<!-- truncate -->

## What knowledge graph evaluation measures

The quality of a knowledge graph is usually defined as fitness for use: how well the graph serves the application that reads it. Research on linked data quality divides this into dimensions, and a [survey by Zaveri et al.](https://www.semantic-web-journal.net/content/quality-assessment-linked-data-survey) identifies 18 of them. Five apply directly to a graph that a language model extracts from documents:

| Dimension    | Question it answers                                 | Example of a defect                                            |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------- |
| Accuracy     | Are the facts true to the source text?              | A fact that no document states                                 |
| Completeness | Does the graph contain everything it should?        | A fact that a document states but the graph lacks              |
| Consistency  | Does the graph follow its schema and its own rules? | A birth date stored as text on one person and a date on others |
| Uniqueness   | Does each thing appear in the graph only once?      | The same person stored as two nodes                            |
| Provenance   | Can each fact be traced to its source?              | An entity linked to no chunk of text                           |

A complete evaluation measures all five. Each method below covers some of them.

The term "knowledge graph evaluation" is also used for evaluating knowledge graph embedding and completion models, with link prediction metrics such as mean reciprocal rank (MRR) and Hits@k. Those metrics measure how well a model predicts missing links. This guide is about the quality of the graph itself.

## Methods for evaluating a knowledge graph

For a graph built by a language model, five practical methods cover these dimensions:

| Method                  | Needs                                        | Measures                                   |
| ----------------------- | -------------------------------------------- | ------------------------------------------ |
| Rule-based checks       | Only the graph                               | Uniqueness, consistency, and provenance    |
| Schema validation       | A schema                                     | Consistency and completeness               |
| Ground truth comparison | A list of the facts the graph should contain | Accuracy and completeness                  |
| Test questions          | Questions with the facts their answers need  | Completeness for the questions that matter |
| Judgment                | A person or a language model                 | Accuracy, uniqueness, and completeness     |

### Rule-based checks

Rule-based checks need nothing but the graph, and they are deterministic, so they are cheap enough to run after every build. They find defects with a recognizable shape: two entities with the same normalized name, an entity named "He", an entity with no relationships, a repeated fact, a relationship type spelled two ways, a property stored as a date on some nodes and as text on others, a missing embedding, or a chunk of text from which nothing was extracted.

### Schema validation

A schema declares the node types, relationship types, patterns, and properties that the graph may contain. Validation checks that each entity and fact conforms to it, for example that a `BORN_IN` relationship connects a `Person` to a `Location`, and that a person has only one birthplace. Validation also works in the other direction: a declared type that the graph never uses points to something the extraction misses.

### Comparison with a ground truth

A ground truth, or gold standard, lists the facts that the graph should contain. Comparing the graph with it gives precision, the share of the graph's facts that the ground truth contains, and recall, the share of the ground truth's facts that the graph contains. Their harmonic mean is F1.

Writing a ground truth for a whole corpus is expensive, so the common choice is a partial ground truth that covers a few representative documents. The comparison is then limited to the facts extracted from those documents. Because people write the ground truth, names must be matched loosely, so that "Lee Kuan-Yew" in the ground truth matches "lee kuan yew" in the graph.

### Test questions

Test questions are the questions a graph must be able to answer, each with the facts its answer depends on. Ontology design calls them competency questions, which is where kgeval's `competency` metric gets its name. The graph can answer a question when it contains all of those facts, so test questions measure completeness where it matters most: for the questions your users ask.

### Judgment by a person or a language model

Some qualities can only be measured by reading the source text, such as whether a chunk supports a fact, or whether "IBM" and "International Business Machines" are the same company. Traditionally, people judge a random sample of the graph and use the share that is correct to estimate the accuracy of the whole graph, with a confidence interval. For a sample of 100 facts, the 95% confidence interval extends at most about 10 percentage points on either side of the score, and about 6 points when the score is near 90%.

A language model can do the judging instead. In evaluating chat assistants, [Zheng et al.](https://arxiv.org/abs/2306.05685) found that strong LLM judges agreed with human preferences over 80% of the time, the same level at which people agree with each other. An LLM judge makes judgment fast and cheap enough to repeat on every build, and asking it for the reason behind each verdict keeps its decisions reviewable.

## How to evaluate a knowledge graph step by step

The steps below evaluate a graph in Neo4j with kgeval, which implements all five methods. Steps 2 to 6 each add one input, so you can start with the rule-based checks and add the others as you need them. The examples come from kgeval's [example notebook](https://github.com/kgeval/kgeval/blob/main/examples/singapore/evaluate.ipynb), which evaluates a small graph about Lee Kuan Yew with one planted defect for every metric.

### Step 1: Run the rule-based checks

Install kgeval and run it against your database:

```sh
pip install kgeval
kgeval run
```

kgeval reads the graph through a read-only session and runs its ten intrinsic metrics. Each metric reports the share of units, such as entities or facts, that pass, and lists each defect as a finding with the IDs of the nodes and relationships involved:

```text
### entity_naming: 2 of 11 entities failed

- "He" (PERSON) is named by a pronoun
  - nodes: `4:9e64…:11`
```

### Step 2: Validate the graph against a schema

kgeval reads schemas in the `GraphSchema` format of neo4j-graphrag. If you don't have a schema, draft one from the current graph and remove the defects it copies, such as a `PERSON` node type next to `Person`:

```sh
kgeval infer-schema -o schema.yaml
kgeval run --schema schema.yaml
```

The schema metrics check that every entity and fact conforms to the schema, and that the graph uses the types and properties the schema declares:

```text
- "Raffles" (Organization) -[:FOUNDED]-> "Singapore" (Location): pattern (Organization)-[:FOUNDED]->(Location) is not declared
```

### Step 3: Compare the graph with a ground truth

Write the facts that a few documents state, and list those documents, so that kgeval compares only the facts extracted from them:

```yaml title="ground_truth.yaml"
facts:
  - [Lee Kuan Yew, BORN_IN, Singapore]
  - [Lee Kuan Yew, FOUNDED, "People's Action Party"]
  - [Lee Kuan Yew, FOUNDED, "Lee & Lee"]
  - [Kwa Geok Choo, MARRIED, Lee Kuan Yew]
documents:
  - {fileName: singapore.txt}
symmetric_relationship_types: [MARRIED]
```

```sh
kgeval run --ground ground_truth.yaml
```

kgeval reports precision, recall, and F1 for facts and for entities, and lists each fact the graph lacks:

```text
- the graph lacks the ground truth fact "Lee Kuan Yew" -[:FOUNDED]-> "Lee & Lee"
```

Entity names match regardless of case, accents, punctuation, and spacing, and relationship types regardless of separators, camel case, and plural form. For names that differ in other ways, such as "LKY", add `aliases`.

### Step 4: Write test questions

List the questions your application must answer, with the facts each answer needs:

```yaml title="questions.yaml"
- text: What did Lee Kuan Yew co-found?
  supporting_facts:
    - [Lee Kuan Yew, FOUNDED, "People's Action Party"]
    - [Lee Kuan Yew, FOUNDED, "Lee & Lee"]
- text: When was Lee Kuan Yew born?
  supporting_entities: [Lee Kuan Yew]
```

```sh
kgeval run --questions questions.yaml
```

The `competency` metric reports the share of questions the graph can answer, and names the fact that is missing for each one it can't.

### Step 5: Add an LLM judge

Name a model as `provider:model`. Any model available through an OpenAI-compatible API works, including models you run yourself with Ollama, LM Studio, or vLLM:

```sh
export OPENAI_API_KEY=<api-key>
kgeval run --judge openai:<model> --judge-cache verdicts.sqlite
```

The six judged metrics check for duplicate entities under different names, entities that stand for several things, node types and facts that the source text does not support, synonymous types and property keys, and facts stated in the text but missing from the graph. Each finding includes the judge's reason:

```text
- the chunks do not support "Kwa Geok Choo" (Person) -[:KNOWS]-> "Kwa Geok Choo" (Person): The chunk only states that Kwa Geok Choo married Lee Kuan Yew and does not mention or imply that she knows herself.
```

The judged metrics that check entities and facts evaluate a reproducible sample of up to 100 units each, so the cost stays bounded however large the graph grows, and each sampled score comes with a 95% confidence interval. The cache stores every verdict, so rerunning the evaluation gives the same scores without calling the model again.

### Step 6: Evaluate the retriever

When a GraphRAG application answers a question wrongly, either the graph lacks a fact, or the retriever missed a fact the graph has. To tell which, record the element IDs your retriever returns for each test question, in rank order:

```json title="retrievals.json"
{
  "What did Lee Kuan Yew co-found?": ["4:9e64…:4", "5:9e64…:12"],
  "When was Lee Kuan Yew born?": ["4:9e64…:4"]
}
```

```sh
kgeval run --questions questions.yaml --retrievals retrievals.json
```

The retrieval metrics measure whether the retriever returned the facts each answer needs, and whether what it returned was needed. Read them together with `competency`: if `competency` fails, the extraction missed a fact, and if `competency` passes and `retrieval_recall` fails, the retriever missed a fact the graph has. In Python, `kgeval.retrieve()` collects the retrievals directly from a retriever function.

### Step 7: Track quality from build to build

Evaluate after every change to the extraction pipeline, such as a new prompt, model, or schema, and after every large import. A threshold sets a minimum score for a metric, and `kgeval run` exits with status 1 when a metric falls below it, so it can run as a check in CI:

```sh
kgeval run -t entity_uniqueness=0.98 -t fact_recall=0.9 --ground ground_truth.yaml
```

To measure the effect of a change, evaluate the graph before and after it, and compare the two reports:

```sh
kgeval run --metadata model=<base-model> --format json -o base.json
kgeval run --metadata model=<head-model> --format json -o head.json
kgeval compare base.json head.json
```

The comparison shows how each score moved, which findings are new, and which were resolved. For sampled scores, it includes a 95% confidence interval for the change, so sampling noise is not reported as a regression.

## Choosing what to measure

Each question about a graph maps to a method and a set of metrics:

| Question                                        | Method                        | kgeval metrics                            |
| ----------------------------------------------- | ----------------------------- | ----------------------------------------- |
| Does each entity appear only once?              | Rule-based checks, judgment   | `entity_uniqueness`, `entity_resolution`  |
| Are the facts supported by the source text?     | Judgment, rule-based checks   | `fact_accuracy`, `fact_provenance`        |
| Does the graph contain every fact it should?    | Ground truth, judgment        | `fact_recall`, `extraction_completeness`  |
| Does the graph follow its schema?               | Schema validation             | `entity_conformance`, `fact_conformance`  |
| Can the graph answer the users' questions?      | Test questions                | `competency`                              |
| Does the retriever find the facts it needs?     | Test questions and retrievals | `retrieval_recall`, `retrieval_precision` |
| Did a change to the pipeline make things worse? | Comparison of builds          | Every metric, through `kgeval compare`    |

The [metrics guide](https://kgeval.github.io/kgeval/guide/metrics/) lists all 29 metrics, and [12 Common Knowledge Graph Quality Issues and How to Fix Them](/blog/common-knowledge-graph-quality-issues) describes the most common defects and how to fix them.

## Next steps

Next, read [How to Evaluate a Neo4j Knowledge Graph With kgeval](/blog/evaluate-neo4j-knowledge-graph-with-kgeval) to evaluate your own graph step by step. The full guide is in the [kgeval documentation](https://kgeval.github.io/kgeval/), and the source code is on [GitHub](https://github.com/kgeval/kgeval).
