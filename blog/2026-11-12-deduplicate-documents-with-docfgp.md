---
title: How to deduplicate documents with DocFGP
description: A short, hands-on tutorial that uses DocFGP by Zices to find the duplicates in a folder of PDFs, Word files, slides, and scans.
slug: deduplicate-documents-with-docfgp
---

To deduplicate documents with DocFGP, fingerprint every document and compare the fingerprints. When two fingerprints are nearly the same, the documents are duplicates, so you keep only one of them.

<!-- truncate -->

First, install DocFGP:

```sh
pip install docfgp
```

A fingerprint summarizes what a document says and what its pages look like. Create one with `Fingerprinter().fingerprint()`. It works the same way for PDF, Word, PowerPoint, and image files, including scans:

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
original = fingerprinter.fingerprint("documents/contract.pdf")
edited = fingerprinter.fingerprint("documents/contract-v2.pdf")
```

To compare two fingerprints, count how many of their `minhash` values match. `minhash` is a list of 512 values that represents a document's wording, so the share that match is the share of wording the documents have in common. This is called resemblance:

```python
def resemblance(a, b):
    return sum(x == y for x, y in zip(a.minhash, b.minhash)) / 512


print(round(resemblance(original, edited), 3))  # 0.904
```

A resemblance of `1.0` means the same wording, and `0` means none in common. `contract-v2.pdf` has 8 of its 800 words changed, so it scores `0.904`. This guide treats documents with a resemblance of `0.9` or more as duplicates.

To deduplicate a whole folder, you could compare every document with every other one, but that gets slow as the folder grows. Use lookup keys instead. Each fingerprint has a set of `lookup_keys`, and documents that resemble each other almost always share at least one. So you only need to compare a document with the documents that share a key with it.

This script goes through a folder and prints the documents to keep:

```python
from collections import defaultdict
from pathlib import Path

from docfgp import Fingerprinter, FingerprintError

fingerprinter = Fingerprinter()
keep = {}  # Fingerprints of the documents to keep, by file name
keep_by_key = defaultdict(set)  # Names of the documents to keep, by lookup key


def resemblance(a, b):
    return sum(x == y for x, y in zip(a.minhash, b.minhash)) / 512


# Oldest first, so the original is kept instead of a later copy
for path in sorted(Path("documents").iterdir(), key=lambda p: p.stat().st_mtime):
    try:
        fingerprint = fingerprinter.fingerprint(path)
    except FingerprintError:
        continue  # Not a supported document, such as a .txt file or a folder

    # Find the documents to keep that share a lookup key with this one
    keys = [key for group in fingerprint.lookup_keys.values() for key in group]
    candidates = {name for key in keys for name in keep_by_key[key]}

    # Skip this document if it duplicates one of them
    if any(resemblance(fingerprint, keep[name]) >= 0.9 for name in candidates):
        continue

    keep[path.name] = fingerprint
    for key in keys:
        keep_by_key[key].add(path.name)

print("\n".join(keep))
```

The script skips anything that isn't a supported document. For each document, it finds the documents it already decided to keep that share a lookup key, and checks their resemblance. If one is a duplicate, the document is skipped. Otherwise, it's added to the documents to keep, along with its lookup keys.

Here is a folder to try it on:

| File                    | What it is                                         |
| ----------------------- | -------------------------------------------------- |
| `contract.pdf`          | A contract                                         |
| `contract (1).pdf`      | A copy of the contract                             |
| `contract-exported.pdf` | The contract, exported again with a different font |
| `contract.docx`         | The contract as a Word file                        |
| `contract-v2.pdf`       | The contract with 8 words changed                  |
| `contract-excerpt.pdf`  | 200 words from the contract                        |
| `invoice.png`           | An invoice                                         |
| `invoice-photo.jpg`     | A photo of the invoice                             |
| `invoice-scan.pdf`      | A scan of the invoice                              |
| `meeting-notes.pdf`     | Meeting notes                                      |
| `kickoff.pptx`          | Slides that quote the contract                     |

The script prints:

```text
contract.pdf
contract-excerpt.pdf
invoice.png
meeting-notes.pdf
kickoff.pptx
```

Every copy of the contract and the invoice is left out, even the Word file, the edited version, the photo, and the scan. The excerpt and the slides are kept, because they contain only part of the contract. The excerpt's resemblance to the contract is `0.248`.

To catch more heavily edited copies, lower `0.9`. To catch only near-exact copies, raise it.

Resemblance compares text, so it can't match a scan that OCR couldn't read. Its `fingerprint.quality.status` is `visual_only`, and the script always keeps it.
