import { useEffect, useState } from 'react';
import { getInvoices, getInvoice, createInvoice, recordPayment, getCustomers, getChallans } from '../api/services';
import Modal from '../components/Modal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Page.css';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [challans, setChallans] = useState([]);
  const [modal, setModal] = useState(false);
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({ customer_id: '', challan_id: '', invoice_date: '', due_date: '', subtotal: '', tax_percent: 18, notes: '' });

  const load = () => getInvoices().then(({ data }) => setInvoices(data.data || []));
  useEffect(() => {
    load();
    getCustomers().then(({ data }) => setCustomers(data.data || []));
    getChallans().then(({ data }) => setChallans((data.data || []).filter((c) => c.status === 'confirmed')));
  }, []);

  const taxAmount = (Number(form.subtotal) * Number(form.tax_percent)) / 100;
  const total = Number(form.subtotal) + taxAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createInvoice(form);
    setModal(false);
    load();
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    await recordPayment(payModal, payAmount);
    setPayModal(null);
    setPayAmount('');
    load();
  };

  const isOverdue = (inv) =>
    inv.due_date && new Date(inv.due_date) < new Date() && ['unpaid', 'partial'].includes(inv.status);

  const exportPDF = async (id) => {
    const { data: inv } = await getInvoice(id);

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header bar
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(inv.invoice_number, pageW - 14, 18, { align: 'right' });

    // Reset text color
    doc.setTextColor(30, 30, 30);

    // Bill To
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 14, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(inv.customer_name || '', 14, 45);
    if (inv.address) doc.text(inv.address, 14, 51);
    if (inv.mobile || inv.phone) doc.text(`Mobile: ${inv.mobile || inv.phone}`, 14, 57);
    if (inv.customer_email) doc.text(`Email: ${inv.customer_email}`, 14, 63);
    if (inv.gstin) doc.text(`GSTIN: ${inv.gstin}`, 14, 69);

    // Invoice details (right side)
    const detailsX = pageW - 80;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Invoice Date:', detailsX, 38);
    doc.text('Due Date:', detailsX, 45);
    doc.text('Status:', detailsX, 52);
    doc.setFont('helvetica', 'normal');
    doc.text(inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—', detailsX + 28, 38);
    doc.text(inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—', detailsX + 28, 45);
    doc.text((inv.status || '').toUpperCase(), detailsX + 28, 52);

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 75, pageW - 14, 75);

    // Items table (if challan items exist)
    let finalY = 80;
    if (inv.items && inv.items.length > 0) {
      autoTable(doc, {
        startY: 80,
        head: [['#', 'Product', 'SKU', 'Unit', 'Qty', 'Unit Price', 'Total']],
        body: inv.items.map((it, idx) => [
          idx + 1,
          it.product_name || '',
          it.product_sku || '',
          it.product_unit || '',
          it.qty,
          `Rs. ${Number(it.unit_price).toLocaleString('en-IN')}`,
          `Rs. ${Number(it.total).toLocaleString('en-IN')}`,
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 250] },
        margin: { left: 14, right: 14 },
      });
      finalY = doc.lastAutoTable.finalY + 8;
    }

    // Totals box
    const boxX = pageW - 90;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(boxX, finalY, 76, 36, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Subtotal:', boxX + 4, finalY + 9);
    doc.text(`Tax (${inv.tax_percent}%):`, boxX + 4, finalY + 17);
    doc.setDrawColor(200, 200, 200);
    doc.line(boxX + 4, finalY + 21, boxX + 72, finalY + 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text('Total:', boxX + 4, finalY + 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`Rs. ${Number(inv.subtotal).toLocaleString('en-IN')}`, boxX + 72, finalY + 9, { align: 'right' });
    doc.text(`Rs. ${Number(inv.tax_amount).toLocaleString('en-IN')}`, boxX + 72, finalY + 17, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110);
    doc.text(`Rs. ${Number(inv.total_amount).toLocaleString('en-IN')}`, boxX + 72, finalY + 30, { align: 'right' });

    // Payment info
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Amount Paid: Rs. ${Number(inv.paid_amount).toLocaleString('en-IN')}`, 14, finalY + 9);
    doc.text(`Balance Due: Rs. ${(Number(inv.total_amount) - Number(inv.paid_amount)).toLocaleString('en-IN')}`, 14, finalY + 17);

    // Notes
    if (inv.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 14, finalY + 30);
      doc.setFont('helvetica', 'normal');
      doc.text(inv.notes, 14, finalY + 37);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for your business!', pageW / 2, 285, { align: 'center' });

    doc.save(`${inv.invoice_number}.pdf`);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Invoices</h2>
        <button className="btn-primary" onClick={() => setModal(true)}>+ New Invoice</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Invoice No.</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>No invoices yet</td></tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} style={isOverdue(inv) ? { background: '#fff1f2' } : {}}>
                <td><strong>{inv.invoice_number}</strong>{isOverdue(inv) && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginLeft: 6 }}>OVERDUE</span>}</td>
                <td>{inv.customer_name}</td>
                <td>{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                <td>₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                <td>₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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

      {modal && (
        <Modal title="New Invoice" onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit} className="form-grid">
            <select required value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
              <option value="">Select Customer *</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.challan_id} onChange={(e) => setForm({ ...form, challan_id: e.target.value })}>
              <option value="">Link Challan (optional)</option>
              {challans.map((c) => <option key={c.id} value={c.id}>{c.challan_number} — {c.customer_name}</option>)}
            </select>
            <input type="date" required value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
            <input type="date" placeholder="Due Date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <input type="number" placeholder="Subtotal *" required value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} />
            <input type="number" placeholder="Tax %" value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} />
            <div className="full-col" style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '0.9rem' }}>
              Tax: ₹{taxAmount.toFixed(2)} &nbsp;|&nbsp; <strong>Total: ₹{total.toFixed(2)}</strong>
            </div>
            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="full-col" />
            <button type="submit" className="btn-primary full-col">Create Invoice</button>
          </form>
        </Modal>
      )}

      {payModal && (
        <Modal title="Record Payment" onClose={() => setPayModal(null)}>
          <form onSubmit={handlePayment} className="form-grid">
            <input type="number" placeholder="Amount Received *" required value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="full-col" />
            <button type="submit" className="btn-primary full-col">Record</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
