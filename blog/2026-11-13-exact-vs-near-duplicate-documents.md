---
title: "Exact vs. Near-Duplicate Documents: What's the Difference?"
description: A guide to exact and near-duplicate documents. Learn the four kinds of duplicates, how to detect each one, how to measure similarity with resemblance and coverage, and which duplicates to remove for your use case.
slug: exact-vs-near-duplicate-documents
---

**An exact duplicate is an identical copy of a file. A near-duplicate is a document with the same or almost the same content, but in a different file.** You can find exact duplicates with a simple hash. Near-duplicates need a similarity score and a threshold.

In this guide, you'll learn:

- The difference between exact and near-duplicates, at a glance
- The four kinds of duplicate documents, and how to detect each one
- How to measure near-duplicates with resemblance and coverage
- Which duplicates to remove for your use case, and which to keep

<!-- truncate -->

## Exact vs. near-duplicates at a glance

|                    | Exact duplicate                     | Near-duplicate                                        |
| ------------------ | ----------------------------------- | ----------------------------------------------------- |
| Definition         | An identical copy of a file         | Same or almost the same content, in a different file  |
| Example            | An attachment downloaded twice      | A Word file and its PDF, an edited version, a scan    |
| How it's detected  | File hash, such as SHA-256 or MD5   | Normalized text hash or similarity score              |
| Result             | Yes or no                           | A score, compared with a threshold                    |
| Effort             | Instant                             | More work, especially at scale                        |

## An example: one comma apart

