---
title: API reference
description: "API reference for DocFGP by Zices: Fingerprinter, DocumentFingerprint, FingerprintConfig, FingerprintError, supported formats, and the docfgp CLI."
sidebar_position: 6
---

## `Fingerprinter`

```python
Fingerprinter(config=None)
```

Generate stateless document fingerprints.

**Parameters**

| Name     | Type                          | Description                                                          |
| -------- | ----------------------------- | -------------------------------------------------------------------- |
| `config` | `FingerprintConfig` or `None` | Optional bounded processing settings. Default `FingerprintConfig()`. |

**Raises**

- `FingerprintError`: A configured OCR model is not installed.

## `Fingerprinter.fingerprint()`

```python
Fingerprinter.fingerprint(path)
```

Create a document's textual and visual fingerprint.

OCR failure does not raise. It leaves a warning in `quality` and can leave a visual-only result.

**Parameters**

| Name   | Type                    | Description                               |
| ------ | ----------------------- | ----------------------------------------- |
| `path` | `str` or `pathlib.Path` | PDF, DOCX, PPTX, or supported image path. |

**Returns**

The versioned `DocumentFingerprint`.

**Raises**

- `FingerprintError`: Input is invalid, limits are exceeded, or processing fails.

## `DocumentFingerprint`

```python
class DocumentFingerprint:
    schema_version: str
    algorithm_version: str
    source_format: str
    byte_size: int
    page_count: int
    exact_hashes: Mapping[str, str | None]
    lookup_keys: Mapping[str, tuple[str, ...]]
    minhash: tuple[str, ...]
    char_minhash: tuple[str, ...]
    shingle_counts: tuple[tuple[str, int], ...]
    shingle_total: int
    shingle_unique: int
    page_hashes: tuple[PageHash, ...]
    quality: Quality
    parameters: Mapping[str, int | float | str | bool]
```

Serializable, versioned document fingerprint.

