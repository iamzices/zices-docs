---
title: What Is Document Fingerprinting and How Does It Work?
description: What a document fingerprint is, how it's built step by step, and how it finds duplicates across formats and scans, with real output from DocFGP by Zices.
slug: what-is-document-fingerprinting
---

**Document fingerprinting creates a compact record of a document's content, so that documents with the same or similar content get the same or similar fingerprints.** Instead of comparing whole files, you compare fingerprints to find exact duplicates and near-duplicates, even across formats such as Word, PDF, and scanned images.

In this guide, you'll learn:

- What a document fingerprint is, and why a regular file hash isn't enough
- How a fingerprint is built, step by step
- How fingerprints handle scans, edits, and format changes
- How fingerprints compare with file hashes and embeddings
- How to fingerprint your own documents

<!-- truncate -->

## What is a document fingerprint?

A human fingerprint identifies a person without describing everything about them. A document fingerprint does the same for a document's content. It's much smaller than the document, and you can compare it with other fingerprints to tell whether two documents say the same thing.

Unlike a human fingerprint, a document fingerprint also shows how close two documents are. A Word file and its PDF export get matching fingerprints. An edited version gets a fingerprint that is very close to the original's. An unrelated document gets a completely different one.

### Not to be confused with DLP fingerprinting

The term "document fingerprinting" is also used in data loss prevention (DLP). In tools like [Microsoft Purview](https://learn.microsoft.com/en-us/purview/sit-document-fingerprinting), you fingerprint a blank form, and the tool spots filled-in copies so they can't be shared outside the company. The idea is similar, but the goal is security. This guide is about fingerprinting to find duplicate documents.

## Why a regular hash isn't enough

The simplest way to compare files is a hash, such as SHA-256: a short code calculated from a file's bytes. Here are two sentences and their hashes:

```text
Either party may end this agreement with sixty days written notice.   e5d20e15f03ccd7fe50c30968420ec50…
Either party may end this agreement with sixty days written notice    a0a77d64ea91aa2323fb7ea4c564d9c9…
```

The only difference is the period at the end, but the hashes have nothing in common. Hashes are designed this way, so that any change produces a different value. That's perfect for checking whether two files are identical, but it can't tell you that two documents are almost the same.

Document fingerprinting solves this with a simple idea: **instead of hashing the whole document, hash many small pieces of it.** When one word changes, only the pieces around that word change, and the rest still match. Udi Manber used this idea in 1994 to [find similar files in a large file system](https://dl.acm.org/doi/10.5555/1267074.1267076). Andrei Broder developed it further at AltaVista to filter near-duplicate web pages, and it's still the foundation of document fingerprinting today.

## How document fingerprinting works

Let's walk through how a fingerprint is built. At each step, we'll show the real output from [DocFGP](/docfgp/overview) for a short, one-page services agreement.

### Step 1: Extract the text

First, the text is extracted from the file. This is harder than it sounds, because every format stores text differently. A Word file stores paragraphs, a PDF stores characters at positions on a page, and a scan stores only pixels.

DocFGP converts Word and PowerPoint files to PDF first, so every format goes through the same extraction. Scanned pages are read with OCR (optical character recognition). OCR also runs on pages whose text is missing or garbled, and on pages that are mostly images.

### Step 2: Normalize the text

Next, differences that don't change the content are removed:

| Before                                   | After                  |
| ---------------------------------------- | ---------------------- |
| `ﬁle` (with a one-character ligature)    | `file`                 |
| `docu-` at the end of a line, `ment` on the next | `document`     |
| Line breaks and repeated spaces          | Single spaces          |
| `CONFIDENTIAL`                           | `confidential`         |
| `notice.`                                | `notice`               |

After this step, a Word file and its PDF export usually produce exactly the same text.

### Step 3: Take exact hashes

The fingerprint stores two SHA-256 hashes: one of the file's bytes, and one of the normalized text.

```json
"exact_hashes": {
  "raw_sha256": "5df3498da0e2f26039c0ff3d1ae2202d04c46a8bf9aabc38cd54be4b4d1950ca",
  "canonical_sha256": "498a171dc17130dae8095a107094398d4529f3bd50f5d727c4a7cad2b5decd72"
}
```

The first hash finds identical files. The second finds the same text in any format.

### Step 4: Break the text into shingles

A shingle is a short run of consecutive words. DocFGP uses five-word shingles, so the agreement's opening becomes "this services agreement is made", "services agreement is made on", "agreement is made on 1", and so on. Our 103-word agreement has 99 shingles.

Shingles are the pieces that make near-duplicate matching possible. If one word changes, only the five shingles that contain it change.

### Step 5: Compress the shingles with MinHash

A long document has tens of thousands of shingles, which is too many to store and compare for every document. MinHash compresses any number of shingles into a fixed-size sketch, 512 values in DocFGP:

```json
"minhash": ["006edf44d86de2b0", "001f8c4f644b56de", "…"]
```

The share of values two sketches have in common estimates the share of shingles the documents have in common. In other words, comparing two small sketches tells you how similar two large documents are.

DocFGP builds two sketches. One uses word shingles. The other uses 13-character shingles taken from the text with spaces and punctuation removed, which is more forgiving of OCR errors such as split or merged words.

### Step 6: Create lookup keys

To find similar documents in a large collection, you can't compare a new fingerprint with every stored one. So the sketches are cut into short lookup keys, such as `word:v2:00:092ecf4249aa7154a7c1c823`, that you can store in any database. Documents that share a key are likely to be similar, and only those need a full comparison. This technique is called locality-sensitive hashing (LSH), and it's explained in [How Near-Duplicate Document Detection Works](/blog/how-near-duplicate-document-detection-works).

### Step 7: Hash what each page looks like

Each page is also rendered as an image and reduced to a 64-bit perceptual hash, such as `1b2c0b038396fcfd`. Unlike SHA-256, a perceptual hash changes only a little when the image changes a little, so pages that look alike get hashes that differ in only a few bits. This lets scans match even when OCR can't read them.

### Step 8: Record the quality

Finally, the fingerprint records what it's based on: whether the text came from the file or from OCR, how confident the OCR was, and any warnings. If a document has no readable text, the fingerprint says so instead of failing silently.

## Example: fingerprints in action

To see how the pieces work together, we fingerprinted five files:

- `contract.docx`, the original agreement
- `contract.pdf`, its PDF export
- `contract-scan.jpg`, a simulated scan: the PDF rendered at 200 DPI, tilted 0.7°, blurred, sprinkled with noise, and saved as a JPEG
- `contract-v2.docx`, a new version with a different date and fee
- `meeting-notes.docx`, an unrelated memo

Then we compared each one with the original:

| File                 | Same text hash | Word similarity | Character similarity | Page hash difference |
| -------------------- | -------------- | --------------- | -------------------- | -------------------- |
| `contract.pdf`       | Yes            | 1.000           | 1.000                | 0 of 64 bits         |
| `contract-scan.jpg`  | No             | 0.883           | 0.941                | 4 of 64 bits         |
| `contract-v2.docx`   | No             | 0.816           | 0.889                | 4 of 64 bits         |
| `meeting-notes.docx` | No             | 0.000           | 0.000                | 20 of 64 bits        |

Here's what the results show:

- **The PDF is an exact match on text,** even though it's a completely different file.
- **The scan isn't an exact match,** because OCR made a few mistakes. It's still highly similar, especially on characters (0.941), because small OCR errors affect fewer 13-character shingles than five-word shingles.
- **The page hash can't tell the scan from the new version.** Both are 4 bits away from the original, because a changed fee barely changes how the page looks. Only the text reveals the difference.
- **The unrelated memo is far away on every measure.**

No single signal is enough on its own. That's why a good fingerprint combines several of them.

## What makes a good fingerprint

- **Deterministic.** The same file always produces the same fingerprint, so you can store fingerprints and compare new documents against them months later.
- **Versioned.** Each fingerprint records its format version, algorithm version, and settings, down to the OCR engine. Only compare fingerprints made with the same version.
- **Mostly fixed size.** The two sketches take about 20 KB as JSON, whether the document has one page or a hundred. The exact shingle counts grow with the document, and you can leave them out with `FingerprintConfig(include_shingle_counts=False)`.
- **Free of text.** A fingerprint stores hashes, not the document's text, so you can keep it after the original file is gone.

## Fingerprints vs. file hashes vs. embeddings

Fingerprints, file hashes, and embeddings all turn a document into something you can compare, but they answer different questions:

|                               | File hash          | Document fingerprint                       | Embedding                  |
| ----------------------------- | ------------------ | ------------------------------------------ | -------------------------- |
| Answers                       | Is it the same file? | Is it the same content, or nearly?       | Is it about the same thing? |
| Word file vs. its PDF         | Different          | Same                                       | Similar                    |
| Same template, different data | Different          | Similar, depending on how much is shared   | Very similar               |
| Same input, same output       | Yes                | Yes                                        | Only with the same model   |
| Shows why two documents match | No                 | Partly: shared shingles and matching pages | No                         |

Use file hashes to find identical files, fingerprints to find duplicates, and embeddings to find related documents.

## How to fingerprint documents with DocFGP

[DocFGP](/docfgp/overview) is an open-source Python library that builds fingerprints like the ones in this guide for PDF, DOCX, PPTX, and image files, including scans. It runs locally on your CPU.

### 1. Install DocFGP

```sh
pip install docfgp
```

### 2. Fingerprint a document

```python
from docfgp import Fingerprinter

record = Fingerprinter().fingerprint("contract.pdf").to_dict()

print(record["exact_hashes"]["canonical_sha256"])
print(record["quality"]["status"])  # text_and_visual
```

You can also fingerprint a file from the command line:

```sh
docfgp contract.pdf > contract.fingerprint.json
```

### 3. Store and compare fingerprints

Save each fingerprint as JSON in your database, index its lookup keys, and compare new documents with the fingerprints that share a key. The [Quick start](/docfgp/quick-start) shows how.

## Key takeaways

- A document fingerprint is a compact record of a document's content that you can compare with other fingerprints.
- Regular hashes change completely on any edit. Fingerprints hash many small pieces, so similar documents get similar fingerprints.
- A fingerprint is built in steps: extract and normalize the text, take exact hashes, build shingles and MinHash sketches, create lookup keys, and hash each page's appearance.
- Combining text and visual signals lets fingerprints match across formats, edits, and scans.
- Good fingerprints are deterministic and versioned, so you can store them and compare against them later.

## Frequently asked questions

### Can you recreate a document from its fingerprint?

No. A fingerprint stores hashes of the text, not the text itself.

### Do fingerprints work on scanned documents?

Yes. The text of a scan is read with OCR, and each page also gets a perceptual hash, so a scan can match even when OCR can't read it.

### How is a document fingerprint different from a checksum?

A checksum or file hash only tells you whether two files are identical. A fingerprint tells you whether two documents have the same content, and how similar they are when they don't.

### Can I compare fingerprints made with different versions?

Not reliably. Different versions can extract or hash text differently, so fingerprint all your documents with the same version, and fingerprint them again when you upgrade.
