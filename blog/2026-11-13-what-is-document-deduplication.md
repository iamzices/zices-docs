---
title: What Is Document Deduplication?
description: What document deduplication is, the kinds of duplicate documents, why they matter, and how deduplication works, with examples from DocFGP by Zices.
slug: what-is-document-deduplication
---

**Document deduplication is the process of finding documents that contain the same or nearly the same content, so that you keep, use, or review only one copy of each.** It compares what documents say, not just the files, so it can tell that a Word file and the PDF exported from it are the same document.

In this guide, you'll learn:

- What document deduplication is, with a simple example
- The kinds of duplicate documents and where they come from
- Why deduplication matters for search, AI, legal review, and storage
- How deduplication works, step by step
- How to decide what counts as a duplicate

<!-- truncate -->

## Document deduplication explained

Think about how a single document travels through a company. Someone writes a services agreement in Word. They export it to PDF to send to the customer. The customer emails it back, and someone saves the attachment again. It gets printed, signed, and scanned. A month later, someone saves a new version with a later start date and a higher fee.

That's five files:

1. `contract.docx`, the original draft
2. `contract.pdf`, the PDF export
3. `contract (1).pdf`, the same PDF downloaded again from an email
4. `contract-signed.pdf`, a signed scan
5. `contract-v2.docx`, a new version with different terms

A file system sees five files. A person sees one contract, with a signed copy and a newer version. Document deduplication works more like the person. It looks at the content and recognizes which files are copies of the same document.

How many of these files you should treat as duplicates depends on your goal:

- **A backup system** only cares about identical files. Only the downloaded PDF is an exact copy, so it keeps four files.
- **A search engine** should show one result for this contract, not five.
- **A lawyer** sees three documents: the unsigned contract, the signed contract, and the new version.

Finding the copies is the technical part of deduplication. Deciding which copies count as duplicates depends on what you're using the documents for. This guide covers both.

## Types of duplicate documents

There are two main kinds of duplicates:

- **Exact duplicates** are identical files, byte for byte. In the example, the PDF downloaded twice is an exact duplicate.
- **Near-duplicates** have the same or almost the same content, but they aren't identical files. The Word file and its PDF, the signed scan, and the new version are all near-duplicates of the original.

Exact duplicates are easy to find. Near-duplicates take more work. For a closer look at the differences, see [Exact vs. Near-Duplicate Documents](/blog/exact-vs-near-duplicate-documents).

## Where duplicate documents come from

Duplicates rarely come from someone copying a file on purpose. Most appear as a side effect of normal work:

- **Sharing.** Each person who receives an email attachment may save their own copy.
- **Versioning.** New versions get saved next to old ones, such as `report-final.docx` and `report-final-v2.docx`.
- **Format conversion.** Documents are exported to PDF, converted from older formats, or copied into slides.
- **Scanning.** Printed documents are scanned back in, sometimes many times.
- **Migrations and imports.** Merging two systems or rerunning an import brings in the same documents again.
- **Templates.** Invoices, reports, and web pages generated from the same template share most of their text.

## Why document deduplication matters

Duplicates are more common than most people expect. Research on the web and on AI training data shows how common they are, and what they cost.

### Better search results

Document deduplication started as a search problem. When AltaVista launched in the mid-1990s, a colleague complained to the computer scientist Andrei Broder that "often half the first page of answers is just the same document in many variants." Broder's solution, described in [Identifying and Filtering Near-Duplicate Documents](https://cs.brown.edu/courses/cs253/papers/nearduplicate.pdf), is still the basis of near-duplicate detection today. In the same paper, he noted that studies had estimated 30 to 45% of the web to be duplicates or near-duplicates.

### Better RAG answers

