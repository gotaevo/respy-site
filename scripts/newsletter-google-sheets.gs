/**
 * Recebe os e-mails do "Assinar" do footer (aba Newsletter) e o formulário da página /contact (aba Contato).
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
const CONTACT_SHEET_NAME = 'Contato';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const email = String(data.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'invalid_email' });

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Formulário da página /contact
    if (data.type === 'contato') {
      const sheet = ss.getSheetByName(CONTACT_SHEET_NAME) || ss.insertSheet(CONTACT_SHEET_NAME);
      if (sheet.getLastRow() === 0) sheet.appendRow(['Data', 'Nome', 'E-mail', 'WhatsApp', 'Empresa', 'Mensagem', 'Página']);
      // Prefixa ' em textos que começam com = + - @ para a planilha não tratar como fórmula
      const field = (value, max) => {
        const text = String(value || '').trim().slice(0, max);
        return /^[=+\-@]/.test(text) ? "'" + text : text;
      };
      sheet.appendRow([
        new Date(),
        field(data.nome, 120),
        email,
        field(data.whatsapp, 40),
        field(data.empresa, 160),
        field(data.mensagem, 4000),
        field(data.page, 200),
      ]);
      return json({ ok: true });
    }

    // Newsletter do footer
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
