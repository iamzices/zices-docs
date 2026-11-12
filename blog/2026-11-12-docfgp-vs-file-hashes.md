---
title: When to use DocFGP instead of file hashes
description: What file hashes miss when you compare documents, and when DocFGP by Zices is the better way to find duplicates.
slug: docfgp-vs-file-hashes
---

Use a file hash when you only need to know whether two files are byte-for-byte identical. Use DocFGP when the same document can reach you as a different file, such as when it's exported again, converted to another format, scanned, or edited.

<!-- truncate -->

A file hash, such as SHA-256, changes when any byte of a file changes. Many changes that leave a document the same still change its bytes. Saving it again, changing the author in its properties, converting it from DOCX to PDF, and scanning it can all produce a file with a different hash, so a file hash treats each one as a different document.

DocFGP fingerprints what a document says and what its pages look like, so it still matches them:

| Compared with the original        | SHA-256   | DocFGP                         |
| --------------------------------- | --------- | ------------------------------ |
| Renamed                           | Same      | Same `raw_sha256`              |
| Exported again with another font  | Different | Same `canonical_sha256`        |
| Saved as DOCX instead of PDF      | Different | Same `canonical_sha256`        |
| Different author, title, or dates | Different | Same `canonical_sha256`        |
| Scanned page                      | Different | Coverage 1.0                   |
| 8 of 800 words changed            | Different | Resemblance 0.904              |
| 200-word excerpt                  | Different | Coverage 1.0                   |
| Unrelated document                | Different | Resemblance and coverage 0     |

To try it, install DocFGP:

```sh
pip install docfgp
```

A DocFGP fingerprint includes the file hash as `raw_sha256`, so you can check both at once. `canonical_sha256` is a hash of the document's words instead of its bytes:

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
original = fingerprinter.fingerprint("contract.pdf")
exported = fingerprinter.fingerprint("contract-exported.pdf")

print(original.exact_hashes["raw_sha256"] == exported.exact_hashes["raw_sha256"])  # False
print(original.exact_hashes["canonical_sha256"] == exported.exact_hashes["canonical_sha256"])  # True
```

`contract-exported.pdf` is the same contract, exported again with a different font. The file hashes differ, but the canonical hashes match, because the words are the same.

When the words aren't exactly the same, measure how similar the documents are instead:

```python
def resemblance(a, b):
    return sum(x == y for x, y in zip(a.minhash, b.minhash)) / 512


def coverage(a, b):
    b_counts = dict(b.shingle_counts)
    shared = sum(min(count, b_counts.get(value, 0)) for value, count in a.shingle_counts)
    return shared / max(a.shingle_total, 1)
```

- **Resemblance** is the share of wording two documents have in common, from 0 to 1. Use it to find edited copies.
- **Coverage** is the share of document `a`'s text that also appears in document `b`. Use it to find scans and excerpts of a longer document.

If your files only ever arrive as exact copies, such as backups, a file hash is all you need.
