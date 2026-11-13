---
title: How to Find and Remove Near-Duplicate Documents Before Building a RAG Pipeline
description: Why duplicate documents hurt RAG retrieval, and how to remove them before you chunk and embed, step by step, with DocFGP by Zices.
slug: find-and-remove-near-duplicate-documents-before-rag
---

**To remove near-duplicate documents before building a RAG pipeline, fingerprint every document, group the ones that are the same or nearly the same, keep the best copy from each group, and only chunk and embed the copies you keep.** Doing this at the document level, before chunking, catches copies that chunk-level checks and exact hashes miss, such as a Word file and its PDF or a scanned printout.

In this guide, you'll learn:

- Why duplicate documents make RAG answers worse
- Why the deduplication built into RAG frameworks isn't enough
- How to find and remove near-duplicates, step by step
- How to choose which copy to keep, and keep your knowledge base clean over time

<!-- truncate -->

## Why duplicates hurt RAG

In a RAG (retrieval-augmented generation) pipeline, a question is answered in two steps. First, the system retrieves the few chunks of your documents that best match the question, often the top 5 or 10. Then a language model writes an answer from those chunks.

Duplicates break the first step in several ways.

### They crowd out other sources

Copies of the same document produce near-identical chunks, so they match the same questions and fill the same top results. In a [2026 bug report](https://github.com/amd/gaia/issues/4740) for AMD's GAIA project, one document indexed under two names took up 40% of the top five chunks given to the model, pushing out other relevant evidence. The model then answers from fewer distinct sources than you think it has.

### Old versions contradict new ones

Knowledge bases collect versions: a policy draft and the final policy, last year's price list and this year's. If both are indexed, the retriever may return either one, and the model can't tell which is current. For example, if one version of a returns policy says 30 days and the next says 14, the answer depends on which chunk ranks higher.

### Every copy costs money

Each copy is chunked, embedded, stored in your vector database, and searched on every query. If your documents went through OCR or LLM-based parsing first, you paid for that step on every copy too.

### Citations get confusing

When an answer cites three files that turn out to be the same document, users lose trust in the citations, and it's harder to tell which source is authoritative.

## Where duplicates come from

Duplicates in a knowledge base usually come from how the documents were collected:

- **Exports and conversions.** The same document exists as a Word file, a PDF, and sometimes a slide deck.
- **Email attachments.** Each person who received a file may have saved their own copy.
- **Versions.** `pricing.pdf`, `pricing-v2.pdf`, and `pricing-final.pdf` sit side by side.
- **Scans.** Printed documents are scanned back in, sometimes more than once.
- **Overlapping sources.** The same files are synced from a shared drive and also uploaded by hand, or a connector is run twice.

## Why built-in deduplication isn't enough

Most RAG frameworks already deduplicate, but only exact matches. The [LlamaIndex ingestion pipeline](https://docs.llamaindex.ai/en/stable/module_guides/loading/ingestion_pipeline/) skips documents whose hash it has already seen, and the [LangChain indexing API](https://reference.langchain.com/python/langchain-core/indexing/api/index) tracks a hash of each document's content and metadata. These features are designed to avoid re-indexing the same document when you run ingestion again.

They don't recognize the same content in a different file. A Word file and its PDF have different bytes, and their extracted text usually differs in small ways, such as line breaks, so their hashes differ. A scan has OCR errors, and an edited version has a few changed words. All of them get indexed as separate documents.

The GAIA bug report is a good example. Its upload screen already rejected byte-identical files, but copies "whose bytes differ but whose extracted text is the same" still got through.

## Document-level vs. chunk-level deduplication

You can deduplicate at three points in a RAG pipeline:

| Where                 | What it catches                                         | Limitations                                         |
| --------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| Documents, before chunking | Copies, conversions, scans, and versions of whole documents | Doesn't catch repeated paragraphs inside different documents |
| Chunks, after chunking | Repeated boilerplate, such as identical disclaimers    | A converted file splits into slightly different chunks, so its copies are missed |
| Results, at query time | Near-identical chunks in the top results               | You've already paid to embed and store the copies   |

Start at the document level. It removes the most duplicates for the least effort, and every later step works with less data. If your documents share a lot of boilerplate, you can add chunk-level or query-time filtering afterward.

## How to remove near-duplicate documents, step by step

This guide uses [DocFGP](/docfgp/overview), an open-source Python library that fingerprints PDF, DOCX, PPTX, and image files, including scans. A complete script follows the steps.

### Step 1: Fingerprint every document

Run every document through DocFGP before chunking. Each fingerprint includes a file hash, a hash of the normalized text, two similarity sketches, lookup keys, and a quality report that says whether the text came from the file or from OCR.

### Step 2: Remove exact copies and same-text copies

Compare the file hashes to find identical files, then compare the text hashes to find the same text in different files, such as a Word file and its PDF. These checks are instant and certain.

### Step 3: Find near-duplicate candidates

For the remaining documents, look up each fingerprint's LSH keys. Documents that share a key with one you've already kept are candidates. This avoids comparing every pair. To learn how this works, see [How Near-Duplicate Document Detection Works](/blog/how-near-duplicate-document-detection-works).

### Step 4: Verify with a similarity threshold

Compare each candidate's similarity sketches and treat it as a duplicate only if it's above your threshold. A threshold of 0.9 is a cautious starting point. DocFGP has two sketches: one from words and one from characters. The character sketch is more forgiving of OCR errors, so using the higher of the two helps scans match their originals.

### Step 5: Choose the copy to keep

Decide which copy in each group to index. Good rules are:

- **Prefer real text over scans.** A Word file or a digital PDF chunks and embeds better than OCR output.
- **Prefer the newest version,** if your documents change over time.
- **Prefer the authoritative source,** such as the official policy site over someone's email attachment.

The easiest way to apply these rules is to sort your documents by preference first, so the best copy in each group is always the first one seen.

### Step 6: Record the duplicates

Don't just drop the other copies. Store their paths with the kept copy, for example as metadata in your vector database. You'll need them for two things:

- **Citations,** so you can show every location of a document.
- **Permissions.** If your RAG system filters results by user access, a user who can only see one of the duplicates should still get the content.

### Step 7: Chunk and embed only the kept copies

Pass only the kept documents to your chunker and embedding model.

### Step 8: Check new documents on every sync

Save the fingerprints. When new documents arrive, fingerprint them and check them against the saved fingerprints before indexing. Only compare fingerprints made with the same DocFGP version, and fingerprint everything again when you upgrade.

## Complete example

This script deduplicates a `knowledge-base` folder and writes a report of the documents to keep and their duplicates.

```sh
pip install docfgp
```

```python
import json
from collections import defaultdict
from pathlib import Path

from docfgp import Fingerprinter, FingerprintError

THRESHOLD = 0.9
SUPPORTED = {".pdf", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".webp"}


def similarity(a, b):
    def share(field):
        if not a[field] or not b[field]:
            return 0.0
        return sum(x == y for x, y in zip(a[field], b[field])) / len(a[field])

    return max(share("minhash"), share("char_minhash"))


def preference(document):
    path, record = document
    scanned = any(page["source"] == "ocr" for page in record["quality"]["pages"])
    return not scanned, path.stat().st_mtime


fingerprinter = Fingerprinter()
documents = []
for path in sorted(Path("knowledge-base").rglob("*")):
    if path.suffix.lower() in SUPPORTED:
        try:
            documents.append((path, fingerprinter.fingerprint(path).to_dict()))
        except FingerprintError as error:
            print(f"Skipped {path}: {error}")

# Best copies first, so they're the ones kept.
documents.sort(key=preference, reverse=True)

kept = {}
duplicates = defaultdict(list)
by_file, by_text, by_key = {}, {}, defaultdict(list)

for path, record in documents:
    file_hash = record["exact_hashes"]["raw_sha256"]
    text_hash = record["exact_hashes"]["canonical_sha256"]
    keys = record["lookup_keys"]["word_lsh"] + record["lookup_keys"]["char_lsh"]

    match = by_file.get(file_hash) or by_text.get(text_hash)
    if not match:
        candidates = sorted({other for key in keys for other in by_key[key]})
        match = next((c for c in candidates if similarity(record, kept[c]) >= THRESHOLD), None)

    if match:
        duplicates[match].append(path)
        continue

    kept[path] = record
    by_file[file_hash] = path
    if text_hash:
        by_text[text_hash] = path
    for key in keys:
        by_key[key].append(path)

report = {str(path): [str(d) for d in duplicates[path]] for path in kept}
Path("dedupe-report.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
```

We ran it on a folder with six files: a contract as a Word file, its PDF export, a second copy of the PDF, a scan of the printout, a new version with a different date and fee, and an unrelated memo. This is the result:

```json
{
  "knowledge-base/contract (1).pdf": [
    "knowledge-base/contract.pdf",
    "knowledge-base/contract.docx",
    "knowledge-base/contract-scan.jpg"
  ],
  "knowledge-base/meeting-notes.docx": [],
  "knowledge-base/contract-v2.docx": []
}
```

Four files collapsed into one, and each was matched a different way:

- `contract.pdf` is identical to `contract (1).pdf`, so the **file hash** matched.
- `contract.docx` has the same text, so the **text hash** matched.
- `contract-scan.jpg` has OCR errors, so neither hash matched. The **character similarity** of 0.94 put it over the threshold.
- `contract-v2.docx` stayed separate. Its similarity to the original is about 0.82 to 0.89, below the threshold, which is what you want for a contract with a different fee.

Now chunk and embed only the three kept files.

## Tips for tuning

- **Check pairs near the threshold.** Print the candidates with scores between 0.8 and 0.95 and look at them. Raise the threshold if different documents are being merged, and lower it if obvious copies are missed.
- **Watch for templates.** Documents built from the same template, such as invoices or contracts, can be very similar and still say different things. Use a higher threshold for them, or keep them out of deduplication.
- **Handle scans without text.** If OCR can't read a scan, its fingerprint has no text keys. Compare those with the page hashes in `lookup_keys["visual"]`.
- **Deduplicate within each permission scope** if your users have very different access, so nobody loses content they're allowed to see.

## Key takeaways

- Duplicates crowd out other sources in your top results, cause conflicting answers, and add cost.
- RAG frameworks deduplicate by exact hash, which misses converted files, scans, and edited versions.
- Deduplicate whole documents before chunking, then add chunk-level filtering if you need it.
- Remove exact and same-text copies first, then use LSH and a similarity threshold for near-duplicates.
- Keep the best copy, record the others for citations and permissions, and check new documents on every sync.

## Frequently asked questions

### Should I deduplicate documents or chunks?

Start with documents. Document-level deduplication catches converted files, scans, and versions, which chunk-level checks usually miss. Add chunk-level deduplication if your documents share a lot of identical boilerplate.

### Can't I just use embeddings to find duplicates?

You can, but embeddings measure meaning, so two different contracts from the same template look nearly identical. They also require embedding every copy first. Fingerprints compare the actual content, so they only match documents that say the same thing.

### What threshold should I use?

Start around 0.9, then check the pairs near it on your own documents. Lower thresholds remove more duplicates but risk merging documents that differ in ways that matter.

### What about documents that are updated over time?

Fingerprint the new version when it arrives. If it's a near-duplicate of an indexed document, decide whether it replaces the old version or is indexed as a separate document, and record the decision.

To learn more about choosing what counts as a duplicate, read [Exact vs. Near-Duplicate Documents](/blog/exact-vs-near-duplicate-documents). To get started with DocFGP, follow the [Quick start](/docfgp/quick-start).
