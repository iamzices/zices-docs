---
title: "Document Deduplication: Why It Matters and How to Do It"
description: A practical guide to running a document deduplication project. Learn what duplicate documents cost, how to write a deduplication policy, and how to find, group, review, and remove duplicates safely, step by step, with DocFGP by Zices.
slug: document-deduplication-why-it-matters
---

**Document deduplication finds documents with the same or nearly the same content and keeps one copy of each.** It cuts storage and processing costs, improves search and AI results, speeds up legal review, and makes privacy requests easier to fulfill. Done carelessly, it can also delete documents that only look like duplicates.

This guide is a practical playbook. You'll learn:

- What duplicate documents cost, and the risks they create
- How to write a deduplication policy
- How to find, group, review, and remove duplicates, step by step
- How to keep your documents clean after the first cleanup

If you're new to the topic, start with [What Is Document Deduplication?](/blog/what-is-document-deduplication)

<!-- truncate -->

## Why document deduplication matters

### It cuts storage and processing costs

Most organizations store far more than they use. In Veritas's [Global Databerg Report](https://www.techmonitor.ai/technology/data/85-of-data-is-useless-to-business-and-is-creating-a-33-trillion-drain-on-resources-4840818), a survey of more than 2,500 IT professionals in 22 countries, respondents estimated that a third of their stored data was redundant, obsolete, or trivial (ROT). Duplicates are the "redundant" part, and they're the easiest part to find.

The cost isn't only storage. Every copy is also backed up, indexed for search, scanned for security, and, increasingly, sent through OCR, embedding models, or LLMs. Each of those steps costs time and money for every copy.

### It improves search and AI results

When search results or a RAG system's top results are filled with copies of one document, people and AI models miss the other sources that answer the question. Training AI models on duplicated data also makes them more likely to repeat their training text word for word. For details, see [How to Find and Remove Near-Duplicate Documents Before Building a RAG Pipeline](/blog/find-and-remove-near-duplicate-documents-before-rag).

### It reduces privacy and compliance risk

