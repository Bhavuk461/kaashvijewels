/**
 * Google Apps Script Web App for The Kaashvi Jewels.
 * Bound to the orders spreadsheet. Receives verified orders from the
 * Cloudflare Worker, appends a row, and emails the owner via Gmail.
 *
 * Script Properties to set (Project Settings -> Script Properties):
 *   SHARED_TOKEN  -> must match APPS_SCRIPT_TOKEN in the Worker
 *   OWNER_EMAIL   -> owner Gmail address that receives order alerts
 *   SHEET_ID      -> spreadsheet ID (optional; defaults to bound sheet)
 *   SHEET_NAME    -> tab name (optional; defaults to first sheet)
 */

function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var body = JSON.parse(e.postData.contents);

    if (!body.token || body.token !== props.getProperty('SHARED_TOKEN')) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: 'unauthorized' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = getSheet_(props);
    ensureHeader_(sheet);

    var c = body.customer || {};
    var t = body.totals || {};
    var items = (body.items || [])
      .map(function (it) { return it.name + ' x' + it.quantity; })
      .join(', ');
    var address = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(', ');
    var name = [c.firstName, c.lastName].filter(Boolean).join(' ');

    sheet.appendRow([
      new Date(),
      body.orderId || '',
      body.paymentId || '',
      name,
      c.email || '',
      c.phone || '',
      address,
      t.subtotal || '',
      t.gst || '',
      t.shipping || '',
      t.total || '',
      items,
      body.status || 'PAID',
    ]);

    notifyOwner_(props, { name: name, address: address, items: items, customer: c, totals: t, body: body });

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet_(props) {
  var sheetId = props.getProperty('SHEET_ID');
  var ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = props.getProperty('SHEET_NAME');
  return sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'Timestamp', 'Order ID', 'Payment ID', 'Name', 'Email', 'Phone',
    'Address', 'Subtotal', 'GST', 'Shipping', 'Total', 'Items', 'Status',
  ]);
}

function notifyOwner_(props, d) {
  var owner = props.getProperty('OWNER_EMAIL');
  if (!owner) return;
  var subject = 'New order ' + (d.body.orderId || '') + ' - INR ' + (d.totals.total || '');
  var lines = [
    'New paid order received.',
    '',
    'Order ID: ' + (d.body.orderId || ''),
    'Payment ID: ' + (d.body.paymentId || ''),
    'Name: ' + d.name,
    'Email: ' + (d.customer.email || ''),
    'Phone: ' + (d.customer.phone || ''),
    'Address: ' + d.address,
    'Items: ' + d.items,
    'Subtotal: INR ' + (d.totals.subtotal || ''),
    'GST: INR ' + (d.totals.gst || ''),
    'Shipping: INR ' + (d.totals.shipping || ''),
    'Total: INR ' + (d.totals.total || ''),
  ];
  MailApp.sendEmail(owner, subject, lines.join('\n'));
}
