/**
 * Машинские · Семейный атлас — приём правок от родственников (веб-приложение Apps Script).
 * Развёртывание: «Веб-приложение», выполнять от имени владельца, доступ «Все».
 * Правка → строка в таблице «Машинские — правки» + письмо владельцу. На сайт сама ничего не меняет.
 */
const NOTIFY = 'bostimur@gmail.com';
const MAX_TEXT = 5000, MAX_PHOTO = 6 * 1024 * 1024;

function doGet() { return out_({ ok: true }); }

function doPost(e) {
  try {
    if (!rateOk_()) return out_({ ok: false, error: 'Слишком много правок подряд, попробуйте через минуту.' });
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const author = clip_(d.author, 120), person = clip_(d.person, 300), text = clip_(d.text, MAX_TEXT), page = clip_(d.page, 300);
    if (!author || !text) return out_({ ok: false, error: 'Нужны имя и текст правки.' });

    let photoUrl = '';
    if (d.photo && /^data:image\/(jpeg|png|webp);base64,/.test(d.photo)) {
      const [head, b64] = d.photo.split(',');
      const bytes = Utilities.base64Decode(b64);
      if (bytes.length <= MAX_PHOTO) {
        const type = head.slice(5, head.indexOf(';'));
        const name = Utilities.formatDate(new Date(), 'Europe/Moscow', 'yyyy-MM-dd HH-mm') + ' ' + author.replace(/[\\/:*?"<>|]/g, '') + '.' + type.split('/')[1];
        photoUrl = folder_().createFile(Utilities.newBlob(bytes, type, name)).getUrl();
      }
    }

    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { sheet_().appendRow([new Date(), author, person, text, photoUrl, page, 'новая']); } finally { lock.releaseLock(); }

    MailApp.sendEmail({
      to: NOTIFY,
      subject: 'Машинские: правка от ' + author,
      body: 'От: ' + author + '\nО ком / о чём: ' + (person || '—') + '\n\n' + text +
            (photoUrl ? '\n\nФото: ' + photoUrl : '') + '\n\nВсе правки: ' + SpreadsheetApp.openById(props_().getProperty('SHEET_ID')).getUrl()
    });
    return out_({ ok: true });
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: 'Не удалось сохранить правку.' });
  }
}

function props_() { return PropertiesService.getScriptProperties(); }
function sheet_() {
  let id = props_().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id).getSheets()[0];
  const ss = SpreadsheetApp.create('Машинские — правки');
  const sh = ss.getSheets()[0];
  sh.appendRow(['Когда', 'Кто прислал', 'О ком / о чём', 'Правка', 'Фото', 'Страница', 'Статус']);
  sh.setFrozenRows(1); sh.getRange(1, 1, 1, 7).setFontWeight('bold');
  props_().setProperty('SHEET_ID', ss.getId());
  return sh;
}
function folder_() {
  const id = props_().getProperty('FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  const f = DriveApp.createFolder('Машинские — фото к правкам');
  props_().setProperty('FOLDER_ID', f.getId());
  return f;
}
function rateOk_() {
  const c = CacheService.getScriptCache(), k = 'n' + Math.floor(Date.now() / 60000);
  const n = Number(c.get(k) || 0) + 1; c.put(k, String(n), 120);
  return n <= 20;
}
function clip_(s, n) { return String(s == null ? '' : s).trim().slice(0, n); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Создать таблицу и папку заранее (запустить один раз после «Разрешить»). */
function podgotovit() { sheet_(); folder_(); Logger.log(SpreadsheetApp.openById(props_().getProperty('SHEET_ID')).getUrl()); }
