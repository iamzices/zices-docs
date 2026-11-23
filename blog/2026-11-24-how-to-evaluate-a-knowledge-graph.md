---
title: "How to Evaluate a Knowledge Graph: Metrics, Methods, and Tools"
description: Learn how to evaluate a knowledge graph, the quality dimensions to measure, the methods and metrics for each one, and how to run them on a Neo4j graph with kgeval.
slug: how-to-evaluate-a-knowledge-graph
authors: zices-bot
---

**To evaluate a knowledge graph, measure its quality along a few dimensions, such as accuracy, completeness, consistency, and uniqueness. Some of these can be checked with rules on the graph alone. Others need a reference, such as a schema or a ground truth, or a judgment by a person or a language model.**

This guide explains each method, the metrics it produces, and how to run them on a graph in Neo4j with [kgeval](https://github.com/kgeval/kgeval), an open-source evaluation framework for knowledge graphs.

In this guide, you'll learn:

- What knowledge graph evaluation measures
- The methods for evaluating a knowledge graph, and what each one needs
- How to evaluate a graph step by step, from rule-based checks to an LLM judge
- How to tell a problem in the graph from a problem in the retriever
- How to track quality from one build of the graph to the next

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

A complete evaluation measures all five. Each method described below covers some of them.

### Not to be confused with knowledge graph embedding evaluation

The term "knowledge graph evaluation" is also used for evaluating knowledge graph embedding and completion models, with link prediction metrics such as mean reciprocal rank (MRR) and Hits@k. Those metrics measure how well a model predicts missing links. This guide is about the quality of the graph itself.

## Methods for evaluating a knowledge graph

[Paulheim's survey of knowledge graph refinement](https://www.semantic-web-journal.net/content/knowledge-graph-refinement-survey-approaches-and-evaluation-methods) distinguishes the main ways of evaluating a graph: against a partial gold standard, against the graph itself as a silver standard, and by retrospective evaluation, in which people judge a sample of the output. For a graph built by a language model, these translate into five practical methods:

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

A schema declares the node types, relationship types, patterns, and properties that the graph may contain. Validation checks that each entity and fact conforms to it, for example that a `BORN_IN` relationship connects a `Person` to a `Location`, and that a person has only one birthplace. In RDF graphs, the [Shapes Constraint Language (SHACL)](https://www.w3.org/TR/shacl/) serves this purpose. Validation also works in the other direction: a declared type that the graph never uses points to something the extraction misses.

### Comparison with a ground truth

A ground truth, or gold standard, lists the facts that the graph should contain. Comparing the graph with it gives precision, the share of the graph's facts that the ground truth contains, and recall, the share of the ground truth's facts that the graph contains. Their harmonic mean is F1. Benchmarks for LLM extraction, such as [Text2KGBench](https://arxiv.org/abs/2308.02357), report these metrics.

Writing a ground truth for a whole corpus is expensive, so a partial gold standard, covering a few representative documents, is the common choice. The comparison is then limited to the facts extracted from those documents. Because a ground truth is written by people, names must be matched loosely, so that "Lee Kuan-Yew" in the ground truth matches "lee kuan yew" in the graph.

### Test questions

Test questions come from ontology design, where they are called competency questions: the questions a graph must be able to answer. Each test question lists the facts its answer depends on, which question-answering datasets such as [HotpotQA](https://arxiv.org/abs/1809.09600) call supporting facts. The graph can answer a question when it contains all of its supporting facts. Test questions measure completeness where it matters most: for the questions your users ask.

### Judgment by a person or a language model

Some qualities can only be measured by reading the source text, such as whether a chunk supports a fact, or whether "IBM" and "International Business Machines" are the same company. Traditionally, people annotate a sample of the graph, and the research on [efficient knowledge graph accuracy evaluation](https://arxiv.org/abs/1907.09657) shows how to estimate accuracy from a sample, with a confidence interval, at a fraction of the cost of checking every fact.

A language model can do the judging instead. In evaluating chat assistants, [Zheng et al.](https://arxiv.org/abs/2306.05685) found that strong LLM judges agreed with human preferences over 80% of the time, the same level at which people agree with each other. An LLM judge makes judgment fast and cheap enough to repeat on every build, and asking it for the reason behind each verdict keeps its decisions reviewable.

## How to evaluate a knowledge graph step by step

The steps below evaluate a graph in Neo4j with kgeval, which implements all five methods. Each step adds one input and enables more metrics, so you can start with the first step and add the others as you need them. The examples come from kgeval's [example notebook](https://github.com/kgeval/kgeval/blob/main/examples/singapore/evaluate.ipynb), which evaluates a small graph about Lee Kuan Yew with one planted defect for every metric.

### Step 1: Run the rule-based checks

Install kgeval and run it against your database:

```sh
pip install kgeval
kgeval run
```

kgeval reads the graph through a read-only session and runs its ten [intrinsic metrics](https://kgeval.github.io/kgeval/guide/metrics/#intrinsic-metrics). Each metric reports the share of units, such as entities or facts, that pass, and lists each defect as a finding with the IDs of the nodes and relationships involved:

```text
### entity_naming: 2 of 11 entities failed

- "He" (PERSON) is named by a pronoun
  - nodes: `4:9e64…:11`
```

The [Quickstart](https://kgeval.github.io/kgeval/quickstart/) explains each part of the report.

### Step 2: Validate the graph against a schema

kgeval reads schemas in the `GraphSchema` format of neo4j-graphrag. If you don't have a schema, draft one from the current graph and remove the defects it copies, such as a `PERSON` node type next to `Person`:

```sh
kgeval infer-schema -o schema.yaml
kgeval run --schema schema.yaml
```

The [schema metrics](https://kgeval.github.io/kgeval/guide/metrics/#schema-metrics) check that every entity and fact conforms to the schema, and that the graph uses the types and properties the schema declares:

```text
- "Raffles" (Organization) -[:FOUNDED]-> "Singapore" (Location): pattern (Organization)-[:FOUNDED]->(Location) is not declared
```

The [graph schema](https://kgeval.github.io/kgeval/guide/inputs/#graph-schema) section of the inputs guide describes the format, including `max_targets`, which limits how many entities one entity may relate to with a given type.

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

Entity names match regardless of case, accents, punctuation, and spacing, and relationship types regardless of separators, camel case, and plural form. For names that differ in other ways, such as "LKY", add `aliases`. The [ground truth](https://kgeval.github.io/kgeval/guide/inputs/#ground-truth) section of the inputs guide describes every field.

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

The `competency` metric reports the share of questions the graph can answer, and names the fact that is missing for each one it can't. The [test questions](https://kgeval.github.io/kgeval/guide/inputs/#test-questions) section of the inputs guide describes the format.

### Step 5: Add an LLM judge

Name a model as `provider:model`. Any model available through an OpenAI-compatible API works, including models you run yourself with Ollama, LM Studio, or vLLM:

```sh
export OPENAI_API_KEY=<api-key>
kgeval run --judge openai:<model> --judge-cache verdicts.sqlite
```

The six [judged metrics](https://kgeval.github.io/kgeval/guide/metrics/#judged-metrics) check for duplicate entities under different names, entities that stand for several things, node types and facts that the source text does not support, synonymous types and property keys, and facts stated in the text but missing from the graph. Each finding includes the judge's reason:

```text
- the chunks do not support "Kwa Geok Choo" (Person) -[:KNOWS]-> "Kwa Geok Choo" (Person): The chunk only states that Kwa Geok Choo married Lee Kuan Yew and does not mention or imply that she knows herself.
```

The judged metrics that check entities and facts judge a reproducible sample of up to 100 units each, so the cost stays bounded however large the graph grows, and a sampled score comes with a 95% confidence interval. The cache stores every verdict, so rerunning the evaluation gives the same scores without calling the model again. The [LLM judges guide](https://kgeval.github.io/kgeval/guide/judges/) covers providers, [sampling](https://kgeval.github.io/kgeval/guide/judges/#sampling), and [local models](https://kgeval.github.io/kgeval/guide/judges/#local-models).

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

The retrieval metrics measure whether the retriever returned the facts each answer needs, and whether what it returned was needed. Read together with `competency`, they point to the part to fix:

| `competency` | `retrieval_recall`              | Fix                                            |
| ------------ | ------------------------------- | ---------------------------------------------- |
| Fails        | Does not count the missing fact | The graph: extraction missed the fact.         |
| Passes       | Fails                           | The retriever: it missed a fact the graph has. |

In Python, `kgeval.retrieve()` collects the retrievals directly from a retriever function. The [retrievals](https://kgeval.github.io/kgeval/guide/inputs/#retrievals) section of the inputs guide describes both options.

### Step 7: Track quality from build to build

Evaluation is most useful when it runs on every change to the extraction pipeline. A threshold sets a minimum score for a metric, and `kgeval run` exits with status 1 when a metric falls below it, so it can run as a check in CI:

```sh
kgeval run -t entity_uniqueness=0.98 -t fact_recall=0.9 --ground ground_truth.yaml
```

To measure the effect of a change, such as a new extraction prompt or model, evaluate the graph before and after it, and compare the two reports:

```sh
kgeval run --metadata model=<base-model> --format json -o base.json
kgeval run --metadata model=<head-model> --format json -o head.json
kgeval compare base.json head.json
```

The comparison shows how each score moved, which findings are new, and which were resolved. For sampled scores, it includes a 95% confidence interval for the change, so sampling noise is not reported as a regression. The [comparing builds guide](https://kgeval.github.io/kgeval/guide/comparing/) explains which metrics to trust when the extraction itself changes.

## Choosing what to measure

Each question about a graph maps to a method and a set of metrics:

| Question                                        | Method                        | kgeval metrics                            |
| ----------------------------------------------- | ----------------------------- | ----------------------------------------- |
| Does each entity appear only once?              | Rule-based checks, judgment   | `entity_uniqueness`, `entity_resolution`  |
| Are the facts supported by the source text?     | Judgment                      | `fact_accuracy`, `fact_provenance`        |
| Does the graph contain every fact it should?    | Ground truth, judgment        | `fact_recall`, `extraction_completeness`  |
| Does the graph follow its schema?               | Schema validation             | `entity_conformance`, `fact_conformance`  |
| Can the graph answer the users' questions?      | Test questions                | `competency`                              |
| Does the retriever find the facts it needs?     | Test questions and retrievals | `retrieval_recall`, `retrieval_precision` |
| Did a change to the pipeline make things worse? | Comparison of builds          | Every metric, through `kgeval compare`    |

The [metrics guide](https://kgeval.github.io/kgeval/guide/metrics/) lists all 29 metrics, and the [common knowledge graph quality issues](/blog/common-knowledge-graph-quality-issues) guide describes the defects they find and how to fix them.

## Key takeaways

- Knowledge graph quality has several dimensions. For a graph extracted by a language model, measure accuracy, completeness, consistency, uniqueness, and provenance.
- Rule-based checks need only the graph and are cheap enough to run on every build.
- A schema, a ground truth, and test questions measure the graph against what it should contain. A partial ground truth for a few documents is enough to start.
- An LLM judge measures what rules cannot, such as whether the source text supports a fact. Judging a sample keeps the cost bounded, and a confidence interval shows how precise the score is.
- Evaluating the retriever alongside the graph shows which of the two to fix when an answer is wrong.

## Frequently asked questions

### What metrics are used to evaluate a knowledge graph?

The most common are precision, recall, and F1 against a ground truth, accuracy estimated from a judged sample, conformance to a schema, and uniqueness of entities and facts. kgeval provides 29 metrics across these categories, listed in its [metrics guide](https://kgeval.github.io/kgeval/guide/metrics/).

### How do you evaluate a knowledge graph without a ground truth?

Use rule-based checks, which need only the graph, and an LLM judge, which compares the graph with the text it was extracted from. Together, they measure uniqueness, consistency, provenance, accuracy, and much of completeness without a ground truth.

### Can a language model evaluate a knowledge graph?

Yes. A language model can judge whether a chunk supports a fact, whether two entities are the same thing, and whether a chunk states facts the graph lacks. For reliable results, judge a reproducible sample, report the score with a confidence interval, and keep the judge's reason for each verdict so that people can review it.

### How many facts do I need to check?

A sample of 100 facts gives a 95% confidence interval of at most about 10 percentage points on either side of the score, and about 6 points when the score is near 90%. To detect smaller differences, judge a larger sample.

### How is evaluating a knowledge graph different from evaluating a GraphRAG application?

Evaluating a GraphRAG application measures its answers. Evaluating the knowledge graph measures the data the answers come from. When an answer is wrong, evaluating the graph and the retriever separately shows whether the graph lacks the fact or the retriever missed it.

### How often should I evaluate a knowledge graph?

Evaluate after every change to the extraction pipeline, such as a new prompt, model, or schema, and after every large import. With thresholds and `kgeval compare`, the evaluation can run automatically in CI.

## Get started

To evaluate your own graph, install kgeval and run it against your Neo4j database:

```sh
pip install kgeval
kgeval run
```

Read [Introducing kgeval](/blog/introducing-kgeval) for an overview of the project, or follow the [Quickstart](https://kgeval.github.io/kgeval/quickstart/) to walk through your first report. For a hands-on walkthrough, including CI and Python, read [How to Evaluate a Neo4j Knowledge Graph With kgeval](/blog/evaluate-neo4j-knowledge-graph-with-kgeval). The full guide is in the [kgeval documentation](https://kgeval.github.io/kgeval/), and the source code is on [GitHub](https://github.com/kgeval/kgeval).
