---
title: What is DocFGP?
description: DocFGP by Zices is a Python library that creates text and visual fingerprints for finding duplicates, near-duplicates, and shared passages across document formats.
sidebar_position: 1
---

DocFGP (Document Fingerprint) by [Zices](https://github.com/iamzices) is a Python library that creates text and visual fingerprints for finding duplicates, near-duplicates, and shared passages across document formats. It supports PDF, DOCX, PPTX, PNG, JPEG, TIFF, BMP, and WebP files, including scanned documents, and runs locally on the CPU.

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
report = fingerprinter.fingerprint("report.pdf")
revised = fingerprinter.fingerprint("report-revised.pdf")

agreement = sum(a == b for a, b in zip(report.minhash, revised.minhash))
print(round(agreement / 512, 3))  # 0.904
```

## Why DocFGP?

A SHA-256 hash can only tell you that two files are byte-identical. Export a report again, convert it from DOCX to PDF, or fix a typo, and the hash changes even though the document is almost the same.

DocFGP fingerprints what a document says and what its pages look like, so it can still find those documents. Your application stores the fingerprints, compares them, and decides what counts as a match. To install it and compare documents, follow the [Quick start](./quick-start.md).

## How it works

DocFGP extracts the text of each page, using OCR for scanned pages, and renders the page as an image. It then normalizes the text and hashes it, along with the page images, into a fingerprint that can answer these questions:

| Question                                             | Field                               | Evidence                                               |
| ---------------------------------------------------- | ----------------------------------- | ------------------------------------------------------ |
| Are the files byte-identical?                        | `exact_hashes["raw_sha256"]`        | Raw SHA-256                                            |
| Did extraction produce the same text across formats? | `exact_hashes["canonical_sha256"]`  | Nonempty canonical SHA-256                             |
| Are the documents broadly similar?                   | `minhash`, `char_minhash`           | Word and character MinHash, reached through LSH keys   |
| Is one document substantially contained in another?  | `passage_anchors`, `shingle_counts` | Passage anchors, then hashed-shingle occurrence counts |
| Do scanned pages look alike?                         | `page_hashes`                       | Per-page perceptual hashes and visual keys             |

The same file and tool versions always produce the same fingerprint. Shared templates, repeated footers, and OCR errors can affect scores. For details and measured results, see the [methodology](https://github.com/iamzices/docfgp-document-fingerprint/blob/main/docs/methodology.md).

This is how five files compare with an 800-word PDF. Resemblance estimates how much text two files have in common, and coverage is how much of the compared file appears in the original:

| Compared file             | Byte-identical | Same canonical text | Resemblance | Coverage |
| ------------------------- | -------------- | ------------------- | ----------- | -------- |
| Exact copy                | Yes            | Yes                 | 1.000       | 1.000    |
| Same text, new line wraps | No             | Yes                 | 1.000       | 1.000    |
| 8 words changed           | No             | No                  | 0.904       | 0.952    |
| 200-word excerpt          | No             | No                  | 0.252       | 1.000    |
| Unrelated document        | No             | No                  | 0.000       | 0.000    |
