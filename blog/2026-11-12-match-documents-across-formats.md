---
title: "Is this DOCX the same as that PDF? How to match documents across formats with DocFGP"
description: How to check whether a DOCX, PPTX, PDF, or scanned document has the same content as another file, with short DocFGP by Zices examples.
slug: match-documents-across-formats
---

To check whether a DOCX and a PDF are the same document, fingerprint both with DocFGP and compare their `canonical_sha256`. If the hashes are equal, the documents contain the same words. For a scanned document, compare coverage instead, which measures how much of the scan's text is in the other document.

<!-- truncate -->

First, install DocFGP:

```sh
pip install docfgp
```

A normal file hash can't answer this question. A DOCX and a PDF store the same text in completely different ways, so their bytes, and their hashes, never match.

DocFGP reads the text of each document instead. `canonical_sha256` is a hash of that text, after DocFGP ignores differences in case, punctuation, spacing, and line breaks. So it depends only on the words and their order:

```python
from docfgp import Fingerprinter

fingerprinter = Fingerprinter()
docx = fingerprinter.fingerprint("contract.docx")
pdf = fingerprinter.fingerprint("contract.pdf")

canonical = docx.exact_hashes["canonical_sha256"]
print(canonical is not None and canonical == pdf.exact_hashes["canonical_sha256"])  # True
```

`canonical_sha256` is `None` when a document has no text, such as a blank page, so check for `None` first. Otherwise, two blank documents would match.

Because the hash depends only on the words, it stays the same when the format, fonts, page layout, file name, or metadata such as the author change. If any visible word changes, the hash changes too.

A scanned document is different, because DocFGP has to read its text with OCR. OCR can misread a character, and a scan often covers only some of the original's pages, so a scan rarely has the same `canonical_sha256` as the original. Compare coverage instead. Coverage is the share of one document's text that also appears in the other:

```python
scan = fingerprinter.fingerprint("contract-scan.jpg")
print(scan.quality.status)  # text_and_visual

pdf_counts = dict(pdf.shingle_counts)
shared = sum(min(count, pdf_counts.get(value, 0)) for value, count in scan.shingle_counts)
print(shared / max(scan.shingle_total, 1))  # 1.0
```

`shingle_counts` lists a hash of each five-word sequence in a document and how many times it appears. The code counts how many of the scan's sequences also appear in the PDF and divides by the scan's total. A coverage of `1.0` means all of the scan's text is in the PDF.

OCR errors lower coverage, because each misread word breaks the five-word sequences around it. In our tests, a clear scan of a contract page scored `1.0` and a low-resolution scan `0.89`. Unrelated documents score close to `0`. Start by treating a coverage of `0.8` or more as a match, then adjust it for your own scans.

Check `quality` before you compare a scan. If `quality.status` is `visual_only`, OCR couldn't read any text from the scan, so there is no text to compare. Each page in `quality.pages` also has an `ocr_confidence` from 0 to 100. Below about 60, OCR misreads enough words that coverage is unreliable.

DocFGP reads PDF, DOCX, PPTX, PNG, JPEG, TIFF, BMP, and WebP files. To read scans in Chinese, Arabic, Cyrillic, or other non-Latin scripts, install `docfgp[languages]` and set `ocr_language` in `FingerprintConfig`.
