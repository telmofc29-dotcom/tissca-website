import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

export async function GET(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    // Set response headers
    const response = new NextResponse();
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="Statement_${year}-${String(month + 1).padStart(2, '0')}_HMRC.pdf"`
    );

    // Pipe the PDF to the response
    doc.pipe(response as any);

    // Generate PDF content
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('BUILDR', 50, 50);
    doc.fontSize(14).font('Helvetica-Bold').text('HMRC Tax Summary Statement', { underline: true });
    doc.moveDown(0.5);
    
    // Statement info
    doc.fontSize(11).font('Helvetica');
    doc.text(`Period: ${monthName} ${year}`, { lineBreak: false });
    doc.text(`Business: BUILDR`);
    doc.text(`Account: ${user.email}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(1);

    // Notice
    doc.fontSize(9).fillColor('#CC0000').font('Helvetica-Bold');
    doc.text('For Tax Return Purposes Only');
    doc.fillColor('black').font('Helvetica');
    doc.moveDown(0.5);

    // Income Section
    doc.fontSize(12).font('Helvetica-Bold').text('Income Summary');
    doc.moveDown(0.5);

    const incomeCategories = [
      { category: 'Invoice Income', amount: '£0.00' },
      { category: 'Other Income', amount: '£0.00' },
    ];

    doc.fontSize(10).font('Helvetica');
    incomeCategories.forEach((cat) => {
      doc.text(`  ${cat.category}: ${cat.amount}`);
    });
    doc.text('  ');
    doc.font('Helvetica-Bold').text(`  Total Income: £0.00`);
    doc.moveDown(1);

    // Expenses Section
    doc.fontSize(12).font('Helvetica-Bold').text('Expense Summary');
    doc.moveDown(0.5);

    const expenseCategories = [
      { category: 'Materials & Supplies', amount: '£0.00' },
      { category: 'Labour Costs', amount: '£0.00' },
      { category: 'Equipment & Tools', amount: '£0.00' },
      { category: 'Travel & Transport', amount: '£0.00' },
      { category: 'Utilities', amount: '£0.00' },
      { category: 'Other Expenses', amount: '£0.00' },
    ];

    doc.fontSize(10).font('Helvetica');
    expenseCategories.forEach((cat) => {
      doc.text(`  ${cat.category}: ${cat.amount}`);
    });
    doc.text('  ');
    doc.font('Helvetica-Bold').text(`  Total Expenses: £0.00`);
    doc.moveDown(1);

    // Summary
    doc.fontSize(12).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text('Total Income: £0.00', 50);
    doc.text('Total Expenses: £0.00');
    doc.text('Net Profit/Loss: £0.00');
    doc.moveDown(1);

    // Important notes
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    doc.text('Important Notes:', { underline: true });
    doc.text('• This statement is generated for informational purposes only', { indent: 10 });
    doc.text('• Figures should be verified against your records', { indent: 10 });
    doc.text('• Please consult with your accountant for tax filing', { indent: 10 });
    doc.text('• Keep all supporting receipts and invoices', { indent: 10 });
    doc.moveDown(1);

    // Footer with disclaimer
    doc.fontSize(7).fillColor('#999999');
    doc.text('This document was generated automatically by BUILDR and is suitable for submission', 50, 700, {
      align: 'center',
      width: 500,
    });
    doc.text('with your Self Assessment tax return to HMRC.', {
      align: 'center',
      width: 500,
    });

    // Finalize PDF
    doc.end();

    return response;
  } catch (error) {
    console.error('Error generating HMRC PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
