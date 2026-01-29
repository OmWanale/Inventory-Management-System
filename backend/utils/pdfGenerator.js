const PDFDocument = require('pdfkit');

// Generate Invoice PDF
const generateInvoicePDF = async (invoice, items, customer, companyInfo) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Company Header
      doc.fontSize(20).font('Helvetica-Bold').text(companyInfo.company_name || 'Inventory Pro', 50, 50);
      doc.fontSize(10).font('Helvetica')
        .text(companyInfo.company_address || '', 50, 75)
        .text(`Phone: ${companyInfo.company_phone || ''}`, 50, 90)
        .text(`Email: ${companyInfo.company_email || ''}`, 50, 105)
        .text(`GST: ${companyInfo.company_gst || ''}`, 50, 120);

      // Invoice Title
      doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', 450, 50, { align: 'right' });
      
      // Invoice Details
      doc.fontSize(10).font('Helvetica')
        .text(`Invoice #: ${invoice.invoice_number}`, 400, 80, { align: 'right' })
        .text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 400, 95, { align: 'right' })
        .text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, 400, 110, { align: 'right' });

      // Divider
      doc.moveTo(50, 150).lineTo(550, 150).stroke();

      // Bill To
      doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, 170);
      doc.fontSize(10).font('Helvetica')
        .text(customer?.name || 'Walk-in Customer', 50, 190)
        .text(customer?.billing_address || '', 50, 205)
        .text(`${customer?.city || ''} ${customer?.state || ''} ${customer?.postal_code || ''}`, 50, 220)
        .text(`Phone: ${customer?.phone || ''}`, 50, 235)
        .text(`GST: ${customer?.gst_number || ''}`, 50, 250);

      // Table Header
      const tableTop = 290;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('#', 50, tableTop, { width: 30 });
      doc.text('Product', 80, tableTop, { width: 200 });
      doc.text('Qty', 280, tableTop, { width: 50, align: 'center' });
      doc.text('Price', 330, tableTop, { width: 80, align: 'right' });
      doc.text('Total', 470, tableTop, { width: 80, align: 'right' });

      // Table Header Line
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table Items
      doc.font('Helvetica').fontSize(9);
      let yPosition = tableTop + 25;

      items.forEach((item, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.text(index + 1, 50, yPosition, { width: 30 });
        doc.text(item.product_name || `Product #${item.product_id}`, 80, yPosition, { width: 200 });
        doc.text(item.quantity.toString(), 280, yPosition, { width: 50, align: 'center' });
        doc.text(`₹${item.unit_price.toFixed(2)}`, 330, yPosition, { width: 80, align: 'right' });
        doc.text(`₹${item.total.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

        yPosition += 20;
      });

      // Table Footer Line
      doc.moveTo(50, yPosition + 5).lineTo(550, yPosition + 5).stroke();

      // Totals
      yPosition += 20;
      doc.font('Helvetica').fontSize(10);
      
      doc.text('Subtotal:', 380, yPosition, { width: 80, align: 'right' });
      doc.text(`₹${invoice.subtotal.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
      
      yPosition += 18;
      doc.text(`Tax (${invoice.tax_rate}%):`, 380, yPosition, { width: 80, align: 'right' });
      doc.text(`₹${invoice.tax_amount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

      if (invoice.discount_amount > 0) {
        yPosition += 18;
        doc.text('Discount:', 380, yPosition, { width: 80, align: 'right' });
        doc.text(`-₹${invoice.discount_amount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
      }

      yPosition += 25;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', 380, yPosition, { width: 80, align: 'right' });
      doc.text(`₹${invoice.total_amount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

      // Payment Info
      yPosition += 40;
      doc.font('Helvetica').fontSize(10);
      doc.text(`Payment Mode: ${invoice.payment_mode?.toUpperCase() || 'N/A'}`, 50, yPosition);
      doc.text(`Payment Status: ${invoice.payment_status?.toUpperCase() || 'PENDING'}`, 50, yPosition + 15);
      doc.text(`Amount Paid: ₹${invoice.amount_paid?.toFixed(2) || '0.00'}`, 50, yPosition + 30);

      // Footer
      doc.fontSize(8).text(
        'Thank you for your business!',
        50,
        750,
        { align: 'center', width: 500 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Purchase Order PDF
const generatePurchasePDF = async (purchase, items, vendor, companyInfo) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Company Header
      doc.fontSize(20).font('Helvetica-Bold').text(companyInfo.company_name || 'Inventory Pro', 50, 50);
      doc.fontSize(10).font('Helvetica')
        .text(companyInfo.company_address || '', 50, 75)
        .text(`Phone: ${companyInfo.company_phone || ''}`, 50, 90);

      // Purchase Order Title
      doc.fontSize(24).font('Helvetica-Bold').text('PURCHASE ORDER', 400, 50, { align: 'right' });
      
      // PO Details
      doc.fontSize(10).font('Helvetica')
        .text(`PO #: ${purchase.purchase_number}`, 400, 80, { align: 'right' })
        .text(`Date: ${new Date(purchase.purchase_date).toLocaleDateString()}`, 400, 95, { align: 'right' });

      // Divider
      doc.moveTo(50, 130).lineTo(550, 130).stroke();

      // Vendor Info
      doc.fontSize(12).font('Helvetica-Bold').text('Vendor:', 50, 150);
      doc.fontSize(10).font('Helvetica')
        .text(vendor?.name || '', 50, 170)
        .text(`Contact: ${vendor?.contact_person || ''}`, 50, 185)
        .text(`Phone: ${vendor?.phone || ''}`, 50, 200)
        .text(`GST: ${vendor?.gst_number || ''}`, 50, 215);

      // Table Header
      const tableTop = 250;
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text('#', 50, tableTop, { width: 30 });
      doc.text('Product', 80, tableTop, { width: 220 });
      doc.text('Qty', 300, tableTop, { width: 50, align: 'center' });
      doc.text('Price', 350, tableTop, { width: 80, align: 'right' });
      doc.text('Total', 470, tableTop, { width: 80, align: 'right' });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Items
      doc.font('Helvetica').fontSize(9);
      let yPosition = tableTop + 25;

      items.forEach((item, index) => {
        doc.text(index + 1, 50, yPosition, { width: 30 });
        doc.text(item.product_name || `Product #${item.product_id}`, 80, yPosition, { width: 220 });
        doc.text(item.quantity.toString(), 300, yPosition, { width: 50, align: 'center' });
        doc.text(`₹${item.purchase_price.toFixed(2)}`, 350, yPosition, { width: 80, align: 'right' });
        doc.text(`₹${item.total.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });
        yPosition += 20;
      });

      doc.moveTo(50, yPosition + 5).lineTo(550, yPosition + 5).stroke();

      // Total
      yPosition += 25;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Total:', 380, yPosition, { width: 80, align: 'right' });
      doc.text(`₹${purchase.total_amount.toFixed(2)}`, 470, yPosition, { width: 80, align: 'right' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoicePDF, generatePurchasePDF };
