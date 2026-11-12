---
title: DocFGP now supports scanned documents in 100+ languages
description: DocFGP by Zices can now read and compare scanned documents in more than 100 languages, including Chinese, Japanese, Korean, Arabic, Russian, and Hindi. Here is how to set it up.
slug: docfgp-scanned-documents-100-languages
---

DocFGP can now read scanned documents in more than 100 languages, so you can find duplicates and compare scans in Chinese, Japanese, Korean, Arabic, Russian, Hindi, and many more.

<!-- truncate -->

DocFGP reads the text of a scan with OCR. The standard install supports English and 55 other languages written in the Latin alphabet, such as French, German, and Spanish. For other languages, install the language pack:

```sh
pip install "docfgp[languages]"
```

Then set `ocr_language` to the language of your scans. This example compares a Simplified Chinese contract with a scan of it:

```python
from docfgp import Fingerprinter, FingerprintConfig

fingerprinter = Fingerprinter(FingerprintConfig(ocr_language="chi_sim"))
docx = fingerprinter.fingerprint("contract.zh.docx")
scan = fingerprinter.fingerprint("contract-scan.zh.jpg")

print(scan.quality.status)  # text_and_visual

docx_counts = dict(docx.shingle_counts)
shared = sum(min(count, docx_counts.get(value, 0)) for value, count in scan.shingle_counts)
print(shared / max(scan.shingle_total, 1))  # 1.0
```

`quality.status` is `text_and_visual`, which means OCR read the scan's text. The last line prints the scan's coverage, the share of its text that also appears in the Word file. A coverage of `1.0` means all of it does.

`chi_sim` is the code for Simplified Chinese. These are the codes for some other common languages:

| Language              | Code      |
| --------------------- | --------- |
| Chinese (Simplified)  | `chi_sim` |
| Chinese (Traditional) | `chi_tra` |
| Japanese              | `jpn`     |
| Korean                | `kor`     |
| Arabic                | `ara`     |
| Russian               | `rus`     |
| Ukrainian             | `ukr`     |
| Hindi                 | `hin`     |
| Thai                  | `tha`     |
| Hebrew                | `heb`     |
| Greek                 | `ell`     |
| Persian               | `fas`     |
| French                | `fra`     |
| German                | `deu`     |
| Spanish               | `spa`     |

For vertical Chinese, Japanese, or Korean text, add `_vert` to the code, as in `jpn_vert`. For scans that mix languages, join the codes with `+`, as in `chi_sim+eng`.

Always set the language of your scans. DocFGP uses English OCR by default, which can't read other scripts. A Chinese scan then has no text to compare, and a Russian scan gets the wrong text, so neither matches its original.

The command line takes the language too:

```sh
docfgp --ocr-language chi_sim contract-scan.zh.jpg
```
