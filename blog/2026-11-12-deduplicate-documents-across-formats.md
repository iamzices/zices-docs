---
title: "How to Deduplicate Documents Across Formats: PDF, Word, PowerPoint, and Scans"
description: Find the same document saved as a PDF, Word file, slide deck, or scan, and keep one copy. A step-by-step guide with tests, using DocFGP by Zices.
slug: deduplicate-documents-across-formats
---

**To deduplicate documents across formats, turn every file into text the same way, then compare the text instead of the files.** Word files, PDFs, and slides with the same content usually produce identical text, so a hash of that text matches them exactly. Scans are read with OCR, which makes mistakes, so they need a similarity score and sometimes a person to check. Scans with no readable text can only be compared by how their pages look.

In this guide, you'll learn:

- Why the same document ends up in many formats, and why duplicate finders miss it
- How cross-format deduplication works
- How to match Word files, PDFs, and slides exactly
- How to match scans, and how scan quality affects the result
- How to choose which copy to keep, with a complete script

<!-- truncate -->

## Why the same document ends up in many formats

A document rarely stays in one file. It's written in Word, exported to PDF to send, pasted into a slide deck for a meeting, printed, signed, and scanned back in. Each step creates a new file in a new format with the same content.

eDiscovery teams have dealt with this for years. In a [technical explanation of near-duplicates](https://cloudnine.com/ediscoverydaily/electronic-discovery/a-technical-explanation-of-near-dupes-ediscovery-tutorial/), CloudNine gives two classic examples: a Word document published to PDF, "where the content is the same, but the file format is different, so the hash value will be different", and a Word document alongside a scan of its printout.

## Why duplicate finders miss them

Most duplicate finders compare file hashes, short codes calculated from a file's bytes. A Word file and a PDF of the same document share almost no bytes, so their hashes never match. Some tools also compare document properties, such as the title or word count, which helps with re-saved copies of the same file type. But a scan has no text or properties at all, only pixels.

To find duplicates across formats, you have to compare what the documents say.

## How cross-format deduplication works

Cross-format deduplication has three parts.

**1. Extract the text the same way from every format.** [DocFGP](/docfgp/overview), the open-source Python library used in this guide, converts Word and PowerPoint files to PDF first, so every format goes through the same text extraction. It runs OCR (optical character recognition) on PDF pages with no text, with garbled text, or where images cover at least half the page. If a scanned PDF already has a text layer from the scanner's OCR, DocFGP keeps it and adds only the words it doesn't cover. Image files are always read with OCR, and each frame of a multi-page TIFF counts as a page.

**2. Normalize the text and hash it.** Differences in capitalization, punctuation, spacing, and line breaks are removed, so the same words produce the same text hash in any format.

**3. Compare with the right score for each kind of document:**

| Document               | Score              | What it measures                                       |
| ---------------------- | ------------------ | ------------------------------------------------------ |
| Has real text          | Resemblance        | How much wording two documents share, from 0 to 1      |
| Scan read with OCR     | Coverage           | How much of the scan's text appears in the other document |
| Scan with no text      | Page similarity    | How alike the page images look                         |

The rest of this guide walks through each step with real test results.

## Our test files

We saved one short services agreement in every format, and added an edited version and an unrelated memo:

| File                   | What it is                                           |
| ---------------------- | ---------------------------------------------------- |
| `contract.docx`        | The original Word file                               |
| `contract.pdf`         | The Word file exported to PDF                        |
| `contract.pptx`        | The same text on a PowerPoint slide                  |
| `contract-scanned.pdf` | A clean scan, saved as a PDF                         |
| `contract-scan.tiff`   | A slightly tilted, noisy scan, saved as a TIFF image |
| `contract-75dpi.png`   | A very low-resolution scan                           |
| `contract-fax.png`     | A blurry copy that OCR can't read                    |
| `contract-v2.docx`     | A new version with a different date and fee          |
| `meeting-notes.docx`   | An unrelated memo                                    |

## Step 1: Fingerprint every file

Install DocFGP:

```sh
pip install docfgp
```

Then fingerprint each file. The same code works for every format:

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
for name in ["contract.docx", "contract.pdf", "contract.pptx", "contract-scan.tiff", "contract-fax.png"]:
    fingerprint = fingerprinter.fingerprint(name)
    text_hash = fingerprint.exact_hashes["canonical_sha256"]
    print(f"{name:20} {fingerprint.source_format:5} {fingerprint.quality.status:16} {text_hash[:12] if text_hash else None}")
```

```text
contract.docx        docx  text_and_visual  498a171dc171
contract.pdf         pdf   text_and_visual  498a171dc171
contract.pptx        pptx  text_and_visual  498a171dc171
contract-scan.tiff   tiff  text_and_visual  49efde63d180
contract-fax.png     png   visual_only      None
```

Already, you can see the three cases: the Word file, the PDF, and the slide share a text hash, the scan has text that doesn't quite match, and the fax has no text at all (`visual_only`).

## Step 2: Match the same text across formats

Start with the text hash. It's instant and certain: two documents with the same text hash contain the same words in the same order.

| File                   | Same text hash as `contract.docx` | Page hash difference |
| ---------------------- | --------------------------------- | -------------------- |
| `contract.pdf`         | Yes                               | 0 of 64 bits         |
| `contract.pptx`        | Yes                               | 18 of 64 bits        |
| `contract-scanned.pdf` | Yes                               | 4 of 64 bits         |

The clean scan matched exactly, too. When OCR reads every word correctly, a scan is no different from a digital copy.

The page hash column shows something important. DocFGP also stores a 64-bit hash of what each page looks like, and the slide's differs by 18 bits, because a slide is laid out differently from a page. **Never match documents across formats by how their pages look.** Layouts change between formats. The text doesn't.

## Step 3: Match scans with coverage

Most scans won't match exactly. OCR misreads a few characters, and each mistake changes the text hash. For scans, measure how much of the scan's text appears in the other document. This is called coverage.

### Why coverage works better than resemblance for scans

Scans often contain only part of a document, such as the signature page or the first few pages. To test this, we made a two-page version of the agreement with an appendix, and scanned only the first page:

| Measure                                 | First-page scan vs. two-page agreement |
| --------------------------------------- | -------------------------------------- |
| Resemblance                             | 0.479                                  |
| Coverage of the scan in the agreement   | 1.000                                  |

Resemblance compares the whole of both documents, so the missing appendix cuts the score in half. Coverage asks whether the scan's text is in the agreement, and every word of it is.

### How scan quality affects matching

Scan quality decides whether coverage works at all. We scanned the agreement at different resolutions, tilted it, and added noise, then compared each scan with the original:

| Scan                  | OCR confidence | Same text hash | Coverage |
| --------------------- | -------------- | -------------- | -------- |
| 300 DPI               | 96%            | Yes            | 1.000    |
| 150 DPI               | 97%            | Yes            | 1.000    |
| 100 DPI               | 95%            | Yes            | 1.000    |
| 75 DPI                | 86%            | No             | 0.798    |
| 300 DPI, tilted 2°    | 96%            | Yes            | 1.000    |
| 300 DPI, tilted 5°    | 94%            | No             | 0.404    |
| 300 DPI, heavy noise  | No text        | No             | No text  |

Three results stand out:

- **Resolution matters only at the low end.** Our agreement used normal 11-point text, which OCR read perfectly down to 100 DPI. At 75 DPI, it started misreading words: "Ltd" became "led", "sixty" became "sity", and "it" became "t". The [Tesseract documentation](https://github.com/tesseract-ocr/tessdoc/blob/main/ImproveQuality.md) recommends at least 300 DPI, which leaves room for smaller text and worse originals.
- **Tilt is worse than low resolution.** A 2° tilt made no difference. At 5°, OCR still read individual words with 94% confidence, but it broke the tilted lines into pieces, put them out of order, and dropped some words. Coverage fell to 0.404. A high OCR confidence doesn't mean the text is usable.
- **Heavy noise can hide all the text.** With 8% of the pixels randomly changed, OCR found no reliable text, and DocFGP reported the scan as `visual_only`.

### Choosing thresholds for scans

In our tests, readable scans of the agreement had a coverage of 0.95 to 1.0. The 75 DPI scan scored 0.80. But the edited version, `contract-v2.docx`, has a coverage of 0.899 in the original, so a scan of an edited version can score as high as a poor scan of the original. Coverage alone can't tell them apart.

That's why scans get two thresholds:

- **0.9 or more:** a duplicate.
- **Between 0.7 and 0.9:** a person checks it.
- **Below 0.7:** a different document.

## Step 4: Flag scans without text

When OCR can't read a scan, the only thing left to compare is how its pages look. DocFGP's fingerprint includes a perceptual hash for each page, which changes only a little when the image changes a little, so a blurry copy still looks close to the original.

Our unreadable fax had a page similarity of 0.97 with the original, only 2 of 64 bits different. But it was also 0.97 with `contract-v2.docx`, because a new date and fee barely change how a page looks. **Page similarity can tell you which document a scan looks like, but not which version.** Always have a person check these matches.

## Step 5: Choose which copy to keep

When you find the same document in several formats, decide which one to keep:

- **Prefer files with real text over scans.** Their text is exact, which is better for search, AI, and future comparisons.
- **Then prefer the format you use.** PDF suits final, shared, and archived documents. Word suits documents people still edit. Slides are rarely the best copy of a full document.
- **Keep scans that matter.** A signed scan has the same text as the unsigned PDF, but it may be the legally important copy.

The easiest way to apply these rules is to sort your files by preference before you compare them, so the best copy of each document is always seen first and kept.

## Complete script

This script puts all five steps together. It fingerprints every file in a `documents` folder, sorts them by preference, and prints a decision for each one:

```python
from collections import defaultdict
from pathlib import Path

from docfgp import Fingerprinter, FingerprintError

TEXT_MATCH = 0.9  # Resemblance at which a document with real text is a duplicate
SCAN_MATCH = 0.9  # Coverage at which a scan is a duplicate
SCAN_REVIEW = 0.7  # Coverage at which a scan goes to a person
PAGE_REVIEW = 0.9  # Page similarity at which a scan without text goes to a person
FORMAT_ORDER = ["pdf", "docx", "pptx"]  # Formats to keep, best first


def is_scan(fingerprint):
    return any(page.source == "ocr" for page in fingerprint.quality.pages)


def has_text(fingerprint):
    return fingerprint.quality.status in ("text_and_visual", "text_only")


def keep_order(item):
    path, fingerprint = item
    formats = FORMAT_ORDER + [fingerprint.source_format]
    return not has_text(fingerprint), is_scan(fingerprint), formats.index(fingerprint.source_format), path.name


def resemblance(kept, new):
    if not kept.minhash or not new.minhash:
        return 0.0
    return sum(x == y for x, y in zip(kept.minhash, new.minhash)) / len(kept.minhash)


def coverage(kept, new):
    if not new.shingle_total:
        return 0.0
    counts = dict(kept.shingle_counts)
    found = sum(min(count, counts.get(shingle, 0)) for shingle, count in new.shingle_counts)
    return found / new.shingle_total


def page_similarity(kept, new):
    if not kept.page_hashes or not new.page_hashes:
        return 0.0
    different_bits = bin(int(kept.page_hashes[0].phash, 16) ^ int(new.page_hashes[0].phash, 16)).count("1")
    return 1 - different_bits / 64


def similarity(kept, new):
    if not has_text(new):
        return page_similarity(kept, new)
    if is_scan(new):
        return coverage(kept, new)
    return resemblance(kept, new)


def decide(new, score):
    if not has_text(new):
        return "review" if score >= PAGE_REVIEW else "keep"
    if is_scan(new):
        return "duplicate" if score >= SCAN_MATCH else "review" if score >= SCAN_REVIEW else "keep"
    return "duplicate" if score >= TEXT_MATCH else "keep"


fingerprinter = Fingerprinter()
files = []
for path in Path("documents").iterdir():
    try:
        files.append((path, fingerprinter.fingerprint(path)))
    except FingerprintError as error:
        print(f"{path.name}: skipped ({error})")

kept = {}
kept_by_text = {}
kept_by_key = defaultdict(set)

for path, fingerprint in sorted(files, key=keep_order):
    text_hash = fingerprint.exact_hashes["canonical_sha256"]
    if text_hash in kept_by_text:
        print(f"{path.name}: duplicate of {kept_by_text[text_hash].name} (same text)")
        continue

    keys = [key for group in fingerprint.lookup_keys.values() for key in group]
    candidates = {other for key in keys for other in kept_by_key[key]}
    best = max(sorted(candidates), key=lambda other: similarity(kept[other], fingerprint), default=None)
    score = similarity(kept[best], fingerprint) if best else 0.0
    decision = decide(fingerprint, score)

    if decision == "duplicate":
        print(f"{path.name}: duplicate of {best.name} ({score:.2f})")
    elif decision == "review":
        print(f"{path.name}: check by hand against {best.name} ({score:.2f})")
    else:
        print(f"{path.name}: keep")
        kept[path] = fingerprint
        if text_hash:
            kept_by_text[text_hash] = path
        for key in keys:
            kept_by_key[key].add(path)
```

Here's how it works:

- **`keep_order`** sorts files with real text first, then scans, then files with no text, and within each group by `FORMAT_ORDER`. The first copy of each document to be seen is the one kept.
- **The text hash** catches same-text copies instantly.
- **Lookup keys** find the kept documents that are likely to be similar, so each file is only compared with a few others.
- **`similarity`** picks the right score for each kind of document, and **`decide`** applies the thresholds.
- **Files sent to review** aren't used as originals for later files, so an uncertain match can't cause more.

On our test folder, it prints:

```text
contract.pdf: keep
contract-v2.docx: keep
contract.docx: duplicate of contract.pdf (same text)
meeting-notes.docx: keep
contract.pptx: duplicate of contract.pdf (same text)
contract-scanned.pdf: duplicate of contract.pdf (same text)
contract-75dpi.png: check by hand against contract.pdf (0.80)
contract-scan.tiff: duplicate of contract.pdf (0.95)
contract-fax.png: check by hand against contract-v2.docx (0.97)
```

Every result follows from the tests above. The Word file, slide, and clean scan matched by text hash. The tilted TIFF scan matched by coverage. The 75 DPI scan landed in the review band. The edited version was kept as its own document. And the fax was sent to a person, matched by its page images to the wrong version of the contract, which is exactly why page-only matches need a check.

To keep Word files instead of PDFs, put `"docx"` first in `FORMAT_ORDER`.

## Tips for better scan matching

- **Scan at 300 DPI or more,** especially for small print.
- **Straighten pages** before fingerprinting. Most scanning software has a deskew option.
- **Avoid heavy compression and noise,** such as faxed or photocopied-again pages.
- **Check `quality.status`** for every scan. `visual_only` means no text was found.
- **For scans in Chinese, Arabic, Cyrillic, or other non-Latin scripts,** install the language pack with `pip install "docfgp[languages]"` and set the OCR language, as described in [DocFGP now supports scanned documents in 100+ languages](/blog/docfgp-scanned-documents-100-languages).

## Key takeaways

- The same document ends up as a Word file, a PDF, slides, and scans, and file hashes can't match any of them.
- Extract text the same way from every format and compare text hashes. This matches Word files, PDFs, slides, and clean scans exactly.
- Use resemblance for documents with real text, coverage for scans, and page similarity only for scans with no text.
- Scan quality matters: low resolution, tilt, and noise all lower coverage, and a high OCR confidence doesn't guarantee usable text.
- Keep the copy with real text in the format you use, keep scans that matter, and send uncertain matches to a person.

## Frequently asked questions

### Can I match a scan to the Word file it was printed from?

Yes. A clean scan often has exactly the same text hash as the Word file. Otherwise, compare its coverage in the Word file.

### Why did my slide deck match the full document?

Because the slide contains the same words in the same order. Decks that quote only part of a document won't match by text hash, but their coverage in the document will be high.

### Should I compare page images across formats?

No. A slide, a page, and a scan of the same content are laid out differently. Use page images only for scans that OCR can't read, and have a person confirm the match.

### Which formats can DocFGP read?

PDF, DOCX, PPTX, PNG, JPEG, TIFF, BMP, and WebP. Other files raise a `FingerprintError`, and the script skips them.

For a shorter tutorial that deduplicates a folder with resemblance alone, read [How to deduplicate documents with DocFGP](/blog/deduplicate-documents-with-docfgp). To learn about the kinds of duplicates, read [Exact vs. Near-Duplicate Documents](/blog/exact-vs-near-duplicate-documents).