| Name                | Description                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| `schema_version`    | Fingerprint data format version.                                                        |
| `algorithm_version` | Feature-generation version.                                                             |
| `source_format`     | Detected input format, as in [Supported formats](#supported-formats).                   |
| `byte_size`         | Original file size in bytes.                                                            |
| `page_count`        | Number of pages or image frames.                                                        |
| `exact_hashes`      | Raw and canonical-text SHA-256 hashes, as `raw_sha256` and `canonical_sha256`.          |
| `lookup_keys`       | Word, character, passage, and visual candidate keys, as in [Lookup keys](#lookup-keys). |
| `minhash`           | Word-shingle MinHash sketch.                                                            |
| `char_minhash`      | Character-shingle MinHash sketch.                                                       |
| `shingle_counts`    | Hashed five-word shingle occurrence counts.                                             |
| `shingle_total`     | Total five-word shingle occurrences.                                                    |
| `shingle_unique`    | Distinct five-word shingle hashes.                                                      |
| `page_hashes`       | Per-page visual hashes and lookup keys, as [`PageHash`](#pagehash) entries.             |
| `quality`           | Evidence status, page provenance, and warnings, as a [`Quality`](#quality).             |
| `parameters`        | Parameters used to construct the fingerprint.                                           |

Each MinHash sketch has 512 components. Empty feature sets yield empty sketches and lookup-key groups. A contiguous passage of at least 36 identical normalized words shares a `passage` lookup key.

## `DocumentFingerprint.to_dict()`

```python
DocumentFingerprint.to_dict()
```

Return a JSON-compatible representation.

**Returns**

A recursively serialized fingerprint with stable field order.

## `DocumentFingerprint.to_json()`

```python
DocumentFingerprint.to_json()
```

Serialize the fingerprint as compact JSON.

**Returns**

A JSON string.

## `PageHash`

```python
class PageHash:
    page: int
    phash: str
    lookup_keys: tuple[str, ...]
```

A page perceptual hash and its indexed visual keys.

| Name          | Description                                       |
| ------------- | ------------------------------------------------- |
| `page`        | One-based page number.                            |
| `phash`       | 64-bit perceptual hash, as 16 hexadecimal digits. |
| `lookup_keys` | Four versioned lookup keys.                       |

## `Quality`

```python
class Quality:
    status: Literal["text_and_visual", "text_only", "visual_only", "insufficient_evidence"]
    text_evidence: Literal["word_shingles", "character_shingles", "exact_only", "none"]
    pages: tuple[PageQuality, ...]
    warnings: tuple[str, ...]
```

Whether the fingerprint carries text, visual, or insufficient evidence.

| Name            | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `status`        | Evidence status, as in [Quality status](#quality-status).  |
| `text_evidence` | Text evidence, as in [Text evidence](#text-evidence).      |
| `pages`         | Page provenance, as [`PageQuality`](#pagequality) entries. |
| `warnings`      | Processing warnings.                                       |

## `PageQuality`

```python
class PageQuality:
    page: int
    source: Literal["native", "ocr", "native_and_ocr", "none"]
    text_chars: int
    native_text_chars: int
    ocr_attempted: bool
    ocr_reason: Literal["missing_native_text", "invalid_native_text", "rasterized_content", "image_input"] | None
    ocr_confidence: float | None
    warning: str | None
```

Extraction provenance for one page or image frame.

| Name                | Description                                 |
| ------------------- | ------------------------------------------- |
| `page`              | One-based page number.                      |
| `source`            | Source of the selected page text. `native_and_ocr` when OCR adds text found in images to native PDF text. |
| `text_chars`        | Characters of selected page text.           |
| `native_text_chars` | Characters of native text.                  |
| `ocr_attempted`     | Whether OCR was attempted.                  |
| `ocr_reason`        | OCR trigger, or `None`.                     |
| `ocr_confidence`    | Mean recognized-word confidence, or `None`. |
| `warning`           | Page warning, or `None`.                    |

## `FingerprintConfig`

```python
class FingerprintConfig:
    max_file_bytes: int = 50_000_000
    max_pages: int = 200
    max_page_pixels: int = 8_000_000
    max_image_pixels: int = 40_000_000
    max_text_chars: int = 2_000_000
    render_dpi: int = 96
    ocr_dpi: int = 180
    process_timeout: float = 60.0
    max_document_seconds: float = 180.0
    tessdata_path: str | Path | None = None
    ocr_language: str = "eng"
    include_shingle_counts: bool = True
```

Configure bounded document processing. Services accepting untrusted uploads should also apply operating-system resource limits.

| Name                     | Description                                                             |
| ------------------------ | ----------------------------------------------------------------------- |
| `max_file_bytes`         | Maximum original input size.                                            |
| `max_pages`              | Maximum PDF pages or image frames.                                      |
| `max_page_pixels`        | Maximum pixels rendered for one PDF page.                               |
| `max_image_pixels`       | Maximum pixels decoded for one image frame.                             |
| `max_text_chars`         | Maximum total extracted characters.                                     |
| `render_dpi`             | Visual rendering resolution, bounded by `max_page_pixels`. At most 300. |
| `ocr_dpi`                | OCR rendering resolution, bounded by `max_page_pixels`. At most 300.    |
| `process_timeout`        | Seconds allowed for each conversion or OCR call.                        |
| `max_document_seconds`   | Cooperative deadline checked between processing stages.                 |
| `tessdata_path`          | Optional directory of Tesseract language models.                        |
| `ocr_language`           | Language codes, as in [Supported languages](#supported-languages), joined with `+`, as in `eng+deu`. |
| `include_shingle_counts` | Include sorted exact occurrence counts.                                 |

**Raises**

- `ValueError`: A processing limit is not positive, a rendering resolution exceeds 300 DPI, `ocr_language` is empty, or `tessdata_path` is not a path.

## `FingerprintError`

```python
class FingerprintError(Exception)
```

Raised for invalid input, unavailable dependencies, or incomplete processing. The message says what went wrong.

## Quality status

| Status                    | Description                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `"text_and_visual"`       | Text and nonblank visual evidence were extracted.                                         |
| `"text_only"`             | Text was extracted, without nonblank visual evidence.                                     |
| `"visual_only"`           | No reliable text was extracted; textual matching is unavailable.                          |
| `"insufficient_evidence"` | Neither text nor nonblank visual evidence was extracted. Supports raw-byte identity only. |

## Text evidence

| Evidence               | Description                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `"word_shingles"`      | Word-shingle matching is available.                                          |
| `"character_shingles"` | Word-shingle matching is unavailable; character retrieval remains available. |
| `"exact_only"`         | Text supports exact matching only; no shingle sketch was available.          |
| `"none"`               | No text evidence is available.                                               |

## Lookup keys

`lookup_keys` holds the candidate keys in four groups.

| Group      | Construction                                                  | Intended use                          |
| ---------- | ------------------------------------------------------------- | ------------------------------------- |
| `word_lsh` | 32 bands of 16 word-shingle MinHash components                | Indexed candidate retrieval           |
| `char_lsh` | 32 bands of 16 character-shingle MinHash components           | Retrieval across some OCR differences |
| `passage`  | Rightmost minimum word-shingle hash in each 32-shingle window | Retrieval of shared passages          |
| `visual`   | Four 16-bit chunks of each page hash                          | Visual candidate retrieval            |

## Supported formats

| Format | Extensions      | `source_format` |
| ------ | --------------- | --------------- |
| PDF    | `.pdf`          | `"pdf"`         |
| DOCX   | `.docx`         | `"docx"`        |
| PPTX   | `.pptx`         | `"pptx"`        |
| PNG    | `.png`          | `"png"`         |
| JPEG   | `.jpg`, `.jpeg` | `"jpeg"`        |
| TIFF   | `.tif`, `.tiff` | `"tiff"`        |
| BMP    | `.bmp`          | `"bmp"`         |
| WebP   | `.webp`         | `"webp"`        |

A file needs a supported extension and a valid format signature. An image's `source_format` is its detected format, so a PNG named `scan.jpg` is `"png"`. Each image frame counts toward `page_count`. Encrypted Office packages are unsupported.

## Supported languages

The standard install supports these languages:

| Language            | Code       |
| ------------------- | ---------- |
| Afrikaans           | `afr`      |
| Albanian            | `sqi`      |
| Azerbaijani         | `aze`      |
| Basque              | `eus`      |
| Bosnian             | `bos`      |
| Breton              | `bre`      |
| Catalan             | `cat`      |
| Cebuano             | `ceb`      |
| Corsican            | `cos`      |
| Croatian            | `hrv`      |
| Czech               | `ces`      |
| Danish              | `dan`      |
| Dutch               | `nld`      |
| English             | `eng`      |
| Esperanto           | `epo`      |
| Estonian            | `est`      |
| Faroese             | `fao`      |
| Filipino            | `fil`      |
| Finnish             | `fin`      |
| French              | `fra`      |
| Galician            | `glg`      |
| German              | `deu`      |
| Haitian Creole      | `hat`      |
| Hungarian           | `hun`      |
| Icelandic           | `isl`      |
| Indonesian          | `ind`      |
| Irish               | `gle`      |
| Italian             | `ita`      |
| Javanese            | `jav`      |
| Latin               | `lat`      |
| Latvian             | `lav`      |
| Lithuanian          | `lit`      |
| Luxembourgish       | `ltz`      |
| Malay               | `msa`      |
| Maltese             | `mlt`      |
| Maori               | `mri`      |
| Norwegian           | `nor`      |
| Occitan             | `oci`      |
| Polish              | `pol`      |
| Portuguese          | `por`      |
| Quechua             | `que`      |
| Romanian            | `ron`      |
| Scottish Gaelic     | `gla`      |
| Serbian (Latin)     | `srp_latn` |
| Slovak              | `slk`      |
| Slovenian           | `slv`      |
| Spanish             | `spa`      |
| Sundanese           | `sun`      |
| Swahili             | `swa`      |
| Swedish             | `swe`      |
| Tongan              | `ton`      |
| Turkish             | `tur`      |
| Uzbek               | `uzb`      |
| Welsh               | `cym`      |
| Western Frisian     | `fry`      |
| Yoruba              | `yor`      |

The language pack, `pip install "docfgp[languages]"`, supports these languages:

| Language                        | Code           |
| ------------------------------- | -------------- |
| Amharic                         | `amh`          |
| Ancient Greek                   | `grc`          |
| Arabic                          | `ara`          |
| Armenian                        | `hye`          |
| Assamese                        | `asm`          |
| Azerbaijani (Cyrillic)          | `aze_cyrl`     |
| Belarusian                      | `bel`          |
| Bengali                         | `ben`          |
| Bulgarian                       | `bul`          |
| Burmese                         | `mya`          |
| Cherokee                        | `chr`          |
| Chinese (Simplified)            | `chi_sim`      |
| Chinese (Simplified, vertical)  | `chi_sim_vert` |
| Chinese (Traditional)           | `chi_tra`      |
| Chinese (Traditional, vertical) | `chi_tra_vert` |
| Dhivehi                         | `div`          |
| Dzongkha                        | `dzo`          |
| Georgian                        | `kat`          |
| Georgian (Old)                  | `kat_old`      |
| Greek                           | `ell`          |
| Gujarati                        | `guj`          |
| Hebrew                          | `heb`          |
| Hindi                           | `hin`          |
| Inuktitut                       | `iku`          |
| Japanese                        | `jpn`          |
| Japanese (vertical)             | `jpn_vert`     |
| Kannada                         | `kan`          |
| Kazakh                          | `kaz`          |
| Khmer                           | `khm`          |
| Korean                          | `kor`          |
| Korean (vertical)               | `kor_vert`     |
| Kyrgyz                          | `kir`          |
| Lao                             | `lao`          |
| Macedonian                      | `mkd`          |
| Malayalam                       | `mal`          |
| Marathi                         | `mar`          |
| Mongolian                       | `mon`          |
| Nepali                          | `nep`          |
| Odia                            | `ori`          |
| Pashto                          | `pus`          |
| Persian                         | `fas`          |
| Punjabi                         | `pan`          |
| Russian                         | `rus`          |
| Sanskrit                        | `san`          |
| Serbian (Cyrillic)              | `srp`          |
| Sindhi                          | `snd`          |
| Sinhala                         | `sin`          |
| Syriac                          | `syr`          |
| Tajik                           | `tgk`          |
| Tamil                           | `tam`          |
| Tatar                           | `tat`          |
| Telugu                          | `tel`          |
| Thai                            | `tha`          |
| Tibetan                         | `bod`          |
| Tigrinya                        | `tir`          |
| Ukrainian                       | `ukr`          |
| Urdu                            | `urd`          |
| Uyghur                          | `uig`          |
| Uzbek (Cyrillic)                | `uzb_cyrl`     |
| Yiddish                         | `yid`          |

For other Tesseract models, set `tessdata_path` to a directory that contains them.

## CLI

```sh
docfgp [options] path
```

Print a document fingerprint as JSON.

The command returns `0` on success and `2` on processing errors, which it prints to stderr.

**Parameters**

| Name                                          | Description                                        |
| --------------------------------------------- | -------------------------------------------------- |
| `path`                                        | PDF, DOCX, PPTX, or image path.                    |
| `--tessdata TESSDATA`                         | Path to Tesseract language models.                 |
| `--ocr-language OCR_LANGUAGE`                 | Tesseract language codes. Default `eng`.           |
| `--max-document-seconds MAX_DOCUMENT_SECONDS` | Processing deadline in seconds. Default `180`.     |
| `--no-shingle-counts`                         | Omit precise overlap counts.                       |
