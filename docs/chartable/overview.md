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
  title="Line, bar, scatter, and pie charts"
  className="margin-bottom--lg"
  style={{width: '100%', height: 620, border: 0}}
  srcDoc={`
    <body style="margin: 4px; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 300px; gap: 12px">
      <div id="visitors"></div>
      <div id="sales"></div>
      <div id="spend"></div>
      <div id="traffic"></div>
      <script src="https://cdn.jsdelivr.net/npm/@iamzices/chartable"></script>
      <script>
        Chartable.render("visitors", {
          title: "Weekly visitors",
          kind: "line",
          columns: ["Week", "Desktop", "Mobile"],
          rows: [
            ["W1", 820, 640],
            ["W2", 860, 710],
            ["W3", 845, 790],
            ["W4", 910, 880],
            ["W5", 955, 960],
            ["W6", 990, 1070],
          ],
        });
        Chartable.render("sales", {
          title: "Monthly sales",
          kind: "bar",
          columns: ["Month", "Sales"],
          rows: [
            ["Jan", 120],
            ["Feb", 180],
            ["Mar", 150],
          ],
        });
        Chartable.render("spend", {
          title: "Ad spend and revenue ($k)",
          kind: "scatter",
          columns: ["Ad spend", "Search", "Social"],
          rows: [
            [1.3, 3, null],
            [1.4, null, 1],
            [1.7, 11, null],
            [1.8, 7, null],
            [2.1, null, 6],
            [2.3, 11, null],
            [2.6, 4, null],
            [2.9, null, 7],
            [3.0, 9, null],
            [3.2, null, 2],
            [3.6, 16, null],
            [3.9, 18, null],
            [4.4, null, 7],
            [4.6, 15, null],
            [4.8, 18, null],
            [4.8, null, 11],
            [5.1, null, 9],
            [5.4, null, 9],
            [5.6, 21, null],
            [5.8, 20, null],
            [5.9, null, 14],
            [6.2, null, 7],
            [6.3, null, 16],
            [6.6, 29, null],
            [7.1, null, 12],
            [7.3, null, 24],
            [7.6, null, 14],
            [8.3, 32, null],
            [8.9, null, 17],
            [9.8, 44, null],
          ],
        });
        Chartable.render("traffic", {
          title: "Traffic sources",
          kind: "pie",
          columns: ["Source", "Visits"],
          rows: [
            ["Search", 45],
            ["Direct", 25],
            ["Social", 18],
            ["Email", 12],
          ],
        });
      </script>
    </body>
  `}
/>

To install it and render a chart, follow the [Quick start](./quick-start.md).
