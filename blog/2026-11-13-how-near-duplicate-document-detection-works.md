---
title: "How Near-Duplicate Document Detection Works: Shingles, MinHash, and LSH Explained"
description: A step-by-step guide to how near-duplicate document detection works. Learn how shingles, Jaccard similarity, MinHash, and locality-sensitive hashing (LSH) find similar documents without comparing every pair, with worked examples and code.
slug: how-near-duplicate-document-detection-works
---

**Near-duplicate document detection finds documents that are almost the same, such as edited versions, format conversions, and scans.** Most systems use three techniques that work together:

1. **Shingles** turn each document into a set of short, overlapping word sequences, so you can measure how much two documents share.
2. **MinHash** compresses those sets into small, fixed-size sketches that estimate similarity.
3. **LSH** (locality-sensitive hashing) uses the sketches to find likely matches without comparing every pair of documents.

This guide explains each technique step by step, with worked examples and real numbers. No math background needed.

<!-- truncate -->

## The two problems near-duplicate detection solves

Finding near-duplicates is hard for two reasons.

**First, you need a similarity measure that survives small changes.** A file hash changes completely if one character changes, so it can't tell you that two documents are 95% the same.

**Second, you need it to scale.** Even with a good measure, comparing every document with every other one quickly becomes impossible:

| Documents | Pairs to compare |
| --------- | ---------------- |
| 1,000     | 499,500          |
| 10,000    | About 50 million |
| 1,000,000 | About 500 billion |

Shingles solve the first problem. MinHash and LSH solve the second.

## Step 1: Shingles and Jaccard similarity

### What is a shingle?

A shingle is a short run of consecutive words in a document. To shingle a document, you slide a window of a fixed size over the text, one word at a time, and record every sequence.

Andrei Broder, who invented this approach for the AltaVista search engine, used this example. With four-word shingles, "a rose is a rose is a rose" becomes:

- a rose is a
- rose is a rose
- is a rose is

A document's shingles are treated as a set, so repeated shingles count once. "A rose is a rose is a rose" has five four-word windows, but only three different shingles.

### Measuring similarity with Jaccard

Once each document is a set of shingles, you can measure how similar two documents are with **Jaccard similarity**: the number of shingles they share, divided by the number of different shingles in either one.

```text
Jaccard similarity = shared shingles / all different shingles in both documents
```

Here's a worked example with three-word shingles:

| "the quick brown fox **jumps** over the lazy dog" | "the quick brown fox **leaps** over the lazy dog" |
| ------------------------------------------------- | ------------------------------------------------- |
| the quick brown ✓                                 | the quick brown ✓                                 |
| quick brown fox ✓                                 | quick brown fox ✓                                 |
| brown fox jumps                                   | brown fox leaps                                   |
| fox jumps over                                    | fox leaps over                                    |
| jumps over the                                    | leaps over the                                    |
| over the lazy ✓                                   | over the lazy ✓                                   |
| the lazy dog ✓                                    | the lazy dog ✓                                    |

The sentences share 4 shingles, and there are 10 different shingles in total, so the Jaccard similarity is 4 / 10 = **0.4**.

That's low for a one-word change, because the sentence is short and the change touches three of its seven shingles. In a real document, the same change barely matters.

### How edits affect similarity

With five-word shingles, changing one word changes the five shingles that contain it. Everything else still matches.

Take an 800-word document, which has 796 five-word shingles. Change 8 words, spread out, and 40 shingles change:

```text
shared shingles:          796 − 40 = 756
all different shingles:   796 + 40 = 836
Jaccard similarity:       756 / 836 = 0.904
```

When we ran exactly this test with DocFGP, the true similarity was 0.904, as calculated.

### Choosing a shingle size

The shingle size is a trade-off:

- **Shorter shingles** match by coincidence more often. Common phrases like "in accordance with the" appear in thousands of unrelated documents.
- **Longer shingles** are more fragile. Each edit breaks more of them, so similar documents look less similar.

