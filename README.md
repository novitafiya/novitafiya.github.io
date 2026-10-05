# novitafiya.github.io

Portfolio of **Novita Fitriyanti Pulungan**: production planning, inventory control, and warehouse analysis projects built in Excel.

Live site: https://novitafiya.github.io

## Projects

- [FMCG Demand & Supply Planning](https://novitafiya.github.io/projects/fmcg-demand-planning.html): seasonality, forecast backtest (MAPE), promo uplift, lost sales, and launch curves from 190,754 rows of daily sales.
- [Warehouse Inventory Health, Replenishment & Cost](https://novitafiya.github.io/projects/warehouse-inventory.html): reorder points with safety stock, overstock and holding cost, service-level trade-offs, and an ABC-XYZ matrix for 3,204 items.

Both projects use public synthetic datasets from Kaggle. The Excel workbooks (with live formulas) are in [`/files`](files).

## Structure

```
index.html                         Home page
projects/                          One page per project
assets/style.css                   Styles (light and dark mode)
assets/charts.js                   Small SVG chart helper, no libraries
assets/data.js                     Chart values exported from the workbooks
files/                             Excel workbooks
```
