import { useEffect, useState } from 'react';
import { getFinancialSummary, getExpenses, createExpense, getInvoices, getInvoice, recordPayment, getPaymentRecords, getCustomers, getChallans } from '../api/services';
import Modal from '../components/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Page.css';
import './Accounts.css';

const PAYMENT_MODES = ['cash', 'bank', 'upi', 'cheque', 'credit'];
const EXPENSE_CATS = ['Rent', 'Salaries', 'Utilities', 'Transport', 'Raw Material', 'Marketing', 'Maintenance', 'Miscellaneous'];

export default function Accounts() {
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [challans, setChallans] = useState([]);

  const [expModal, setExpModal] = useState(false);
  const [expForm, setExpForm] = useState({ category: '', vendor_name: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash', reference_no: '', notes: '' });

  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', payment_mode: 'cash', reference_no: '', notes: '' });

  const [invModal, setInvModal] = useState(false);
  const [invForm, setInvForm] = useState({ customer_id: '', challan_id: '', invoice_date: '', due_date: '', subtotal: '', tax_percent: 18, notes: '' });

  const load = () => {
    getFinancialSummary().then(({ data }) => setSummary(data));
    getInvoices().then(({ data }) => setInvoices(data.data || []));
    getExpenses().then(({ data }) => setExpenses(data.data || []));
    getPaymentRecords().then(({ data }) => setPayments(data.data || []));
  };

  useEffect(() => {
    load();
    getCustomers().then(({ data }) => setCustomers(data.data || []));
    getChallans().then(({ data }) => setChallans((data.data || []).filter((c) => c.status === 'confirmed')));
  }, []);

  const handleExpense = async (e) => {
    e.preventDefault();
    await createExpense(expForm);
    setExpModal(false);
    setExpForm({ category: '', vendor_name: '', amount: '', expense_date: new Date().toISOString().slice(0, 10), payment_mode: 'cash', reference_no: '', notes: '' });
    load();
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    await recordPayment(payModal, payForm.amount);
    setPayModal(null);
    setPayForm({ amount: '', payment_mode: 'cash', reference_no: '', notes: '' });
    load();
  };

  const handleInvoice = async (e) => {
    e.preventDefault();
    const { createInvoice } = await import('../api/services');
    await createInvoice(invForm);
    setInvModal(false);
    setInvForm({ customer_id: '', challan_id: '', invoice_date: '', due_date: '', subtotal: '', tax_percent: 18, notes: '' });
    load();
  };

  const taxAmount = (Number(invForm.subtotal) * Number(invForm.tax_percent)) / 100;
  const invTotal = Number(invForm.subtotal) + taxAmount;

  const isOverdue = (inv) =>
    inv.due_date && new Date(inv.due_date) < new Date() && ['unpaid', 'partial'].includes(inv.status);

  const exportPDF = async (id) => {
    const { data: inv } = await getInvoice(id);
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(6, 13, 26);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(inv.invoice_number, pageW - 14, 18, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(inv.customer_name || '', 14, 45);
    if (inv.address) doc.text(inv.address, 14, 51);
    if (inv.mobile || inv.phone) doc.text(`Mobile: ${inv.mobile || inv.phone}`, 14, 57);
    if (inv.gstin) doc.text(`GSTIN: ${inv.gstin}`, 14, 63);
    const dx = pageW - 80;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Invoice Date:', dx, 38);
    doc.text('Due Date:', dx, 45);
    doc.text('Status:', dx, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—', dx + 28, 38);
    doc.text(inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—', dx + 28, 45);
    doc.text((inv.status || '').toUpperCase(), dx + 28, 52);
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 70, pageW - 14, 70);
    let finalY = 76;
    if (inv.items && inv.items.length > 0) {
      autoTable(doc, {
        startY: 76,
        head: [['#', 'Product', 'SKU', 'Qty', 'Unit Price', 'Total']],
        body: inv.items.map((it, idx) => [idx + 1, it.product_name || '', it.product_sku || '', it.qty, `Rs. ${Number(it.unit_price).toLocaleString('en-IN')}`, `Rs. ${Number(it.total).toLocaleString('en-IN')}`]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [6, 13, 26], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
      });
      finalY = doc.lastAutoTable.finalY + 8;
    }
    const bx = pageW - 90;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(bx, finalY, 76, 36, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal:', bx + 4, finalY + 9);
    doc.text(`Tax (${inv.tax_percent}%):`, bx + 4, finalY + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 13, 26);
    doc.text('Total:', bx + 4, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Rs. ${Number(inv.subtotal).toLocaleString('en-IN')}`, bx + 72, finalY + 9, { align: 'right' });
    doc.text(`Rs. ${Number(inv.tax_amount).toLocaleString('en-IN')}`, bx + 72, finalY + 17, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(6, 13, 26);
    doc.text(`Rs. ${Number(inv.total_amount).toLocaleString('en-IN')}`, bx + 72, finalY + 30, { align: 'right' });
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Paid: Rs. ${Number(inv.paid_amount).toLocaleString('en-IN')}`, 14, finalY + 9);
    doc.text(`Balance: Rs. ${(Number(inv.total_amount) - Number(inv.paid_amount)).toLocaleString('en-IN')}`, 14, finalY + 17);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your business!', pageW / 2, 285, { align: 'center' });
    doc.save(`${inv.invoice_number}.pdf`);
  };

  const TABS = ['summary', 'invoices', 'expenses', 'payments'];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Accounts</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }} onClick={() => setExpModal(true)}>+ Expense</button>
          <button className="btn-primary" onClick={() => setInvModal(true)}>+ Invoice</button>
        </div>
      </div>

      <div className="acc-tabs">
        {TABS.map((t) => (
          <button key={t} className={`acc-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {tab === 'summary' && summary && (
        <div>
          <div className="acc-summary-grid">
            <div className="acc-card acc-card-green">
              <div className="acc-card-icon">💰</div>
              <div className="acc-card-val">₹{Number(summary.total_received).toLocaleString('en-IN')}</div>
              <div className="acc-card-lbl">Total Received</div>
            </div>
            <div className="acc-card acc-card-red">
              <div className="acc-card-icon">📤</div>
              <div className="acc-card-val">₹{Number(summary.total_expenses).toLocaleString('en-IN')}</div>
              <div className="acc-card-lbl">Total Expenses</div>
            </div>
            <div className="acc-card acc-card-blue">
              <div className="acc-card-icon">📋</div>
              <div className="acc-card-val">₹{Number(summary.total_invoiced).toLocaleString('en-IN')}</div>
              <div className="acc-card-lbl">Total Invoiced</div>
            </div>
            <div className="acc-card acc-card-orange">
              <div className="acc-card-icon">⏳</div>
              <div className="acc-card-val">₹{Number(summary.outstanding).toLocaleString('en-IN')}</div>
              <div className="acc-card-lbl">Outstanding</div>
            </div>
            <div className={`acc-card ${summary.net_profit >= 0 ? 'acc-card-green' : 'acc-card-red'}`}>
              <div className="acc-card-icon">{summary.net_profit >= 0 ? '📈' : '📉'}</div>
              <div className="acc-card-val">₹{Number(summary.net_profit).toLocaleString('en-IN')}</div>
              <div className="acc-card-lbl">Net Profit</div>
            </div>
            <div className="acc-card acc-card-purple">
              <div className="acc-card-icon">⚠</div>
              <div className="acc-card-val">{summary.overdue_count}</div>
              <div className="acc-card-lbl">Overdue Invoices</div>
            </div>
          </div>
          <div className="acc-invoice-status">
            <div className="acc-status-item">
              <span className="badge unpaid">Unpaid</span>
              <strong>{summary.unpaid_count}</strong>
            </div>
            <div className="acc-status-item">
              <span className="badge partial">Partial</span>
              <strong>{summary.partial_count}</strong>
            </div>
            <div className="acc-status-item">
              <span className="badge paid">Paid</span>
              <strong>{summary.paid_count}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {tab === 'invoices' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Invoice No.</th><th>Customer</th><th>Date</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>No invoices yet</td></tr>}
              {invoices.map((inv) => (
                <tr key={inv.id} style={isOverdue(inv) ? { background: 'rgba(239,68,68,0.05)' } : {}}>
                  <td style={{ color: '#e2e8f0', fontWeight: 700 }}>
                    {inv.invoice_number}
                    {isOverdue(inv) && <span style={{ color: '#f87171', fontSize: '0.72rem', marginLeft: 6 }}>OVERDUE</span>}
                  </td>
                  <td>{inv.customer_name}</td>
                  <td>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                  <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: '#4ade80' }}>₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                  <td style={{ color: '#f87171' }}>₹{(Number(inv.total_amount) - Number(inv.paid_amount)).toLocaleString('en-IN')}</td>
                  <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                  <td>
                    {['unpaid', 'partial'].includes(inv.status) && (
                      <button className="btn-sm success" onClick={() => setPayModal(inv.id)}>Record Payment</button>
                    )}
                    <button className="btn-sm" onClick={() => exportPDF(inv.id)}>⬇ PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Expense No.</th><th>Category</th><th>Vendor</th><th>Amount</th><th>Date</th><th>Mode</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {expenses.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>No expenses recorded</td></tr>}
              {expenses.map((ex) => (
                <tr key={ex.id}>
                  <td><code>{ex.expense_number}</code></td>
                  <td style={{ color: '#e2e8f0' }}>{ex.category}</td>
                  <td>{ex.vendor_name || '—'}</td>
                  <td style={{ color: '#f87171', fontWeight: 700 }}>₹{Number(ex.amount).toLocaleString('en-IN')}</td>
                  <td>{new Date(ex.expense_date).toLocaleDateString('en-IN')}</td>
                  <td><span className="badge draft">{ex.payment_mode}</span></td>
                  <td>{ex.reference_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments Tab */}
      {tab === 'payments' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Date</th><th>Mode</th><th>Reference</th><th>By</th></tr>
            </thead>
            <tbody>
              {payments.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#334155', padding: '32px' }}>No payment records</td></tr>}
              {payments.map((p) => (
                <tr key={p.id}>
                  <td><code>{p.invoice_number}</code></td>
                  <td>{p.customer_name}</td>
                  <td style={{ color: '#4ade80', fontWeight: 700 }}>₹{Number(p.amount).toLocaleString('en-IN')}</td>
                  <td>{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                  <td><span className="badge draft">{p.payment_mode}</span></td>
                  <td>{p.reference_no || '—'}</td>
                  <td>{p.created_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense Modal */}
      {expModal && (
        <Modal title="Record Expense" onClose={() => setExpModal(false)}>
          <form onSubmit={handleExpense} className="form-grid">
            <select required value={expForm.category} onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}>
              <option value="">Select Category *</option>
              {EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Vendor / Payee" value={expForm.vendor_name} onChange={(e) => setExpForm({ ...expForm, vendor_name: e.target.value })} />
            <input type="number" placeholder="Amount *" required value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
            <input type="date" required value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} />
            <select value={expForm.payment_mode} onChange={(e) => setExpForm({ ...expForm, payment_mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input placeholder="Reference No." value={expForm.reference_no} onChange={(e) => setExpForm({ ...expForm, reference_no: e.target.value })} />
            <textarea placeholder="Notes" value={expForm.notes} onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })} className="full-col" rows={2} />
            <button type="submit" className="btn-primary full-col">Save Expense</button>
          </form>
        </Modal>
      )}

      {/* Payment Modal */}
      {payModal && (
        <Modal title="Record Payment" onClose={() => setPayModal(null)}>
          <form onSubmit={handlePayment} className="form-grid">
            <input type="number" placeholder="Amount Received *" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
            <select value={payForm.payment_mode} onChange={(e) => setPayForm({ ...payForm, payment_mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
            <input placeholder="Reference No." value={payForm.reference_no} onChange={(e) => setPayForm({ ...payForm, reference_no: e.target.value })} className="full-col" />
            <button type="submit" className="btn-primary full-col">Record</button>
          </form>
        </Modal>
      )}

      {/* New Invoice Modal */}
      {invModal && (
        <Modal title="New Invoice" onClose={() => setInvModal(false)}>
          <form onSubmit={handleInvoice} className="form-grid">
            <select required value={invForm.customer_id} onChange={(e) => setInvForm({ ...invForm, customer_id: e.target.value })}>
              <option value="">Select Customer *</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={invForm.challan_id} onChange={(e) => setInvForm({ ...invForm, challan_id: e.target.value })}>
              <option value="">Link Challan (optional)</option>
              {challans.map((c) => <option key={c.id} value={c.id}>{c.challan_number} — {c.customer_name}</option>)}
            </select>
            <input type="date" required value={invForm.invoice_date} onChange={(e) => setInvForm({ ...invForm, invoice_date: e.target.value })} />
            <input type="date" placeholder="Due Date" value={invForm.due_date} onChange={(e) => setInvForm({ ...invForm, due_date: e.target.value })} />
            <input type="number" placeholder="Subtotal *" required value={invForm.subtotal} onChange={(e) => setInvForm({ ...invForm, subtotal: e.target.value })} />
            <input type="number" placeholder="Tax %" value={invForm.tax_percent} onChange={(e) => setInvForm({ ...invForm, tax_percent: e.target.value })} />
            <div className="full-col" style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.875rem', color: '#94a3b8' }}>
              Tax: ₹{taxAmount.toFixed(2)} &nbsp;|&nbsp; <strong style={{ color: '#e2e8f0' }}>Total: ₹{invTotal.toFixed(2)}</strong>
            </div>
            <textarea placeholder="Notes" value={invForm.notes} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} className="full-col" />
            <button type="submit" className="btn-primary full-col">Create Invoice</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
