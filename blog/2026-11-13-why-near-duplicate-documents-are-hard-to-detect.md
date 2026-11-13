---
title: Why Near-Duplicate Documents Are Hard to Detect and How to Do It
description: Eight reasons near-duplicate documents are hard to detect, from re-saved files to OCR errors and templates, and how DocFGP by Zices handles each one.
slug: why-near-duplicate-documents-are-hard-to-detect
---

**Near-duplicate documents are hard to detect because the same content can be stored in very different ways.** Re-saving a file changes its bytes, every format stores text differently, OCR misreads scans, and some scans can't be read at all. Meanwhile, documents built from the same template can look like duplicates when they aren't.

In this guide, you'll learn:

- The eight reasons near-duplicates are hard to detect
- The technique that solves each one, with test results
- Why no single technique works on its own
- How to detect near-duplicates reliably with DocFGP

<!-- truncate -->

## The eight challenges at a glance

| Challenge                              | Why it happens                                        | Solution                                     |
| -------------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| 1. Files change without edits          | Saving rewrites metadata such as timestamps           | Compare the text, not the file               |
| 2. Every format stores text differently | Word, PDF, and scans store text in unrelated ways     | Extract text the same way from every format  |
| 3. Formatting differences              | Capitalization, line breaks, ligatures, punctuation   | Normalize the text                           |
| 4. Edits are scattered                 | A few words change throughout the document            | Measure similarity with shingles             |
| 5. OCR makes mistakes                  | Scanned letters are misread, and words split or merge | Compare characters, not just words           |
| 6. Some scans can't be read            | Poor quality, handwriting, or faded copies            | Compare how the pages look                   |
| 7. Templates look alike                | Different documents share most of their text and layout | Rely on the text, and use higher thresholds |
| 8. There are too many pairs            | Pairs grow with the square of the number of documents | Use lookup keys to find candidates           |

The rest of this guide explains each challenge, with results from tests we ran with [DocFGP](/docfgp/overview) on a one-page services agreement and a few variations of it.

## 1. Files change even when the content doesn't

### The problem

The simplest way to compare files is a file hash, a short code calculated from a file's bytes. But a file's bytes change for many reasons that have nothing to do with its content.

A Word file is a ZIP archive of XML files, and saving it rewrites them, along with metadata such as the last-modified time. PDFs store creation dates, modification dates, and document IDs, which change when a file is exported again.

### In our test

We opened the agreement's Word file and saved it again without changing anything. The file hash changed. The text hash, a hash of the document's normalized text, stayed the same.

### The solution

Compare the text, not the file. A hash of the normalized text finds the same content no matter how the file was saved.

## 2. Every format stores text differently

### The problem

To compare text, you first have to extract it, and each format makes that hard in its own way:

