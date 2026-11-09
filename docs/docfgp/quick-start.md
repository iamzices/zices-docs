---
title: Quick start
description: Install DocFGP by Zices, fingerprint a PDF, DOCX, PPTX, or scanned document, and compare fingerprints to find duplicates, near-duplicates, and shared passages.
sidebar_position: 4
---

Requires Python 3.11+.

## Install

```sh
pip install docfgp
```

## Fingerprint a PDF

```python
from docfgp import Fingerprinter

fingerprint = Fingerprinter().fingerprint("report.pdf")
record = fingerprint.to_dict()

print(record["quality"]["status"])  # text_and_visual
print(record["exact_hashes"]["raw_sha256"])
```

## Fingerprint a DOCX or PPTX file

Install [office2pdf](https://github.com/developer0hye/office2pdf), or download a [prebuilt binary](https://github.com/developer0hye/office2pdf/releases) and add it to your `PATH`:

```sh
cargo install office2pdf-cli
```

office2pdf is required for DOCX and PPTX. Without it, they raise `FingerprintError`.

```python
from docfgp import Fingerprinter

fingerprint = Fingerprinter().fingerprint("report.docx")

print(fingerprint.source_format)  # docx
```

## Fingerprint a scanned document

Install [Tesseract 5](https://tesseract-ocr.github.io/tessdoc/Installation.html) and add it to your `PATH`. OCR failure leaves a warning and a visual-only result, so inspect `quality.status`, page provenance, and warnings before using a fingerprint, as in [Quality status](./api-reference.md#quality-status).

```python
from docfgp import Fingerprinter

fingerprint = Fingerprinter().fingerprint("scan.png")

print(fingerprint.quality.status)  # text_and_visual
```

## Compare two documents

The application calculates the evidence needed for its decision from the two fingerprints. `canonical_sha256` is `None` for a document with no extracted text, so compare only nonempty canonical hashes.

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
a = fingerprinter.fingerprint("report.pdf")
b = fingerprinter.fingerprint("report-revised.pdf")

# Byte identity
byte_identical = a.exact_hashes["raw_sha256"] == b.exact_hashes["raw_sha256"]

# Identity of extracted normalized tokens, across formats
canonical = a.exact_hashes["canonical_sha256"]
same_canonical_text = canonical is not None and canonical == b.exact_hashes["canonical_sha256"]

# Set resemblance, estimated from MinHash agreement
resemblance = sum(x == y for x, y in zip(a.minhash, b.minhash)) / 512

# Share of a's hashed five-word shingle occurrences that also occur in b
b_counts = dict(b.shingle_counts)
shared = sum(min(count, b_counts.get(value, 0)) for value, count in a.shingle_counts)
coverage = shared / max(a.shingle_total, 1)

print(byte_identical, same_canonical_text, round(resemblance, 3), round(coverage, 3))  # False False 0.904 0.952
```

Coverage is directional. If a document with 100 hashed five-word occurrences shares 95 occurrences with a document containing 1,000, coverage is 95% from the smaller document's direction and 9.5% from the larger document's direction.

Hamming distance between perceptual hashes describes visual similarity. A lower distance out of 64 bits means the pages look more alike.

```python
page_a, page_b = a.page_hashes[0], b.page_hashes[0]
distance = (int(page_a.phash, 16) ^ int(page_b.phash, 16)).bit_count()
```

## Find candidates in a collection

Index the entries of each fingerprint's `lookup_keys`, then retrieve candidate fingerprints through those indexes. Query every key group, because a short excerpt may share only `passage` keys with the full document.

```python
from collections import defaultdict
from pathlib import Path

from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
index = defaultdict(set)

for path in Path("documents").glob("*.pdf"):
    for keys in fingerprinter.fingerprint(path).lookup_keys.values():
        for key in keys:
            index[key].add(path.name)

query = fingerprinter.fingerprint("new-report.pdf")
candidates = {
    name
    for keys in query.lookup_keys.values()
    for key in keys
    for name in index.get(key, ())
}
print(candidates)
```

A shared key makes a document a candidate, not a match, so score candidate pairs with the comparisons above. Store the serialized result with its `schema_version` and `algorithm_version`, and compare only compatible versions.

## CLI

```sh
docfgp report.pdf > report.fingerprint.json
```