In retrieval-augmented generation (RAG), an AI model answers questions using a few chunks of text retrieved from your documents. If the same document is indexed several times, its copies take up the space meant for other sources. In one [2026 bug report](https://github.com/amd/gaia/issues/4740) for AMD's GAIA project, a single document indexed under two names took up 40% of the top five chunks given to the model.

### Better AI models

A [study by Google researchers](https://arxiv.org/abs/2107.06499) found a 61-word sentence repeated 61,036 times in C4, a widely used training dataset. Near-duplicates made up 3% of C4 and 13.6% of the RealNews dataset, even though both had already been deduplicated with simpler methods. Models trained on the deduplicated data repeated memorized training text 10 times less often, and needed fewer training steps to reach the same accuracy.

### Faster, more consistent review

In legal review and eDiscovery, every duplicate is a document someone has to read. Review tools remove exact duplicates and group near-duplicates around a main document, often called a pivot document. Reviewers can then read similar documents together and code them consistently.

### Lower costs

Each copy is stored, backed up, and indexed. Before AI processing, it may also be sent through OCR, embedded, or summarized by an LLM, and each of those steps costs time and money.

## Document deduplication vs. data deduplication

"Deduplication" means different things in different fields:

| Type                   | What it compares                    | Goal                                         |
| ---------------------- | ----------------------------------- | -------------------------------------------- |
| Data deduplication     | Blocks of bytes in storage          | Save disk space                              |
| Record deduplication   | Database rows, such as customers    | Keep one record for each person or company   |
| Document deduplication | What documents say                  | Keep one copy of each document's content     |

Data deduplication, used by storage and backup systems, can't tell that a Word file and its PDF are the same document, because their bytes are completely different. Document deduplication compares the content, so it can.

## How document deduplication works

Most deduplication systems follow the same steps, from cheap and strict to more expensive and flexible.

### Step 1: Extract the text

Each document's text is extracted, whatever its format. Scanned pages have no text, only images, so their text is read with OCR (optical character recognition).

### Step 2: Remove identical files

A file hash, such as SHA-256, is a short code calculated from a file's bytes. Identical files always get the same hash, so comparing hashes finds exact copies instantly.

### Step 3: Match the same text in different files

The text is normalized so that differences such as capitalization, line breaks, and punctuation don't count. Hashing the normalized text finds the same content in any format, such as a Word file and its PDF.

### Step 4: Measure similarity

For the remaining documents, a similarity score shows how much of their content two documents share. The most common method breaks the text into short overlapping word sequences, called shingles, and measures how many they have in common. Scanned pages can also be compared by how they look.

### Step 5: Find candidates quickly

Comparing every pair of documents doesn't scale: 10,000 documents make about 50 million pairs. Techniques called MinHash and LSH (locality-sensitive hashing) find the pairs that are likely to be similar, so only those are compared. To see how they work, read [How Near-Duplicate Document Detection Works](/blog/how-near-duplicate-document-detection-works).

### Step 6: Group and decide

Documents above a similarity threshold are grouped. For each group, you choose the copy to keep and decide what to do with the others.

## Example: deduplication in action

We ran [DocFGP](/docfgp/overview), a document fingerprinting library, on three of the contract files from earlier and an unrelated memo:

| File                 | File hash   | Text hash   | Similarity to the original |
| -------------------- | ----------- | ----------- | -------------------------- |
| `contract.docx`      | `5df3498d…` | `498a171d…` | 1.000                      |
| `contract.pdf`       | `682da927…` | `498a171d…` | 1.000                      |
| `contract-v2.docx`   | `fd4f4cb3…` | `4a09dc77…` | 0.816                      |
| `meeting-notes.docx` | `0d5b0fcb…` | `393cf0a3…` | 0.000                      |

The results show each step at work:

- **Step 2 alone would miss the PDF.** Its file hash is different from the Word file's.
- **Step 3 catches it.** The Word file and the PDF have the same text hash.
- **Step 4 finds the new version.** Changing the date and the fee lowered the similarity to 0.816. The contract is short, so each change affects a larger share of the text.
- **The unrelated memo scores zero.**

## How to decide what counts as a duplicate

A similarity score tells you how alike two documents are. It doesn't tell you whether you should remove one of them. Keep these points in mind when you set your rules.

### Choose a threshold for your use case

Documents above the threshold count as near-duplicates. A lower threshold removes more, and a higher one removes less. A threshold such as 90% catches only very close copies, while Hugging Face used 75% for its [FineWeb](https://arxiv.org/abs/2406.17557) training dataset. Test your threshold on a sample of your own documents.

### Watch out for templates

Documents built from the same template can be very similar and still be different documents. The Google study found pairs of travel pages that matched word for word except for the countries, airports, dates, and number of weekly flights. That's a duplicate for AI training data, but not for a travel agency. Invoices from the same supplier work the same way.

### Small differences can matter

`contract-v2.docx` is 82% similar to the original, but it has a different fee. A signed scan has the same text as the unsigned PDF, but the signature makes it a different document. When documents carry legal or financial weight, have a person check near-duplicates before anything is removed.

### More removal isn't always better

When the FineWeb team deduplicated 96 web crawls against each other, about 90% of one 2013 crawl was removed. The 10% that was left turned out to be lower quality than the 90% removed. Deduplicating each crawl separately gave better results.

## Deduplication doesn't have to mean deletion

Once you've found duplicates, you can choose what to do with them:

- **Delete** them, when you're sure they're copies and nothing depends on them.
- **Hide** them from search or RAG, but keep the files.
- **Group** them under one main copy and link the rest, as eDiscovery tools do.
- **Choose** the best copy as the main one, such as the newest version or a file with real text instead of a scan.

For legal, financial, or regulated documents, linking is safer than deleting.

## When to deduplicate

Deduplicate as early as possible. Fingerprint each document when it enters your system and check it against the documents you already have. The best time is before copies spread into your search index, vector database, or review queue.

If you already have a large archive, clean it up once, then check new documents as they arrive.

## Key takeaways

- Document deduplication finds documents with the same or nearly the same content and keeps one copy of each.
- It compares content, not just files, so it finds duplicates across formats and in scans.
- Exact duplicates are easy to find. Near-duplicates need a similarity score and a threshold.
- Duplicates make search and RAG results worse, weaken AI models, slow down review, and add cost.
- Deciding what counts as a duplicate depends on your use case. Test thresholds, watch for templates, and don't delete documents that might matter.

## Frequently asked questions

### Is document deduplication the same as deleting duplicates?

No. Deduplication finds the duplicates. What you do with them is up to you: you can delete them, hide them, or group and link them.

### What's the difference between deduplication and near-duplicate detection?

Near-duplicate detection is one part of deduplication. It finds documents that are almost the same. Deduplication also covers exact duplicates and decides what to do with what you find.

### Can deduplication handle scanned documents?

Yes, if it uses OCR to read the text and compares how the pages look. A scan usually has OCR errors, so it needs a similarity score rather than an exact match.

### Should I use embeddings to find duplicates?

Embeddings find documents with similar meaning, such as two articles on the same topic. That's useful for search, but it isn't the same as finding copies. For duplicates, compare the actual content with hashes and shingles.

## Get started with DocFGP

[DocFGP](/docfgp/overview) is an open-source Python library for document deduplication. It fingerprints PDF, DOCX, PPTX, and image files, including scans, and runs locally on your CPU. Each fingerprint includes a file hash, a text hash, similarity sketches, lookup keys, and hashes of what each page looks like.

```sh
pip install docfgp
```

This is the code behind the example table:

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
a = fingerprinter.fingerprint("contract.docx").to_dict()
b = fingerprinter.fingerprint("contract.pdf").to_dict()

same_file = a["exact_hashes"]["raw_sha256"] == b["exact_hashes"]["raw_sha256"]

text_a = a["exact_hashes"]["canonical_sha256"]
same_text = text_a is not None and text_a == b["exact_hashes"]["canonical_sha256"]

matches = sum(x == y for x, y in zip(a["minhash"], b["minhash"]))
similarity = matches / len(a["minhash"]) if a["minhash"] and b["minhash"] else 0.0

print(same_file, same_text, similarity)  # False True 1.0
```

Next, read [Document Deduplication: Why It Matters and How to Do It](/blog/document-deduplication-why-it-matters) for a step-by-step plan, or follow the [Quick start](/docfgp/quick-start).
