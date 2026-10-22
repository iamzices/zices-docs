---
title: Chartable API reference
description: Signatures, parameters, column mapping, and errors of Chartable.
sidebar_position: 6
---

## `render()`

```ts
render(container: HTMLElement | string, spec: ChartableSpec): Promise<void>
```

Append a chart or table to a container, with buttons to copy the data and download it as CSV.

Each call appends a new card. The card fills the container's height, or is 450px tall when the container has no set height.

**Parameters**

| Name        | Type                      | Description                                      |
| ----------- | ------------------------- | ------------------------------------------------ |
| `container` | `HTMLElement` or `string` | The element to append to, or its ID without `#`. |
| `spec`      | `ChartableSpec`           | The data and options.                            |

**Returns**

A promise that resolves when the chart or table is drawn.

**Throws**

The promise rejects with:

- `TypeError`: `columns` or `rows` is not an array, a row is not an array, or the container is not found.
- `Error`: `kind` is unknown, or Plotly.js or Tabulator fails to load. The card shows the message.

## `ChartableSpec`

```ts
interface ChartableSpec {
  title?: string;
  kind?: "line" | "area" | "bar" | "scatter" | "pie" | "table";
  columns: string[];
  rows: Cell[][];
}
```

The data and options passed to `render()`.

| Name      | Description                                   |
| --------- | --------------------------------------------- |
| `title`   | Card heading and CSV file name.               |
| `kind`    | Chart or table type. Default `"table"`.       |
| `columns` | Column names.                                 |
| `rows`    | One array of values per row, in column order. |

## `Cell`

```ts
type Cell = string | number | boolean | null;
```

A value in a row. `null` is a missing value.

## Column mapping

| Kind                                     | Columns                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `"line"`, `"area"`, `"bar"`, `"scatter"` | The first column is the x-axis. Each other column is a series. |
| `"pie"`                                  | The first column is the labels and the second is the values.   |

## Copy and CSV download

| Button       | Exports                                                        |
| ------------ | -------------------------------------------------------------- |
| Copy data    | Tab-separated text.                                            |
| Download CSV | A CSV file named `<title>.csv`, or `data.csv` without a title. |

Both export `columns` and `rows` in the order given, even after the table is sorted. Text that starts with `=`, `+`, `-`, or `@` and is not a number is prefixed with `'`, so spreadsheets do not run it as a formula.
