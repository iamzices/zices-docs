---
title: What is Chartable?
description: Chartable is an easy to use interactive chart and table JavaScript library built on Plotly.js and Tabulator.
sidebar_position: 1
---

Chartable is an easy to use interactive chart and table JavaScript library built on Plotly.js and Tabulator. Every chart and table has buttons to copy and download its data.

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

<iframe
  title="Monthly sales bar chart"
  className="margin-bottom--lg"
  style={{width: '100%', height: 458, border: 0}}
  srcDoc={`
    <body style="margin: 4px">
      <script src="https://cdn.jsdelivr.net/npm/@iamzices/chartable"></script>
      <script>
        Chartable.render(document.body, {
          title: "Monthly sales",
          kind: "bar",
          columns: ["Month", "Sales"],
          rows: [
            ["Jan", 120],
            ["Feb", 180],
            ["Mar", 150],
          ],
        });
      </script>
    </body>
  `}
/>

To install it and render a chart, follow the [Quick start](./quick-start.md).
