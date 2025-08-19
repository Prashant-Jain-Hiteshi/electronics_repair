import RepairOrder from '../models/RepairOrder';
import Customer from '../models/Customer';
import RepairPart from '../models/RepairPart';
import Inventory from '../models/Inventory';
import Payment from '../models/Payment';

export interface InvoiceTotals {
  partsTotal: number;
  repairCost: number;
  grandTotal: number;
  paymentsTotal: number;
  balanceDue: number;
}

export function currency(n: number | string | null | undefined) {
  const num = Number(n || 0);
  return num.toFixed(2);
}

export function buildRepairInvoiceHTML(
  repair: RepairOrder,
  customer: Customer | null,
  parts: Array<RepairPart & { Inventory?: Inventory | null }>,
  payments: Payment[],
  totals: InvoiceTotals
) {
  const customerBlock = customer
    ? `${customer.city || ''}, ${customer.state || ''} ${customer.zipCode || ''}`
    : 'N/A';

  const partsRows = parts
    .map((p) => {
      const name = p as any;
      const inv = (p as any).Inventory as Inventory | undefined;
      const partName = inv?.partName || 'Part';
      const unit = Number(p.unitPrice ?? inv?.sellingPrice ?? 0);
      const qty = Number(p.quantity || 0);
      const total = unit * qty;
      return `<tr>
        <td style="padding:6px;border:1px solid #ddd;">${partName}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;">${currency(unit)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;">${qty}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;">${currency(total)}</td>
      </tr>`;
    })
    .join('');

  const paymentsRows = payments
    .map((p) => `<tr>
      <td style="padding:6px;border:1px solid #ddd;">${p.method}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right;">${currency(p.amount)}</td>
      <td style="padding:6px;border:1px solid #ddd;">${p.transactionId || ''}</td>
      <td style="padding:6px;border:1px solid #ddd;">${p.paidAt ? new Date(p.paidAt).toLocaleString() : ''}</td>
    </tr>`)
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice - ${repair.id}</title>
</head>
<body style="font-family:Arial, Helvetica, sans-serif; color:#222;">
  <h2>Invoice</h2>
  <div style="margin-bottom:12px;">
    <div><strong>Repair ID:</strong> ${repair.id}</div>
    <div><strong>Status:</strong> ${repair.status}</div>
    <div><strong>Customer ID:</strong> ${repair.customerId}</div>
    <div><strong>Customer:</strong> ${customerBlock}</div>
    <div><strong>Device:</strong> ${repair.deviceType} ${repair.brand} ${repair.model}</div>
    <div><strong>Issue:</strong> ${repair.issueDescription}</div>
  </div>

  <h3>Parts</h3>
  <table style="border-collapse:collapse; width:100%; margin-bottom:12px;">
    <thead>
      <tr>
        <th style="padding:6px;border:1px solid #ddd;text-align:left;">Part</th>
        <th style="padding:6px;border:1px solid #ddd;text-align:right;">Unit Price</th>
        <th style="padding:6px;border:1px solid #ddd;text-align:right;">Qty</th>
        <th style="padding:6px;border:1px solid #ddd;text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${partsRows || '<tr><td colspan="4" style="padding:6px;border:1px solid #ddd;">No parts</td></tr>'}
    </tbody>
  </table>

  <h3>Payments</h3>
  <table style="border-collapse:collapse; width:100%; margin-bottom:12px;">
    <thead>
      <tr>
        <th style="padding:6px;border:1px solid #ddd;text-align:left;">Method</th>
        <th style="padding:6px;border:1px solid #ddd;text-align:right;">Amount</th>
        <th style="padding:6px;border:1px solid #ddd;">Txn ID</th>
        <th style="padding:6px;border:1px solid #ddd;">Date</th>
      </tr>
    </thead>
    <tbody>
      ${paymentsRows || '<tr><td colspan="4" style="padding:6px;border:1px solid #ddd;">No payments</td></tr>'}
    </tbody>
  </table>

  <h3>Totals</h3>
  <div><strong>Repair Cost:</strong> ${currency(totals.repairCost)}</div>
  <div><strong>Parts Total:</strong> ${currency(totals.partsTotal)}</div>
  <div><strong>Grand Total:</strong> ${currency(totals.grandTotal)}</div>
  <div><strong>Payments Total:</strong> ${currency(totals.paymentsTotal)}</div>
  <div><strong>Balance Due:</strong> ${currency(totals.balanceDue)}</div>
</body>
</html>`;
}
