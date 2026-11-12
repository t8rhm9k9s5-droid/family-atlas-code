/**
 * Машинские · Семейный атлас — выкладка на Firebase Hosting (Google Apps Script).
 * Проект Apps Script в аккаунте владельца; манифест — tools/firebase-deploy.appsscript.json.
 *
 * Перед запуском положить в «Свойства скрипта»:
 *   FB_PROJECT  — id проекта Firebase (например dom-site-616ff)
 *   FB_SITE     — id сайта (например mashinskie → mashinskie.web.app)
 *   FILES_JSON  — {"index.html":"<url>", "vault/atlas-….txt":"<url>", …}  (временные ссылки на файлы)
 * Пароль сайта и расшифрованные данные сюда не попадают: выкладывается только зашифрованный архив.
 */
const API = 'https://firebasehosting.googleapis.com/v1beta1/';

function vykladka() {
  const p = PropertiesService.getScriptProperties();
  const project = p.getProperty('FB_PROJECT'), site = p.getProperty('FB_SITE');
  const files = JSON.parse(p.getProperty('FILES_JSON') || '{}');
  if (!project || !site || !Object.keys(files).length) throw new Error('Нет FB_PROJECT / FB_SITE / FILES_JSON');

  ensureSite_(project, site);

  // 1. Скачать файлы, сжать, посчитать хэши
  const gz = {}, hashes = {};
  Object.keys(files).forEach(path => {
    const r = UrlFetchApp.fetch(files[path], { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) throw new Error('Не скачался ' + path + ': ' + r.getResponseCode());
    const z = Utilities.gzip(r.getBlob());
    const h = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, z.getBytes()));
    gz[h] = z; hashes['/' + path] = h;
  });

  // 2. Новая версия с заголовками
  const version = call_('post', API + 'sites/' + site + '/versions', { config: {
    headers: [
      { glob: '**', headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer',
                               'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' } },
      { glob: '/@(index.html|research.html|sw.js|vault.json)', headers: { 'Cache-Control': 'no-cache' } },
      { glob: '/vault/**', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } }
    ],
    cleanUrls: false, trailingSlashBehavior: 'ADD'
  }}).name;

  // 3. Загрузить недостающие файлы
  const pop = call_('post', API + version + ':populateFiles', { files: hashes });
  (pop.uploadRequiredHashes || []).forEach(h => {
    const r = UrlFetchApp.fetch(pop.uploadUrl + '/' + h, { method: 'post', contentType: 'application/octet-stream',
      payload: gz[h].getBytes(), headers: auth_(), muteHttpExceptions: true });
    if (r.getResponseCode() >= 300) throw new Error('Загрузка ' + h + ': ' + r.getContentText());
  });

  // 4. Закрыть версию и выпустить
  call_('patch', API + version + '?update_mask=status', { status: 'FINALIZED' });
  const rel = call_('post', API + 'sites/' + site + '/releases?versionName=' + encodeURIComponent(version), {});
  p.deleteProperty('FILES_JSON'); // временные ссылки больше не нужны
  Logger.log('Готово: https://' + site + '.web.app  версия ' + version + '  релиз ' + rel.name);
}

function ensureSite_(project, site) {
  const r = UrlFetchApp.fetch(API + 'projects/' + project + '/sites?siteId=' + site,
    { method: 'post', contentType: 'application/json', payload: '{}', headers: auth_(), muteHttpExceptions: true });
  const c = r.getResponseCode();
  if (c === 200) Logger.log('Создан сайт ' + site);
  else if (c === 409) Logger.log('Сайт ' + site + ' уже есть');
  else throw new Error('Сайт ' + site + ': ' + c + ' ' + r.getContentText());
}

function call_(method, url, body) {
  const r = UrlFetchApp.fetch(url, { method: method, contentType: 'application/json', payload: JSON.stringify(body),
    headers: auth_(), muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error(method + ' ' + url + ': ' + r.getResponseCode() + ' ' + r.getContentText());
  return JSON.parse(r.getContentText() || '{}');
}
function auth_() { return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }; }
function hex_(bytes) { return bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join(''); }

/** Первый запуск: только чтобы Google показал окно «Разрешить». */
function razreshit() { ScriptApp.getOAuthToken(); UrlFetchApp.fetch('https://firebasehosting.googleapis.com/$discovery/rest?version=v1beta1'); }
