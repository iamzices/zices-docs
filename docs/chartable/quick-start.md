---
title: Chartable quick start
description: Install Chartable and render a bar chart.
sidebar_position: 4
---

## Install

```sh
npm install @iamzices/chartable
```

Or, without a build step, load it with a script tag and call `Chartable.render()` instead of importing `render`:

```html
<script src="https://cdn.jsdelivr.net/npm/@iamzices/chartable"></script>
```

## Render a chart

```js
import { render } from "@iamzices/chartable";

render(document.body, {
  title: "Monthly sales",
  kind: "bar",
  columns: ["Month", "Sales"],
  rows: [
    ["Jan", 120],
    ["Feb", 180],
    ["Mar", 150],
  ],
});
```