Five-word shingles are a common choice. DocFGP, Hugging Face's [FineWeb](https://arxiv.org/abs/2406.17557) dataset, and Google's [training data deduplication study](https://arxiv.org/abs/2107.06499) all use them.

Text from OCR needs extra care, because OCR splits and merges words. "Invoice" read as "In voice" breaks every word shingle around it. That's why DocFGP also builds 13-character shingles from the text with spaces and punctuation removed, which still match when the spacing is wrong.

## Step 2: MinHash

### The problem with shingle sets

Shingle sets are big. A document has about one shingle per word, so a 100-page report has tens of thousands. Storing every set and comparing them in full is slow and takes a lot of space.

MinHash compresses any shingle set into a small sketch of fixed size, and comparing two sketches estimates the Jaccard similarity of the full sets.

### How MinHash works

Imagine shuffling every possible shingle into a random order. For each document, look through the shuffled list and note the first shingle that appears in that document. That's the document's minimum, or "min hash".

Here's the key fact: **the chance that two documents have the same first shingle equals their Jaccard similarity.**

Why? Look at all the different shingles in either document. After shuffling, any one of them is equally likely to come first. The two documents share their first shingle only if that shingle is in both documents. So the chance is:

```text
shingles in both documents / shingles in either document
```

That's exactly the Jaccard similarity.

One shuffle gives a yes-or-no answer. To get a number, MinHash repeats the process with many different shuffles, using a different hash function for each one. The list of minimums is the document's **MinHash sketch**. To compare two documents, count the positions where their sketches match:

```text
estimated similarity = matching positions / sketch size
```

### How accurate is MinHash?

The estimate gets more accurate as the sketch grows. With 512 values, as in DocFGP, the typical error is:

| True similarity | Typical error with 512 values |
| --------------- | ----------------------------- |
| 0.95            | ± 0.010                       |
| 0.90            | ± 0.013                       |
| 0.80            | ± 0.018                       |
| 0.50            | ± 0.022                       |

Here's how the estimates compared with the true values in our tests:

| Pair                                       | True similarity | MinHash estimate |
| ------------------------------------------ | --------------- | ---------------- |
| 800-word document, 8 words changed         | 0.904           | 0.918            |
| One-page contract, new date and fee        | 0.817           | 0.816            |

Both estimates are within the typical error. Different systems choose different sketch sizes: FineWeb uses 112 values, DocFGP uses 512, and the Google study used 9,000.

## Step 3: LSH (locality-sensitive hashing)

### The problem with comparing sketches

Sketches make each comparison fast, but you'd still need to compare every pair. With a million documents, that's about 500 billion comparisons.

LSH finds the pairs that are likely to be similar, called **candidates**, so you only compare those.

### How LSH works

LSH uses a technique called **banding**:

1. Split each sketch into bands. DocFGP splits its 512 values into 32 bands of 16.
2. Turn each band into a lookup key, and store the keys in a database index.
3. To check a document, look up its keys. Any document that shares at least one key is a candidate.

Two documents share a band only if all 16 values in it match. That's unlikely for different documents, and very likely across 32 bands for near-duplicates.

### Why banding works

If two documents have similarity *s*, the chance that one band of *r* values matches is *s* to the power of *r*. With *b* bands, the chance that at least one band matches is:

```text
P(candidate) = 1 − (1 − s^r)^b
```

For DocFGP's 32 bands of 16 values, that gives an S-shaped curve:

| Similarity | Chance of becoming a candidate |
| ---------- | ------------------------------ |
| 0.95       | Almost 100%                    |
| 0.90       | 99.9%                          |
| 0.85       | 92%                            |
| 0.80       | 60%                            |
| 0.75       | 28%                            |
| 0.70       | 10%                            |
| 0.60       | 0.9%                           |
| 0.50       | 0.05%                          |

Near-duplicates are almost always found, while different documents are almost never compared. The curve rises steeply around 0.8, the point where *s* is roughly (1 / *b*) to the power of 1 / *r*.

In our tests, the 800-word document with 8 changed words shared 8 of its 32 bands with the original. The contract with a new date and fee shared 3. One shared band is enough.

### Tuning the bands

Changing the number and size of the bands moves the curve:

- **More, smaller bands** move it lower, so less similar documents are found.
- **Fewer, larger bands** move it higher, so only very close copies are found.

FineWeb used 14 bands of 8 values to target 75% similarity. With those settings, a pair at 0.75 has a 77% chance of becoming a candidate, and a pair at 0.80 has a 92% chance.

## Step 4: Verify the candidates

LSH finds candidates, not answers. Some candidates are less similar than your threshold, so each one should be checked more carefully:

- **Compare the full sketches** to estimate the similarity, and keep pairs above your threshold.
- **Count the shared shingles exactly** when you need a precise number. The Google study went further and checked each candidate's edit similarity, keeping pairs above 0.8.

Then group the matches. Be careful with chains: if A matches B and B matches C, A and C may not be similar at all. Comparing every document in a group with one main document avoids this.

## What about SimHash?

SimHash is another way to fingerprint documents. It turns a whole document into a single 64-bit number, and similar documents get numbers that differ in only a few bits. Google [used it for web crawling](https://research.google/pubs/detecting-near-duplicates-for-web-crawling/), treating pages as near-duplicates when their 64-bit fingerprints differed in 3 bits or fewer across 8 billion pages.

| | MinHash | SimHash |
| --- | --- | --- |
| Estimates | Jaccard similarity of shingle sets | Cosine similarity of weighted features |
| Size | Hundreds of values | One 64-bit number |
| Best for | Comparing sets, such as shingles | Very large collections where space is tight |

SimHash is extremely compact. But for shingle sets, MinHash is usually more accurate: [Shrivastava and Li showed](https://arxiv.org/abs/1407.4416) that MinHash outperforms SimHash on this kind of data. That's why most document deduplication tools use MinHash.

## Beyond text: scanned pages

Shingles need text. When a scan has no readable text, such as handwriting or a poor copy, you can compare how the pages look instead. A **perceptual hash** reduces each page image to a 64-bit number that changes only a little when the image changes a little, such as after rescanning or compression. DocFGP adds one for every page, and splits it into lookup keys the same way LSH does.

## Putting it all together with DocFGP

[DocFGP](/docfgp/overview) computes everything in this guide for PDF, DOCX, PPTX, and image files: five-word and 13-character shingles, two 512-value MinHash sketches, 32 LSH keys for each sketch, and a perceptual hash for each page.

```sh
pip install docfgp
```

This example indexes three documents by their LSH keys, then finds the candidates for a new one and verifies them:

```python
from collections import defaultdict

from docfgp import Fingerprinter


def resemblance(a, b):
    return sum(x == y for x, y in zip(a["minhash"], b["minhash"])) / len(a["minhash"])


fingerprinter = Fingerprinter()
index = defaultdict(set)
fingerprints = {}

for name in ["contract.docx", "contract-v2.docx", "meeting-notes.docx"]:
    record = fingerprinter.fingerprint(name).to_dict()
    fingerprints[name] = record
    for key in record["lookup_keys"]["word_lsh"]:
        index[key].add(name)

new = fingerprinter.fingerprint("contract.pdf").to_dict()
candidates = {name for key in new["lookup_keys"]["word_lsh"] for name in index[key]}

for name in sorted(candidates):
    print(name, resemblance(new, fingerprints[name]))
```

Output:

```text
contract-v2.docx 0.81640625
contract.docx 1.0
```

The meeting notes never became a candidate, so they were never compared. In a real system, you'd store the keys in your database instead of a dictionary.

## Key takeaways

- **Shingles** turn a document into a set of overlapping word sequences, and **Jaccard similarity** measures how many two documents share.
- **MinHash** compresses each set into a fixed-size sketch. The share of matching values estimates the Jaccard similarity.
- **LSH** splits sketches into bands, so only documents that share a band are compared. The number and size of the bands set the similarity threshold.
- **Candidates should be verified** before you treat them as duplicates.
- **MinHash is usually more accurate than SimHash** for shingle sets, which is why it's the standard for document deduplication.

## Frequently asked questions

### Why use five-word shingles?

They balance two risks. Shorter shingles match common phrases in unrelated documents, and longer ones break too easily when a document is edited.

### Can LSH miss near-duplicates?

Yes. LSH trades a small chance of missing a match for a huge speedup. With DocFGP's settings, pairs at 0.9 similarity are found 99.9% of the time, but pairs at 0.8 only 60% of the time. To catch lower similarities, LSH systems use more, smaller bands. DocFGP also indexes its character-shingle sketch, which gives similar documents a second chance to share a key.

### How many hash functions does MinHash need?

More hash functions give more accurate estimates, but bigger sketches. A few hundred is typical for documents: DocFGP uses 512, which gives a typical error of about ±0.013 at 0.9 similarity.

### Is MinHash the same as LSH?

No. MinHash creates the sketch that estimates similarity. LSH uses the sketch to find candidates quickly. They're usually used together.

To learn more about the kinds of duplicates these techniques find, read [Exact vs. Near-Duplicate Documents](/blog/exact-vs-near-duplicate-documents). To get started, follow the [DocFGP Quick start](/docfgp/quick-start).
