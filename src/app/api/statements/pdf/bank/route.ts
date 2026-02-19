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
      `attachment; filename="Statement_${year}-${String(month + 1).padStart(2, '0')}_Bank.pdf"`
    );

    // Pipe the PDF to the response
    doc.pipe(response as any);

    // Generate PDF content
    const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('TISSCA', 50, 50);
    doc.fontSize(12).font('Helvetica').text('Monthly Bank Statement', { underline: true });
    doc.moveDown(0.5);
    
    // Statement info
    doc.fontSize(11).text(`Period: ${monthName} ${year}`, { lineBreak: false });
    doc.text(`Account: ${user.email}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(1);

    // Summary section
    doc.fontSize(12).font('Helvetica-Bold').text('Summary');
    doc.fontSize(10).font('Helvetica');
    doc.text('Opening Balance: £0.00');
    doc.text('Total Income: £0.00');
    doc.text('Total Expenses: £0.00');
    doc.text('Closing Balance: £0.00');
    doc.moveDown(1);

    // Transactions section
    doc.fontSize(12).font('Helvetica-Bold').text('Transactions');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const col1 = 50;
    const col2 = 130;
    const col3 = 280;
    const col4 = 450;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Date', col1, tableTop);
    doc.text('Description', col2, tableTop);
    doc.text('Category', col3, tableTop);
    doc.text('Amount', col4, tableTop);

    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Sample transaction rows (in real scenario, loop through actual transactions)
    doc.fontSize(9).font('Helvetica');
    const transactions = [
      { date: '01/01/2024', description: 'Invoice #001', category: 'Income', amount: '+£500.00' },
      { date: '05/01/2024', description: 'Materials', category: 'Expense', amount: '-£150.00' },
      { date: '10/01/2024', description: 'Equipment', category: 'Expense', amount: '-£75.00' },
    ];

    let currentY = tableTop + 25;
    transactions.forEach((tx) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 50;
      }
      doc.text(tx.date, col1, currentY);
      doc.text(tx.description, col2, currentY);
      doc.text(tx.category, col3, currentY);
      doc.text(tx.amount, col4, currentY, { align: 'right' });
      currentY += 20;
    });

    doc.moveDown(1);
    doc.moveTo(col1, doc.y).lineTo(550, doc.y).stroke();

    // Totals
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Total Income: £500.00', col1, doc.y + 10);
    doc.text('Total Expenses: £225.00', col1, doc.y + 20);
    doc.text('Net Profit: £275.00', col1, doc.y + 30);

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#999999');
    doc.text('This is an automated statement from TISSCA. For enquiries, contact support.', 50, 750, {
      align: 'center',
      width: 500,
    });

    // Finalize PDF
    doc.end();

    return response;
  } catch (error) {
    console.error('Error generating bank PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
