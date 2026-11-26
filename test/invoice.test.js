const assert = require('node:assert/strict');
const test = require('node:test');
const invoice = require('../lib/invoice');
const orders = require('../lib/orders');
const pricing = require('../lib/pricing');

function billOrder(items, coupon = '') {
  const db = { nextOrderId: 1001, orders: [] };
  const totals = pricing.computeTotals(items, coupon);
  const order = orders.add(db, { ...totals, items, coupon, date: '2026-01-15' });
  return { totals, order: orders.get(db, order.id) };
}

test('Invoice agrees with a full-price order at the default GST rate', () => {
  const { order } = billOrder([
    { name: 'Tea', sku: 'TEA', hsn: '0902', price: 100, qty: 2 }
  ]);

  assert.equal(order.total, 236);
  assert.deepEqual(invoice.computeInvoiceFigures(order), {
    subtotal: 200, discount: 0, tax: 36, cgst: 18, sgst: 18, total: 236,
    rows: [
      { name: 'Tea', sku: 'TEA', hsn: '0902', qty: 2, price: 100,
        gstPercent: 18, line: 200, lineTax: 36 }
    ]
  });
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('Invoice uses billed GST for stored HSN-only lines', () => {
  const { totals, order } = billOrder([
    { name: 'Rice', hsn: '1006', price: 100, qty: 1 },
    { name: 'Ghee', hsn: '0405', price: 100, qty: 2 },
    { name: 'Tea', hsn: '0902', price: 100, qty: 1 }
  ]);
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(totals.lines.map(line => [line.gstPercent, line.tax]), [
    [5, 5], [12, 24], [18, 18]
  ]);
  assert.deepEqual([order.tax, totals.cgst, totals.sgst, order.total], [47, 23.5, 23.5, 447]);
  assert.deepEqual(figures.rows.map(row => [row.gstPercent, row.lineTax]), [
    [5, 5], [12, 24], [18, 18]
  ]);
  assert.deepEqual([figures.tax, figures.cgst, figures.sgst, figures.total], [47, 23.5, 23.5, 447]);

  const html = invoice.render(order);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td class="r">.47\.00<\/td>/);
  assert.match(html, /Invoice Total<\/td><td class="r">.447\.00<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});

test('Invoice applies the SAVE10 cap before GST', () => {
  const { order } = billOrder([{ name: 'Tea', hsn: '0902', price: 2000, qty: 1 }], 'SAVE10');
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([order.discount, order.tax, order.total], [150, 333, 2183]);
  assert.deepEqual([figures.discount, figures.tax, figures.total], [150, 333, 2183]);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('Invoice calculates GST on taxable value after FLAT50', () => {
  const { order } = billOrder([{ name: 'Tea', hsn: '0902', price: 300, qty: 1 }], 'FLAT50');
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual([order.discount, order.tax, order.total], [50, 45, 295]);
  assert.deepEqual([figures.discount, figures.tax, figures.total], [50, 45, 295]);
});

test('Invoice honours zero and fractional GST rates', () => {
  const { totals, order } = billOrder([
    { name: 'Zero-rated item', price: 100, qty: 1, gstRate: 0 },
    { name: 'Fractional-rate item', price: 100, qty: 1, gstRate: 0.05 }
  ]);
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(totals.lines.map(line => [line.gstPercent, line.tax]), [[0, 0], [5, 5]]);
  assert.deepEqual(figures.rows.map(row => [row.gstPercent, row.lineTax]), [[0, 0], [5, 5]]);
  assert.equal(order.total, 205);
  assert.equal(figures.total, 205);
});

test('Invoice GST sums rounded line amounts', () => {
  const { totals, order } = billOrder([
    { name: 'First item', price: 0.1, qty: 1, gstRate: 5 },
    { name: 'Second item', price: 0.1, qty: 1, gstRate: 5 }
  ]);
  const figures = invoice.computeInvoiceFigures(order);

  assert.deepEqual(totals.lines.map(line => line.tax), [0.01, 0.01]);
  assert.deepEqual(figures.rows.map(row => row.lineTax), [0.01, 0.01]);
  assert.deepEqual([order.tax, totals.cgst, totals.sgst, order.total], [0.02, 0.01, 0.01, 0.22]);
  assert.deepEqual([figures.tax, figures.cgst, figures.sgst, figures.total], [0.02, 0.01, 0.01, 0.22]);
  assert.doesNotMatch(invoice.render(order), /Accountant Reconciliation Notice/);
});

test('Printable invoice matches a SAVE10 rice order and its GST breakdown', () => {
  const { order } = billOrder([
    { name: 'Rice', hsn: '1006', price: 640, qty: 1 }
  ], 'SAVE10');

  const html = invoice.render(order);
  assert.match(html, /Invoice Total<\/td><td class="r">.604\.80<\/td>/);
  assert.match(html, /CGST \+ SGST \(Total GST\)<\/td><td class="r">.28\.80<\/td>/);
  assert.match(html, /5%<\/td><td class="r">.28\.80<\/td>/);
  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
});
