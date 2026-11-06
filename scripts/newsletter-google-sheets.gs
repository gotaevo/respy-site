/**
 * Recebe os e-mails do formulário "Assinar" do footer e grava numa planilha.
 *
 * Como usar:
 * 1. Crie uma planilha no Google Sheets e copie o ID dela (trecho da URL entre /d/ e /edit).
 * 2. Crie um projeto em script.google.com, cole este arquivo e preencha SPREADSHEET_ID.
 * 3. Implantar > Nova implantação > Tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa.
 * 4. Copie a URL do app da Web e coloque em PUBLIC_NEWSLETTER_URL no .env do site.
 */
const SPREADSHEET_ID = '1YWE-B8b_8zAh7EIAVQLpPJxuncZHajMYbB0TJWBImWM';
const SHEET_NAME = 'Newsletter';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const email = String(data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'invalid_email' });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(['Data', 'E-mail', 'Página']);

    const existing = sheet.getLastRow() > 1
      ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat()
      : [];
    if (!existing.includes(email)) {
      sheet.appendRow([new Date(), email, String(data.page || '')]);
    }
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function json(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

// Rode esta função uma vez no editor para autorizar o acesso à planilha.
function autorizar() {
  SpreadsheetApp.openById(SPREADSHEET_ID).getName();
}
