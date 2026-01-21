'use client';
import { useState } from 'react';
import Link from 'next/link';
import { generateDocument, calculateLineItemTotal, calculateSubtotal, calculateVAT, calculateTotal, formatCurrency, formatDate, type LineItem, type BusinessInfo, type ClientInfo } from '@/utils/documents';

export default function QuoteGenerator() {
  const [business, setBusiness] = useState<BusinessInfo>({ name: 'Your Business', email: 'business@example.com', phone: '07700 000000', address: '123 High Street', city: 'London', postcode: 'SW1A 1AA' });
  const [client, setClient] = useState<ClientInfo>({ name: 'Client Name', email: '', phone: '', address: '', city: '', postcode: '' });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Professional Painting Service', quantity: 100, unitPrice: 4.5, total: 450 },
    { id: '2', description: 'Site Preparation and Cleanup', quantity: 1, unitPrice: 200, total: 200 },
  ]);
  const [vatRate, setVatRate] = useState(20);
  const [notes, setNotes] = useState('Thank you for your business.');
  const [terms, setTerms] = useState('30% deposit required to commence work. Balance due upon completion.');
  const [showPreview, setShowPreview] = useState(true);

  const addLineItem = () => {
    const newId = (Math.max(...lineItems.map(i => parseInt(i.id)), 0) + 1).toString();
    setLineItems([...lineItems, { id: newId, description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const updateLineItem = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = calculateLineItemTotal(updated.quantity, updated.unitPrice);
      }
      return updated;
    }));
  };

  const deleteLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const subtotal = calculateSubtotal(lineItems);
  const vatAmount = calculateVAT(subtotal, vatRate);
  const total = calculateTotal(subtotal, vatAmount);

  const handleGeneratePDF = () => {
    const quote = generateDocument('quote', business, client, lineItems, vatRate, notes, terms);
    alert(`Quote ${quote.details.number} generated. PDF download ready (scheduled for next update).`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Link href="/docs" className="text-blue-600 hover:text-blue-700">← Back to Docs</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-8">
            <h1 className="text-4xl font-bold text-slate-900">Generate Quote</h1>

            {/* Business Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Your Business</h2>
              <div className="space-y-3">
                <input type="text" placeholder="Business name" value={business.name} onChange={(e) => setBusiness({...business, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="email" placeholder="Email" value={business.email} onChange={(e) => setBusiness({...business, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="Phone" value={business.phone} onChange={(e) => setBusiness({...business, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="text" placeholder="Address" value={business.address} onChange={(e) => setBusiness({...business, address: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="City" value={business.city} onChange={(e) => setBusiness({...business, city: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <input type="text" placeholder="Postcode" value={business.postcode} onChange={(e) => setBusiness({...business, postcode: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Client (Optional)</h2>
              <div className="space-y-3">
                <input type="text" placeholder="Client name" value={client.name} onChange={(e) => setClient({...client, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="email" placeholder="Client email" value={client.email} onChange={(e) => setClient({...client, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="tel" placeholder="Client phone" value={client.phone} onChange={(e) => setClient({...client, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                <input type="text" placeholder="Client address" value={client.address} onChange={(e) => setClient({...client, address: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Line Items</h2>
              <div className="space-y-4 mb-4">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex gap-2">
                    <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value))} className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                    <input type="number" placeholder="Unit price" value={item.unitPrice} onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                    <div className="w-24 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-slate-900">{formatCurrency(item.total)}</div>
                    <button onClick={() => deleteLineItem(item.id)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addLineItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                + Add Item
              </button>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">VAT Rate (%)</label>
                  <input type="number" value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value))} className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 mb-2">Terms & Conditions</label>
                  <textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(!showPreview)} className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all">
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button onClick={handleGeneratePDF} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all">
                📥 Download PDF
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Preview</h3>
                <div className="text-sm space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-gray-600">Quote No.</p>
                    <p className="font-bold text-slate-900">Q-000001</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Date</p>
                    <p className="font-medium text-slate-900">{formatDate(new Date().toISOString().split('T')[0])}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-1">From</p>
                    <p className="font-semibold text-slate-900">{business.name}</p>
                    <p className="text-xs text-gray-600">{business.email}</p>
                  </div>
                  {client.name && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase mb-1">To</p>
                      <p className="font-semibold text-slate-900">{client.name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT ({vatRate}%)</span>
                    <span className="font-medium text-slate-900">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
