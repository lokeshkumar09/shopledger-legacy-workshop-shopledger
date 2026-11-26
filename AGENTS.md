# ShopLedger

## Stack

ShopLedger is a wholesale and retail billing, inventory, and customer khata ledger app. The backend uses Node.js with CommonJS, Express 4, and body-parser 1 for JSON request bodies. The browser UI uses plain HTML, CSS, and JavaScript. The app stores its data in `data/db.json`.

## Module map

| Path | Responsibility |
| --- | --- |
| `server.js` | Serves the UI, mounts the routers under `/api`, and serves printable invoices. |
| `config.js` | Defines the port, shop details, and defaults for GST, stock, and coupons. |
| `public/` | Browser UI and static assets. |
| `routes/products.js` | Product and coupon listings. |
| `routes/orders.js` | Order listing, lookup, placement, and cancellation. |
| `routes/customers.js` | Customer listing and khata settlement. |
| `routes/reports.js` | Dashboard, GST reconciliation, pricing preview, and admin export. |
| `lib/orders.js`, `lib/inventory.js`, `lib/ledger.js` | Order records and cancellation, stock, and customer balances and settlements, respectively. |
| `lib/pricing.js`, `lib/tax.js`, `lib/coupons.js` | Order totals, GST, and coupon rules, respectively. |
| `lib/reports.js`, `lib/invoice.js`, `lib/dates.js` | Report calculations, printable invoice HTML, and date helpers, respectively. |
| `lib/store.js`, `data/db.json` | JSON persistence and the application data file. |

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs the dependencies declared in `package.json`. |
| `npm start` | Runs `node server.js`. The server uses `PORT` or defaults to `3000`. |
| `npm test` | Runs a placeholder that prints an error and exits with status 1. |

## Rules

- Write **characterization tests** before changing behaviour.
- Change only the module the ticket is about.
- Tests must never read from or write to `data/db.json`.
- Add no dependencies.
