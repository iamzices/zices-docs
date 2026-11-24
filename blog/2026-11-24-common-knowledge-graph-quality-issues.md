---
title: "12 Common Knowledge Graph Quality Issues and How to Fix Them"
description: Twelve common quality issues in knowledge graphs built by LLMs, from duplicate entities to unsupported facts, with why each happens and how to find and fix it.
slug: common-knowledge-graph-quality-issues
authors: zices-bot
---

Knowledge graphs built by language models tend to have the same kinds of defects: duplicate and ambiguous entities, wrong types, facts that the source text doesn't support, facts the graph misses, inconsistent naming, and missing links to the source. Most of these defects raise no error, so they go unnoticed until they affect the answers of the application that reads the graph.

This guide describes twelve common issues, why each one happens, and how to find and fix it. Every example is a real finding from [kgeval](https://github.com/kgeval/kgeval), an open-source evaluation framework for knowledge graphs.

<!-- truncate -->

## The example graph

The findings in this guide come from kgeval's [example notebook](https://github.com/kgeval/kgeval/blob/main/examples/singapore/evaluate.ipynb). It evaluates a small graph about Lee Kuan Yew, Singapore's first prime minister, in the layout that Neo4j LLM Graph Builder produces: documents split into chunks, entities extracted from the chunks, and relationships between the entities, which kgeval calls facts. The graph contains one planted defect for every kgeval metric.

To check your own graph, run kgeval against it:

```sh
pip install kgeval
kgeval run
```

The first run uses only the graph. Some issues also need a schema, a ground truth, or an LLM judge, as noted in each section.

## Entity issues

### 1. Duplicate entities

The same real-world thing appears as several nodes. Sometimes the names differ only in case or punctuation, such as "Lee Kuan Yew" and "lee kuan yew". Sometimes they differ entirely, such as "Lee" and "Lee Kuan Yew", or "IBM" and "International Business Machines".

**Why it happens.** Extraction runs one chunk at a time, and each chunk names an entity its own way. Unless the pipeline resolves entities after extraction, nothing connects the different names. Duplicates split an entity's facts across several nodes, so a retriever that finds one node finds only part of what the graph knows.

**How to find it.** `entity_uniqueness` finds entities whose names are the same after normalization:

```text
- 2 entities share the normalized name 'lee kuan yew': "Lee Kuan Yew" (Person), "lee kuan yew" (Person)
```

`entity_resolution` asks an LLM judge to find entities that are the same thing under different names, such as "Lee" and "Lee Kuan Yew".

**How to fix it.** Merge the duplicates into one node with [`apoc.refactor.mergeNodes`](https://neo4j.com/docs/apoc/current/overview/apoc.refactor/apoc.refactor.mergeNodes/), which moves their relationships to the node that remains. Each finding lists the element IDs to use:

```cypher
MATCH (keep) WHERE elementId(keep) = '4:9e64…:4'
MATCH (duplicate) WHERE elementId(duplicate) = '4:9e64…:9'
CALL apoc.refactor.mergeNodes([keep, duplicate], {properties: 'discard', mergeRels: true})
YIELD node
RETURN node
```

To prevent duplicates, add an entity resolution step to the pipeline. The neo4j-graphrag knowledge graph builder, for example, includes resolvers that merge entities by exact name, by fuzzy name, or by semantic similarity.

### 2. Pronouns and other non-entities

A node is named by a pronoun, such as "He" or "it", by a bare value, such as "1923", or by nothing at all.

**Why it happens.** The extractor treats a reference as an entity instead of resolving it to the thing it refers to. This happens more often when a chunk boundary separates a pronoun from the name it refers to. Such nodes collect facts that belong to a real entity, where queries for that entity can't find them.

**How to find it.** `entity_naming` finds entities named by a pronoun or a bare value, and entities with no name:

```text
- "He" (PERSON) is named by a pronoun
- unnamed (Organization) has no non-blank string in name, title, id
```

**How to fix it.** Read the chunk the node was extracted from, and merge the node into the entity it refers to, as for a duplicate. To prevent it, instruct the extractor to use full names, overlap chunks so that a pronoun and its antecedent appear together, or resolve coreferences in the text before extraction.

### 3. Ambiguous entities

One node stands for several different things that share a name. In the example graph, "Raffles" stands for both Raffles Institution, a school, and Sir Stamford Raffles, the founder of modern Singapore.

**Why it happens.** The extractor shortens a name, such as "Raffles Institution" to "Raffles", or an entity resolution step merges entities by name alone. Ambiguous entities mix the facts of unrelated things, so a question about one can return facts about the other.

**How to find it.** `entity_disambiguation` asks an LLM judge whether an entity found in several chunks stands for the same thing in all of them:

```text
- "Raffles" (Organization) stands for more than one thing: The first chunk uses "Raffles" as part of the organization name "Raffles Institution," while the second uses "Raffles" as the person who founded Singapore.
```

**How to fix it.** Split the node into one node for each meaning, and move each relationship to the node its chunk refers to. To prevent it, instruct the extractor to keep full names, and resolve entities using their type and context rather than their name alone.

### 4. Wrong entity types

An entity has a type that the source text does not support. In the example graph, Fitzwilliam College is typed as a `Person`.

**Why it happens.** Without a schema, the extractor chooses types freely, and it can infer a type from the wrong cue in the text. Wrong types hide entities from every query that filters by type, and they make relationships between types meaningless.

**How to find it.** `node_type_accuracy` asks an LLM judge whether the chunks an entity was extracted from support its types. With a schema, `entity_conformance` and `fact_conformance` also find types and patterns that the schema does not allow:

```text
- the chunks do not support the node types of "Fitzwilliam College" (Person): The chunk describes Fitzwilliam College as an educational institution where Lee studied, not as a person.
```

**How to fix it.** Replace the label:

```cypher
MATCH (n:Person) WHERE elementId(n) = '<element-id>'
SET n:Organization
REMOVE n:Person
```

To prevent it, give the extractor a schema that lists the allowed types, with a description of each.

### 5. Isolated entities

An entity takes part in no fact with another entity. In the example graph, "Marina Bay Sands" is connected to nothing.

**Why it happens.** The extractor recognized the entity but none of its relationships, or the relationships were removed later. An isolated entity can't be reached by any query that traverses the graph, so it adds nothing to the answers.

**How to find it.** `entity_connectivity` finds entities that are in no fact:

```text
- "Marina Bay Sands" (Landmark) is in no fact with another entity
```

**How to fix it.** Extract the entity's source chunk again to recover its relationships, or delete the entity if it isn't needed.

## Fact issues

### 6. Unsupported facts

The graph contains a fact that the source text does not state. In the example graph, Kwa Geok Choo `KNOWS` herself.

**Why it happens.** Language models sometimes add facts that are plausible but not stated, reverse the direction of a relationship, or attach a fact to the wrong entity. Unsupported facts become wrong answers that look as reliable as correct ones.

**How to find it.** `fact_accuracy` asks an LLM judge whether the chunks that a fact's entities share support it, in its direction. With a ground truth, `fact_precision` finds the facts that the ground truth does not contain:

```text
- the chunks do not support "Kwa Geok Choo" (Person) -[:KNOWS]-> "Kwa Geok Choo" (Person): The chunk only states that Kwa Geok Choo married Lee Kuan Yew and does not mention or imply that she knows herself.
```

**How to fix it.** Delete the fact, or correct its direction or entities. To prevent it, instruct the extractor to extract only facts the text states, and restrict it to the relationship types in a schema.

### 7. Missing facts

The source text states a fact that the graph lacks. In the example graph, a chunk says that Lee Kuan Yew co-founded the law firm Lee & Lee, but the graph has no such fact.

**Why it happens.** Extractors miss more as chunks get longer. In the [GraphRAG paper](https://arxiv.org/abs/2404.16130), GPT-4 extracted almost twice as many entity references from chunks of 600 tokens as from chunks of 2,400 tokens. Facts are also lost when an extraction call fails, or when the schema has no type for them. Missing facts make questions unanswerable, and the application has no way to tell that the graph is incomplete.

**How to find it.** `extraction_completeness` asks an LLM judge for the facts each chunk states that the graph lacks. With a ground truth, `fact_recall` lists the ground truth facts the graph lacks, and with test questions, `competency` lists the questions the graph can't answer. `extraction_coverage` finds chunks from which nothing was extracted at all:

```text
- "Lee Kuan Yew was born in Singapore. He co-founded the Peopl…" (Chunk) states facts the graph lacks: Lee Kuan Yew co-founded the law firm Lee & Lee. Lee & Lee is a law firm.
- no entity was extracted from "Table of contents" (Chunk)
```

A chunk with nothing extracted is not always a defect: a table of contents states no facts. Check the chunk's text before extracting it again.

**How to fix it.** Extract the affected chunks again. To prevent missing facts, use smaller chunks, ask the model a second time whether it missed anything, as the GraphRAG paper does with its "gleaning" step, and make sure the schema has a type for every kind of fact you need.

### 8. Duplicate facts

The same fact is stored more than once, with the same source, relationship type, and target. In the example graph, Lee Kuan Yew is `BORN_IN` Singapore twice.

**Why it happens.** Several chunks state the same fact, and the pipeline creates a relationship for each one instead of merging them, or a document is imported twice. Duplicate facts inflate counts and degrees, and retrievers return the same fact several times.

**How to find it.** `fact_uniqueness` finds facts that repeat another fact's source, relationship type, and target:

```text
- 2 facts repeat "Lee Kuan Yew" (Person) -[:BORN_IN]-> "Singapore" (Location)
```

**How to fix it.** Delete the extra relationships. To prevent them, write relationships with `MERGE` instead of `CREATE`, so that writing an existing fact again has no effect.

## Vocabulary and schema issues

### 9. Inconsistent vocabulary

The graph uses several names for the same type. Some are spelling variants, such as `Person` and `PERSON`, or `FOUNDED` and `Founded`. Others are synonyms, such as `ATTENDED` and `STUDIED_AT`, or `WORKS_AT` and `EMPLOYED_BY`.

**Why it happens.** Without a fixed vocabulary, each extraction call chooses its own names, and the names drift across chunks. A query for one name misses every fact stored under the others.

**How to find it.** `vocabulary_uniqueness` finds spelling variants of node types, relationship types, and property keys. `vocabulary_resolution` asks an LLM judge for synonyms, showing it how the graph uses each name:

```text
- PERSON spells the node type Person differently
- Founded spells the relationship type FOUNDED differently
- STUDIED_AT means the same as the relationship type ATTENDED: Both connect a person to an educational institution in the examples.
```

**How to fix it.** Rename the variants to one name. For relationship types, use [`apoc.refactor.setType`](https://neo4j.com/docs/apoc/current/overview/apoc.refactor/apoc.refactor.setType/), and for labels, add the correct label and remove the variant:

```cypher
MATCH ()-[r:Founded]->()
CALL apoc.refactor.setType(r, 'FOUNDED')
YIELD output
RETURN count(output)
```

To prevent it, give the extractor a schema with a closed list of types.

### 10. Schema violations

The graph breaks the rules of its schema. It contains types or patterns that the schema doesn't declare, entities that lack required properties, or more targets than a relationship type allows, such as a person with two birthplaces. In the other direction, the schema declares types that the graph never uses.

**Why it happens.** Extractors don't always follow the schema they are given, and some pipelines add data outside the extraction. Each violation is a place where queries written against the schema return incomplete or unexpected results. A declared type that the graph never uses usually means the extraction misses a kind of fact entirely.

**How to find it.** With a graph schema, `entity_conformance` and `fact_conformance` check every entity and fact against it, `property_completeness` checks for declared properties, and `schema_completeness` checks that the graph uses every declared type and pattern:

```text
- "Raffles" (Organization) -[:FOUNDED]-> "Singapore" (Location): pattern (Organization)-[:FOUNDED]->(Location) is not declared
- "Lee" (Person): declared property born is missing
- no entity has the declared node type Award
```

If you don't have a schema, `kgeval infer-schema` drafts one from the graph for you to review.

**How to fix it.** Correct or remove the elements that violate the schema, or update the schema if the graph is right. To prevent violations, pass the schema to the extractor, and use [Neo4j constraints](https://neo4j.com/docs/cypher-manual/current/constraints/) to reject invalid writes. Uniqueness constraints are available in every edition, and existence and property type constraints in Enterprise Edition.

## Source data issues

### 11. Missing provenance

An entity is linked to no chunk, or a fact connects two entities that share no chunk. Either way, the graph can't show where the information came from.

**Why it happens.** Data was added outside the extraction pipeline, or a merge or cleanup step dropped the links between entities and chunks. Without provenance, nobody can verify a fact against its source, a GraphRAG application can't cite one, and an LLM judge has no text to check the fact against.

**How to find it.** `entity_provenance` finds entities grounded in no chunk, and `fact_provenance` finds facts whose entities share no chunk:

```text
- "Marina Bay Sands" (Landmark) is grounded in no chunk
- no chunk grounds both entities of "lee kuan yew" (Person) -[:FOUNDED]-> "People's Action Party" (Organization)
```

**How to fix it.** Link the entities to the chunks they were extracted from, or extract the source documents again. To prevent it, keep the links between entities and chunks when you merge or clean up nodes.

### 12. Inconsistent property types and missing embeddings

A property holds values of different types across nodes, such as a birth date stored as a date on most people and as a string on one. Or some nodes lack an embedding that others of the same type have, or have one with a different dimension.

**Why it happens.** Language models return text, and pipelines don't always convert it. Embedding calls fail, and switching embedding models midway produces vectors of a different size. A query that compares dates treats a string date as a different value, and a vector index can only return nodes whose embeddings it can compare, so vector search misses the others.

**How to find it.** `property_type_consistency` finds values whose type differs from most values of the same property, and `embedding_consistency` finds missing embeddings and embeddings of an unusual dimension:

```text
- "Kwa Geok Choo" (Person): property born is STRING, while other Person entities hold DATE
- "Table of contents" (Chunk): no embedding under property embedding, while other Chunk nodes have one
```

**How to fix it.** Convert the values to the right type, such as with `date()` for ISO date strings, and compute the missing embeddings with the same model as the rest. To prevent it, declare property types in the schema, and in Enterprise Edition, add property type constraints.

## Summary

| Issue                                              | How to find it with kgeval                                                               | Needs                                          |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Duplicate entities                                 | `entity_uniqueness`, `entity_resolution`                                                 | Graph, LLM judge                               |
| Pronouns and other non-entities                    | `entity_naming`                                                                          | Graph                                          |
| Ambiguous entities                                 | `entity_disambiguation`                                                                  | LLM judge                                      |
| Wrong entity types                                 | `node_type_accuracy`, `entity_conformance`                                               | LLM judge, schema                              |
| Isolated entities                                  | `entity_connectivity`                                                                    | Graph                                          |
| Unsupported facts                                  | `fact_accuracy`, `fact_precision`                                                        | LLM judge, ground truth                        |
| Missing facts                                      | `extraction_completeness`, `fact_recall`, `competency`, `extraction_coverage`            | LLM judge, ground truth, test questions, graph |
| Duplicate facts                                    | `fact_uniqueness`                                                                        | Graph                                          |
| Inconsistent vocabulary                            | `vocabulary_uniqueness`, `vocabulary_resolution`                                         | Graph, LLM judge                               |
| Schema violations                                  | `entity_conformance`, `fact_conformance`, `property_completeness`, `schema_completeness` | Schema                                         |
| Missing provenance                                 | `entity_provenance`, `fact_provenance`                                                   | Graph                                          |
| Inconsistent property types and missing embeddings | `property_type_consistency`, `embedding_consistency`                                     | Graph                                          |

To check for all twelve issues in one run, give kgeval a schema, a ground truth, and an LLM judge:

```sh
kgeval run --schema schema.yaml --ground ground_truth.yaml --judge openai:<model>
```

## Next steps

Next, read [How to Evaluate a Knowledge Graph](/blog/how-to-evaluate-a-knowledge-graph) to learn the methods behind these checks. The full guide is in the [kgeval documentation](https://kgeval.github.io/kgeval/), and the source code is on [GitHub](https://github.com/kgeval/kgeval).