When Google researchers [deduplicated popular AI training datasets](https://arxiv.org/abs/2107.06499), they listed this pair as near-duplicates:

> I left for California in 1979 and tracked Cleveland's changes on trips back to visit my sisters.
>
> I left for California in 1979, and tracked Cleveland's changes on trips back to visit my sisters.

The only difference is a comma. An exact-match check sees two different texts, while any reader sees the same sentence. As you'll see below, the line between exact and near-duplicates depends on what you compare: the bytes, the text, or the meaning.

## The four kinds of duplicate documents

Duplicates fall into four kinds, from the strictest match to the loosest.

### 1. Identical files

**What they are:** files with exactly the same bytes, such as an attachment saved twice or a file copied to another folder.

**How to detect them:** compare file hashes. A hash is a short code calculated from a file's bytes, and identical files always have the same hash. eDiscovery tools have long used MD5 or SHA-1 hashes this way to remove duplicates before review.

**Watch out for:** identical files are rarer than you'd think. Opening and saving a file usually rewrites metadata such as timestamps, so its bytes change even if you didn't touch the content.

### 2. Same text, different file

**What they are:** documents with the same words in a different file, such as a Word file and its PDF export, a re-saved copy, or the same text with different capitalization, quotes, or line breaks.

**How to detect them:** normalize the text, then hash it. Normalizing removes differences that don't change the content, such as capitalization, punctuation, and line breaks.

We tested two pairs of Word files with [DocFGP](/docfgp/overview):

| Pair                                                                                    | Same file hash | Same text hash |
| --------------------------------------------------------------------------------------- | -------------- | -------------- |
| The two sentences above, with and without the comma                                     | No             | Yes            |
| `The “Confidential Information” section…` vs. `THE "CONFIDENTIAL INFORMATION" SECTION…` | No             | Yes            |

After normalization, the researchers' near-duplicate becomes an exact duplicate. Many documents that look like near-duplicates are really this kind, and a text hash finds them instantly.

### 3. Near-duplicates

**What they are:** documents that share most of their content but not all of it, such as a new version with a changed date, a draft and the final copy, or a scan with OCR errors.

**How to detect them:** measure how similar the documents are, and compare the score with a threshold. The usual way is to break each document into short overlapping word sequences, called shingles, and measure how many they share.

**Why they matter:** near-duplicates are the kind that simple deduplication misses. The C4 and RealNews datasets had already been deduplicated with exact-match methods, yet the Google researchers still found near-duplicates in 3% of C4 and 13.6% of RealNews.

### 4. Contained documents

**What they are:** one document is mostly or entirely included in another, such as a contract inside a larger bundle, a chapter published on its own, or a policy that quotes an older one in full.

**How to detect them:** measure coverage, explained in the next section. An overall similarity score misses these, because the longer document has a lot of extra text.

## How to measure near-duplicates: resemblance and coverage

In 1997, Andrei Broder, who built near-duplicate detection for the AltaVista search engine, defined two ways to compare documents. DocFGP calls them resemblance and coverage.

### Resemblance

Resemblance is the share of content two documents have in common, out of all the content in either of them. It answers: **are these two documents the same?** Both documents count, so extra text in either one lowers the score.

### Coverage

Coverage is the share of one document that appears in the other. It answers: **is this document contained in that one?** Only the smaller document's text counts.

### Resemblance and coverage compared

Here's how different files compared with an 800-word PDF in DocFGP's tests:

| Compared file             | Resemblance | Coverage |
| ------------------------- | ----------- | -------- |
| Exact copy                | 1.000       | 1.000    |
| Same text, new line wraps | 1.000       | 1.000    |
| 8 words changed           | 0.904       | 0.952    |
| 200-word excerpt          | 0.252       | 1.000    |
| Unrelated document        | 0.000       | 0.000    |

Look at the 200-word excerpt. Its resemblance is only 0.252, because three-quarters of the original isn't in it. But its coverage is 1.000, because every word of it appears in the original. If you only checked resemblance, you'd call it unrelated.

### Choosing a threshold

A threshold is the score above which two documents count as near-duplicates. A higher threshold catches only very close copies. A lower one catches more, along with more false matches. For example, Hugging Face treated documents with at least 75% resemblance as duplicates when building its [FineWeb](https://arxiv.org/abs/2406.17557) training dataset.

To choose your own threshold:

1. Fingerprint a sample of your documents.
2. Look at pairs with scores just above and below the threshold you have in mind.
3. Raise the threshold if different documents are being matched, and lower it if obvious copies are being missed.

## Which duplicates should you remove?

It depends on what you're doing:

| Use case            | Treat as duplicates                                   | What to do with them                                    |
| ------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| Backups and storage | Identical files                                       | Store once                                              |
| Search and RAG      | Same text, and near-duplicates above a high threshold | Index one copy, usually the newest                      |
| AI training data    | Near-duplicates, aggressively                         | Keep one per group                                      |
| Legal review        | Identical files                                       | Remove, but record every person who had a copy          |
| Legal review        | Near-duplicates                                       | Group them for review, and don't remove them            |
| Records management  | Identical files and same text                         | Keep one record, and have a person check near-duplicates |

In legal review, removing identical copies across everyone's files is called global deduplication. The people who had a copy, called custodians, are recorded in a field such as "All Custodians", so nothing is lost.

## Near-duplicates you should keep

A high similarity score means "almost the same", not "the same". Watch for differences that are small in the text but large in meaning:

- **The amount changed.** A contract renewed at a higher fee can be 95% similar to the original. The other 5% is the price.
- **One copy is signed.** A signed scan has the same text as the unsigned PDF, but legally it's a different document.
- **Someone wrote on it.** Handwritten notes on a printout often don't appear in OCR text at all.
- **It's a template.** Two invoices from the same supplier share most of their text but describe different purchases.

For documents with legal or financial weight, group near-duplicates and let a person decide.

## How to detect each kind with DocFGP

[DocFGP](/docfgp/overview) fingerprints a document once and gives you everything you need to check all four kinds. It works with PDF, DOCX, PPTX, and image files, including scans, and runs locally.

First, install it:

```sh
pip install docfgp
```

Then fingerprint two documents and run all four checks:

```python
from collections import Counter

from docfgp import Fingerprinter


def same_file(a, b):
    return a["exact_hashes"]["raw_sha256"] == b["exact_hashes"]["raw_sha256"]


def same_text(a, b):
    text = a["exact_hashes"]["canonical_sha256"]
    return text is not None and text == b["exact_hashes"]["canonical_sha256"]


def resemblance(a, b):
    if not a["minhash"] or not b["minhash"]:
        return 0.0
    return sum(x == y for x, y in zip(a["minhash"], b["minhash"])) / len(a["minhash"])


def coverage(original, compared):
    shared = Counter(dict(original["shingle_counts"])) & Counter(dict(compared["shingle_counts"]))
    return sum(shared.values()) / compared["shingle_total"] if compared["shingle_total"] else 0.0


fingerprinter = Fingerprinter()
original = fingerprinter.fingerprint("policy.docx").to_dict()
excerpt = fingerprinter.fingerprint("policy-excerpt.docx").to_dict()

print(same_file(original, excerpt))    # False
print(same_text(original, excerpt))    # False
print(resemblance(original, excerpt))  # 0.23828125
print(coverage(original, excerpt))     # 1.0
```

Each function checks one kind of duplicate:

- `same_file` finds identical files.
- `same_text` finds the same text in different files.
- `resemblance` scores near-duplicates. It's estimated from the fingerprint's MinHash sketch, so it can be off by a point or two.
- `coverage` finds contained documents. It's counted exactly from the shingles.

## Key takeaways

- Exact duplicates are identical files. Near-duplicates have the same or almost the same content in different files.
- There are four kinds of duplicates: identical files, same text in different files, near-duplicates, and contained documents.
- Normalizing the text before hashing turns many apparent near-duplicates into exact matches.
- Use resemblance to find near-duplicates and coverage to find documents contained in others.
- Which duplicates to remove depends on your use case, and near-duplicates with legal or financial weight should be checked by a person.

## Frequently asked questions

### Is a PDF export of a Word file a duplicate?

Yes, in content. The files are different, so a file hash won't match them, but a hash of the normalized text will.

### What similarity threshold should I use?

There's no universal answer. Start high, look at pairs near the threshold on your own documents, and adjust. For reference, the FineWeb dataset used 75%.

### Are near-duplicates the same as plagiarism?

No. Near-duplicate detection finds copies and versions of the same document. Plagiarism detection looks for borrowed passages inside otherwise different documents, which is a different problem.

### Can exact deduplication find scanned copies?

Rarely. A scan's bytes never match the original file, and its OCR text usually has a few errors, so you need near-duplicate detection to find it.

To learn how similarity scores are calculated, read [How Near-Duplicate Document Detection Works](/blog/how-near-duplicate-document-detection-works). To get started, follow the [Quick start](/docfgp/quick-start).