Under the GDPR, the [right to erasure](https://gdprinfo.eu/gdpr-article-17-explained-understanding-the-right-to-erasure-right-to-be-forgotten) and the principle of storage limitation apply to every copy of personal data, not just the main record. If a customer's contract exists as a Word file, two PDFs, and a scan, deleting one doesn't fulfill the request. Unknown copies are also exposed in a data breach. You can only delete or protect copies you can find.

### It speeds up legal review

In litigation, every document collected may need to be reviewed by a lawyer, and review is often the most expensive part of eDiscovery. Removing identical copies and grouping near-duplicates means each document is read once, and similar documents are coded consistently.

### It prevents version confusion

When a draft, the final copy, and three edited versions sit side by side, people act on the wrong one. Deduplication shows which documents are versions of each other, so you can choose which one counts.

## How to deduplicate documents, step by step

### Step 1: Set the goal and scope

Start by deciding why you're deduplicating and where. The goal shapes every later decision:

- **Saving storage?** Focus on identical files and large file types.
- **Cleaning up search or RAG?** Focus on the documents that get indexed.
- **Responding to privacy requests?** Focus on finding every copy, not on deleting.
- **Preparing for legal review?** Follow the rules of your review process, and don't delete anything.

Then list the repositories in scope, such as shared drives, document management systems, email archives, and cloud storage. Duplicates often live in different systems, so including more of them finds more duplicates.

### Step 2: Write a deduplication policy

A policy turns "what counts as a duplicate?" into rules everyone can follow. It should cover four things.

**What counts as a duplicate.** Define it for each kind of duplicate:

| Kind of duplicate         | Example                              | Suggested rule                                  |
| ------------------------- | ------------------------------------ | ----------------------------------------------- |
| Identical file            | An attachment saved twice            | Always a duplicate                              |
| Same text, different file | A Word file and its PDF              | A duplicate, unless the format matters          |
| Very close near-duplicate | A re-scan, or a copy with a typo fixed | A duplicate above a high threshold, such as 0.95 |
| Looser near-duplicate     | A new version with changed terms     | A possible duplicate, for a person to review    |

**Which copy to keep.** Common rules are to keep the newest version, the copy in the official system, or the copy with real text instead of a scan.

**What to do with duplicates.** Options include deleting them, archiving them, hiding them from search, or linking them to the copy you keep.

**What's never removed.** List the exceptions, such as documents on legal hold, records under a retention schedule, signed originals, and documents generated from templates.

### Step 3: Fingerprint your documents

Next, create a fingerprint for every document in scope. A document fingerprint is a compact record of a document's content that you can compare with others. It works across formats, including scans. For how fingerprints work, see [What Is Document Fingerprinting and How Does It Work?](/blog/what-is-document-fingerprinting)

Store each fingerprint with the document's location, owner, and modified date. You'll need them to choose which copy to keep and to report what you did.

### Step 4: Find duplicates in tiers

Find duplicates from the most certain kind to the least:

1. **Identical files,** by comparing file hashes. These are certain.
2. **Same text,** by comparing hashes of the normalized text. These are also certain, and they catch format conversions.
3. **Near-duplicates,** by comparing similarity scores. These need a threshold and, below a certain score, a person.

Counting the duplicates in each tier also gives you the numbers for your business case, such as how much storage the identical files take.

### Step 5: Group duplicates around one main copy

Near-duplicate similarity isn't transitive. Draft 2 can be 90% similar to draft 1, and draft 3 can be 90% similar to draft 2, while draft 3 is only 80% similar to draft 1. If you group every pair that matches, chains like this pull unrelated documents into one large group.

To avoid this, compare each document with the main copy of a group, not with every member. eDiscovery tools do the same thing: each near-duplicate group has a main document, called the pivot, and every other document is scored against it.

### Step 6: Review what isn't certain

Use your thresholds to split the matches into three groups:

- **Remove automatically:** identical files, same-text copies, and near-duplicates above your high threshold.
- **Review:** near-duplicates between your two thresholds. A person checks whether the differences matter, such as a changed price or a signature.
- **Keep:** everything below the lower threshold.

Before you act, check a random sample of the automatic matches too. If the sample contains mistakes, raise the threshold.

### Step 7: Act safely

When you remove duplicates:

- **Archive before you delete.** Move duplicates to a quarantine area for a set period, so mistakes can be undone.
- **Keep a log** of every duplicate, the copy it matched, how it matched, and when it was removed.
- **Leave a link** where people expect to find the file, if your system supports it.
- **Check legal holds** before deleting anything.

### Step 8: Keep it clean

A one-time cleanup doesn't last. Fingerprint new documents when they arrive and check them against the fingerprints you've stored, so duplicates are caught before they spread. If you upgrade your fingerprinting tool, fingerprint everything again, because fingerprints from different versions may not be comparable.

## Example: a deduplication report with DocFGP

[DocFGP](/docfgp/overview) is an open-source Python library that fingerprints PDF, DOCX, PPTX, and image files, including scans, and runs locally. This script follows steps 3 to 6. It fingerprints a folder, finds duplicates in tiers, groups them around the copy to keep, and writes a CSV report with an action for each duplicate.

```sh
pip install docfgp
```

```python
import csv
from collections import defaultdict
from pathlib import Path

from docfgp import Fingerprinter, FingerprintError

AUTO_THRESHOLD = 0.95
REVIEW_THRESHOLD = 0.8
SUPPORTED = {".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}


def similarity(a, b):
    def share(field):
        if not a[field] or not b[field]:
            return 0.0
        return sum(x == y for x, y in zip(a[field], b[field])) / len(a[field])

    return max(share("minhash"), share("char_minhash"))


def preference(document):
    path, record = document
    scanned = any(page["source"] == "ocr" for page in record["quality"]["pages"])
    return not scanned, path.stat().st_mtime


fingerprinter = Fingerprinter()
documents = []
for path in sorted(Path("shared-drive").rglob("*")):
    if path.suffix.lower() in SUPPORTED:
        try:
            documents.append((path, fingerprinter.fingerprint(path).to_dict()))
        except FingerprintError as error:
            print(f"Skipped {path}: {error}")

# Best copies first: real text before scans, then newest first.
documents.sort(key=preference, reverse=True)

kept = {}
by_file, by_text, by_key = {}, {}, defaultdict(list)
rows = []

for path, record in documents:
    file_hash = record["exact_hashes"]["raw_sha256"]
    text_hash = record["exact_hashes"]["canonical_sha256"]
    keys = record["lookup_keys"]["word_lsh"] + record["lookup_keys"]["char_lsh"]

    if file_hash in by_file:
        rows.append([by_file[file_hash], path, "identical file", 1.0, "remove"])
        continue
    if text_hash in by_text:
        rows.append([by_text[text_hash], path, "same text", 1.0, "remove"])
        continue

    candidates = {other for key in keys for other in by_key[key]}
    score, keeper = max(((similarity(record, kept[c]), c) for c in candidates), default=(0.0, None))
    if score >= REVIEW_THRESHOLD:
        action = "remove" if score >= AUTO_THRESHOLD else "review"
        rows.append([keeper, path, "near-duplicate", round(score, 3), action])
        continue

    kept[path] = record
    by_file[file_hash] = path
    if text_hash:
        by_text[text_hash] = path
    for key in keys:
        by_key[key].append(path)

with open("duplicates.csv", "w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["keep", "duplicate", "match", "similarity", "action"])
    writer.writerows(rows)

to_review = sum(row[4] == "review" for row in rows)
print(f"{len(documents)} documents: {len(rows) - to_review} duplicates to remove, {to_review} to review")
```

Each document is only compared with the copies being kept, never with other duplicates, so chains can't form. That's the grouping from step 5.

We ran it on a folder with six files: a contract as a PDF, a second copy of the PDF, the original Word file, a scan of the printout, a new version with a different date and fee, and an unrelated memo.

```text
6 documents: 2 duplicates to remove, 2 to review
```

| keep           | duplicate           | match          | similarity | action |
| -------------- | ------------------- | -------------- | ---------- | ------ |
| `contract.pdf` | `contract (1).pdf`  | identical file | 1.0        | remove |
| `contract.pdf` | `contract.docx`     | same text      | 1.0        | remove |
| `contract.pdf` | `contract-v2.docx`  | near-duplicate | 0.889      | review |
| `contract.pdf` | `contract-scan.jpg` | near-duplicate | 0.941      | review |

The report shows the policy at work:

- **The identical PDF and the Word file** are certain matches, so they're marked for removal.
- **The scan** is very similar, but below the 0.95 threshold, so a person checks it. If it's signed, you may want to keep it.
- **The new version** is flagged for review, and a reviewer would see the changed fee and keep it as a separate document.
- **The memo** isn't in the report, because it has no duplicates.

## How to measure success

Track a few numbers before and after your cleanup:

- **Duplicates found in each tier,** and the share of all documents they represent
- **Storage freed,** and the processing you no longer pay for, such as embedding or OCR
- **Accuracy,** from your sample checks: how many automatic matches were wrong?
- **New duplicates caught** at the point of entry each month

## Common mistakes

- **Deleting near-duplicates without review.** A 95% match can still have a different price, date, or signature.
- **Using one threshold for everything.** Templates, such as invoices and forms, need higher thresholds than free-form documents.
- **Grouping by chains.** Compare documents with the main copy of a group, not with each other.
- **Deleting without a log or a way back.** Archive first, and record every decision.
- **Cleaning once and stopping.** Without checks on new documents, duplicates come back.

## Key takeaways

- Duplicates cost money in storage and processing, weaken search and AI results, slow down legal review, and make privacy requests harder.
- Write a policy first: what counts as a duplicate, which copy to keep, what to do with the rest, and what's never removed.
- Find duplicates in tiers, from identical files to near-duplicates, and group them around one main copy.
- Remove certain matches automatically, have a person review uncertain ones, and archive before you delete.
- Check new documents when they arrive to keep the collection clean.

## Frequently asked questions

### How much can deduplication save?

It depends on your documents. Shared drives and email archives with years of attachments usually have many more duplicates than a curated document management system. Fingerprint a sample first to estimate the savings before a full cleanup.

### Is it safe to delete duplicates automatically?

For identical files and same-text copies, usually yes, as long as you keep a log and archive before deleting. Near-duplicates should be reviewed unless they're above a high threshold that you've checked with samples.

### Which copy should I keep?

Keep the copy that's most useful and most authoritative: usually the newest version, the one in the official system, or the one with real text instead of a scan.

### How often should I deduplicate?

Check every new document when it arrives, and run a full scan periodically, such as quarterly, to catch what slipped through.
