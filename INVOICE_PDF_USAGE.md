// Example: Download Invoice PDF
// =============================

// In React component (when UI is created for Phase D3):
const handleDownloadInvoice = (invoiceId: string, invoiceNumber: string) => {
  const link = document.createElement('a');
  link.href = `/api/invoices/${invoiceId}/pdf`;
  link.download = `invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Usage:
// <button onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}>
//   📥 Download PDF
// </button>

// =============================
// API Response Format
// =============================

// Success (200):
// - HTTP Status: 200 OK
// - Content-Type: application/pdf
// - Content-Disposition: attachment; filename="invoice-INV-2026-000001.pdf"
// - Body: PDF binary stream

// Errors:
// 401 Unauthorized:
// {
//   "error": "Unauthorized"
// }

// 403 Forbidden (not your invoice):
// {
//   "error": "Forbidden: No access to this invoice"
// }

// 404 Not Found:
// {
//   "error": "Invoice not found"
// }

// 500 Server Error:
// {
//   "error": "Internal server error",
//   "details": "error message"
// }

// =============================
// PDF Contents Breakdown
// =============================

// HEADER SECTION
// - BUILDR logo and branding (blue #1e40af)
// - Company name, phone, email, website

// INVOICE INFO SECTION
// - Invoice Number: INV-YYYY-000001
// - Status: DRAFT | SENT | PARTIALLY_PAID | PAID | OVERDUE | CANCELLED (color-coded)
// - Issue Date: e.g., 19 January 2026
// - Due Date: e.g., 2 February 2026

// CLIENT DETAILS SECTION
// - Bill To: [Client Name]
// - Company name (if available)
// - Full address (line 1, line 2, city, postcode)
// - Phone and email

// LINE ITEMS TABLE
// Columns: Description | Qty | Unit Price | VAT % | Total
// Example:
// | Design work for kitchen     | 2.00 | £250.00 | 20% | £600.00 |
// | Installation labor (8 hours) | 1.00 | £500.00 | 0%  | £500.00 |

// PAYMENT SECTION
// - Subtotal: £1,000.00
// - VAT: £220.00
// - TOTAL: £1,220.00 (highlighted in blue)
// - Amount Paid: £400.00 (green)
// - Balance Due: £820.00 (red if unpaid)

// PAYMENT INSTRUCTIONS SECTION
// - Bank Transfer details with placeholders
// - Alternative payment methods
// - Reference instruction

// TERMS & CONDITIONS SECTION
// - Notes (from invoice.notes)
// - Terms & Conditions (from invoice.terms)

// FOOTER
// - Page X of Y (if multi-page)
// - Generated [date]

// =============================
// Invoice Status Colors
// =============================

// draft       → Gray (#6b7280)
// sent        → Blue (#3b82f6)
// partially_paid → Amber (#f59e0b)
// paid        → Green (#10b981)
// overdue     → Red (#ef4444)
// cancelled   → Gray (#6b7280)

// =============================
// Key Features
// =============================

// ✅ Server-side rendering - secure, fast
// ✅ Per-item VAT rates shown in table
// ✅ Payment tracking (amount paid, balance due)
// ✅ Professional branded design matching quotes
// ✅ Multi-page support with page numbers
// ✅ Role-based access (staff, accountant, client, admin)
// ✅ Responsive to invoice status changes
// ✅ Payment instructions built-in
// ✅ A4 size, print-optimized
// ✅ Filename includes invoice number for organization
