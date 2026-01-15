
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('/app/data/invoice-generator.db');
const db = new sqlite3.Database(dbPath);


const invoiceNumber = "INV-367041-022";
const query = `
    SELECT 
      i.invoice_number,
      i.status as InvoiceStatus,
      pd.id as PaymentId,
      pd.amount_paid,
      pd.payment_date
    FROM invoices i
    LEFT JOIN payment_details pd ON i.id = pd.invoice_id
    WHERE i.invoice_number = ? AND i.status != 'pending'
`;

console.log(`Inspecting invoice: ${invoiceNumber}`);

db.all(query, [invoiceNumber], (err, rows) => {
    if (err) {
        console.error("Database Error:", err);
        return;
    }
    console.table(rows);
});