- **Word** splits text into pieces called runs, which change whenever formatting changes, and also because of spell-check marks and editing sessions. A single word can be [split across several runs](https://docxtemplater.com/docs/deep-dive-into-docxtemplater-internals/).
- **PDF** stores characters at positions on the page, not words or paragraphs. Spaces often aren't stored at all and have to be guessed from the gaps between characters, and the [reading order has to be rebuilt](https://www.llamaindex.ai/blog/why-reading-pdfs-is-hard) from the layout.
- **PowerPoint** stores text in separate boxes that can be in any order.
- **Scans** contain no text at all, only pixels.

Extract the same document from a Word file and from its PDF with two different tools, and you'll often get slightly different text.

### The solution

Extract text from every format the same way. DocFGP converts Word and PowerPoint files to PDF first, so all formats go through one extraction process, and reads scanned pages with OCR (optical character recognition).

## 3. Small formatting differences add up

### The problem

Even when the extraction works, the same content can come out with small differences:

- Capitalization: `CONFIDENTIAL` vs. `Confidential`
- Hyphenation: `docu-` at the end of a line and `ment` on the next
- Ligatures: `ﬁ` stored as one character instead of `f` and `i`
- Quotes and punctuation: `“` vs. `"`, or a comma added
- Line breaks and spacing

Each of these changes the text hash.

### In our test

We gave DocFGP two pairs of Word files: a sentence with and without one comma, and a sentence in normal case with curly quotes vs. all capitals with straight quotes. Both pairs had different file hashes and the same text hash.

### The solution

Normalize the text before comparing it. DocFGP converts compatibility characters such as ligatures, rejoins hyphenated words, collapses spacing, lowercases everything, and keeps only the words.

## 4. Edits are scattered through the document

### The problem

A new version usually changes a few words in different places, such as a date, a name, or a price. Any change at all breaks the text hash, so you need a way to measure how much of the content is still the same.

### The solution

Measure similarity with shingles. A shingle is a short run of consecutive words, such as five. Two documents are similar when they share most of their shingles, and changing one word only affects the few shingles that contain it.

Shingles also handle reordering well. Moving a section changes only the shingles at its edges.

### In our test

| Change to the agreement                   | Word similarity |
| ----------------------------------------- | --------------- |
| New date and fee                          | 0.816           |
| First three paragraphs moved to the end   | 0.898           |

To learn how shingles and similarity scores work, read [How Near-Duplicate Document Detection Works](/blog/how-near-duplicate-document-detection-works).

## 5. OCR makes mistakes

### The problem

OCR reads text from images, and it [makes predictable mistakes](https://pdfbear.com/blog/why-your-scanned-pdf-has-wrong-letters-after-ocr): `rn` read as `m`, `l` as `1`, `O` as `0`, or `cl` as `d`, which turns "clearly" into "dearly". It also splits words ("in voice") and merges them ("thecontract"), especially on skewed or low-resolution scans.

Each mistake breaks the word shingles around it, so a scan looks less similar to its original than it really is.

### The solution

Compare characters as well as words. DocFGP builds a second similarity sketch from 13-character sequences, taken from the text with the spaces and punctuation removed. A misread letter affects fewer of these sequences, and split or merged words don't affect them at all.

### In our test

We simulated a scan of the agreement by rendering it as an image, tilting it 0.7°, blurring it, adding noise, and saving it as a JPEG. OCR read it with 90% confidence, but not perfectly:

| Measure              | Scan vs. original |
| -------------------- | ----------------- |
| Text hash            | Different         |
| Word similarity      | 0.883             |
| Character similarity | 0.941             |

The character similarity is much closer to the truth: it's the same document.

## 6. Some scans can't be read at all

### The problem

Some scans have no usable text: low-resolution faxes, faded copies, handwritten forms, or languages the OCR model doesn't support. With no text, none of the text-based techniques can work.

### The solution

Compare how the pages look. A perceptual hash reduces a page image to a short code, 64 bits in DocFGP, that changes only a little when the image changes a little. Similar pages get hashes that differ in only a few bits.

### In our test

We made a much worse scan: the agreement at low resolution, heavily blurred. OCR couldn't read it, and DocFGP reported it as `visual_only`, with the warning "No reliable text was extracted". But its page hash differed from the original's by only 2 of 64 bits, and it shared 2 of its 4 visual lookup keys with the original, so it could still be found and matched.

## 7. Templates look like duplicates

### The problem

This challenge is the opposite of the others: documents that look like near-duplicates but aren't. Invoices, contracts, forms, and reports built from the same template share most of their text and almost all of their layout, but they describe different things.

### In our test

We created two invoices from the same template, for different customers, items, and totals:

| Measure              | Invoice 1042 vs. invoice 1043 |
| -------------------- | ----------------------------- |
| Word similarity      | 0.443                         |
| Character similarity | 0.592                         |
| Page hash difference | 4 of 64 bits                  |

The page hashes say these invoices look almost the same, because they do. Only the text shows that they're different documents. In longer documents with more boilerplate, such as contracts, the text similarity rises too.

### The solution

- **Rely on the text** for templated documents, not on the page images.
- **Use a higher threshold** for document types that share templates.
- **Have a person review** matches for documents with financial or legal weight.

## 8. There are too many pairs

### The problem

To find every near-duplicate pair, you'd have to compare every document with every other one. The number of pairs grows with the square of the number of documents:

| Documents | Pairs             |
| --------- | ----------------- |
| 1,000     | 499,500           |
| 10,000    | About 50 million  |
| 1,000,000 | About 500 billion |

### The solution

Use lookup keys. Techniques called MinHash and LSH (locality-sensitive hashing) turn each document's fingerprint into short keys that similar documents are likely to share. You store the keys in a database, and only compare documents that share a key.

## Why no single technique works

Here are all of our tests side by side:

| Test                       | Same text hash | Word similarity | Character similarity | Page hash difference |
| -------------------------- | -------------- | --------------- | -------------------- | -------------------- |
| Re-saved file              | Yes            | 1.000           | 1.000                | 0 bits               |
| PDF export                 | Yes            | 1.000           | 1.000                | 0 bits               |
| Paragraphs moved           | No             | 0.898           | 0.961                | 18 bits              |
| New date and fee           | No             | 0.816           | 0.889                | 4 bits               |
| Readable scan              | No             | 0.883           | 0.941                | 4 bits               |
| Unreadable scan            | No             | No text         | No text              | 2 bits               |
| Invoice from same template | No             | 0.443           | 0.592                | 4 bits               |

Each technique fails somewhere:

- **The text hash** only catches exact text matches.
- **Word similarity** drops on OCR errors and fails without text.
- **Character similarity** handles OCR errors, but also fails without text.
- **Page hashes** miss moved paragraphs (18 bits) and can't tell an invoice from a different invoice on the same template (4 bits).

Together, they cover each other's gaps. That's why reliable near-duplicate detection combines text and visual signals.

## How to detect near-duplicates with DocFGP

[DocFGP](/docfgp/overview) is an open-source Python library that handles all eight challenges. It extracts and normalizes text from PDF, DOCX, PPTX, and image files, reads scans with OCR, and creates a fingerprint with text hashes, word and character similarity sketches, page hashes, and lookup keys. It runs locally on your CPU.

```sh
pip install docfgp
```

This example compares a document with the unreadable scan from challenge 6:

```python
from docfgp import Fingerprinter


def similarity(a, b, field):
    if not a[field] or not b[field]:
        return None
    return sum(x == y for x, y in zip(a[field], b[field])) / len(a[field])


def first_page_distance(a, b):
    if not a["page_hashes"] or not b["page_hashes"]:
        return None
    difference = int(a["page_hashes"][0]["phash"], 16) ^ int(b["page_hashes"][0]["phash"], 16)
    return bin(difference).count("1")


fingerprinter = Fingerprinter()
original = fingerprinter.fingerprint("contract.pdf").to_dict()
scan = fingerprinter.fingerprint("contract-bad-scan.png").to_dict()

print(scan["quality"]["status"])                  # visual_only
print(similarity(original, scan, "minhash"))      # None
print(first_page_distance(original, scan))        # 2
```

The `quality` field tells you which signals a fingerprint has: `text_and_visual`, `text_only`, `visual_only`, or `insufficient_evidence`. Check it before you decide how to compare two documents.

## Key takeaways

- The same content can be stored in very different ways, so file hashes miss most near-duplicates.
- Extract text the same way from every format, then normalize it, to turn many near-duplicates into exact text matches.
- Shingles measure similarity despite scattered edits and moved sections. Character shingles also handle OCR errors.
- Perceptual page hashes match scans that can't be read, but they can't tell documents on the same template apart.
- Use lookup keys to avoid comparing every pair, and combine text and visual signals so each covers the others' gaps.

## Frequently asked questions

### Why doesn't a file hash find near-duplicates?

A file hash changes if any byte of the file changes, including metadata that changes every time the file is saved. It only finds identical files.

### Can near-duplicate detection handle scanned documents?

Yes. Readable scans are compared by their OCR text, using character similarity to absorb OCR errors. Unreadable scans are compared by how their pages look.

### Why do invoices and forms get flagged as duplicates?

Documents built from the same template share most of their text and layout. Use a higher threshold for them, rely on the text rather than the page images, and have a person review the matches.

### Do I need machine learning to detect near-duplicates?

No. Hashing, shingles, MinHash, and perceptual hashing are deterministic and run on a CPU. Machine learning is only needed for OCR, and for comparing meaning, which is a different problem from finding duplicates.

To get started, follow the [DocFGP Quick start](/docfgp/quick-start), or read [Exact vs. Near-Duplicate Documents](/blog/exact-vs-near-duplicate-documents) to decide which duplicates to remove.
