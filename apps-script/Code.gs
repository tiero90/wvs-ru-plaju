/**
 * WVS RU III Plaju – shared database on Google Sheet + Google Drive.
 *
 * Paste this file into Extensions → Apps Script of the database Google Sheet,
 * fill APP_PASSWORD with the website password, then
 * Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 *
 * Every request must carry token = SHA-256("wvs-api|" + APP_PASSWORD), which the
 * website computes from the password typed on the login page.
 */
const APP_PASSWORD = 'GANTI_DENGAN_PASSWORD_WEBSITE';
const SHEET_NAME = 'data';
const FOLDER_NAME = 'WVS RU III Plaju - Evidence';
const CHUNK = 45000;          // Google Sheets cell limit is 50,000 characters
const HEAD = ['coll', 'id', 'updatedAt', 'deleted'];

function doGet() {
  return out_({ ok: true, app: 'wvs-ru-plaju' });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: 'bad_request' }); }
  if (!req || req.token !== token_()) return out_({ ok: false, error: 'unauthorized' });
  try {
    switch (req.op) {
      case 'ping': return out_({ ok: true, now: Date.now() });
      case 'list': return out_({ ok: true, now: Date.now(), docs: list_(Number(req.since) || 0) });
      case 'set': return out_(locked_(function () { return { ok: true, t: write_(req.coll, req.id, req.data, false) }; }));
      case 'del': return out_(locked_(function () { return { ok: true, t: write_(req.coll, req.id, null, true) }; }));
      case 'bulk': return out_(locked_(function () {
        (req.docs || []).forEach(function (d) { write_(d.coll, d.id, d.data, false); });
        return { ok: true, n: (req.docs || []).length };
      }));
      case 'upload': return out_(upload_(req));
      case 'file': return out_(file_(req.fid));
      default: return out_({ ok: false, error: 'unknown_op' });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function token_() {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'wvs-api|' + APP_PASSWORD, Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function locked_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEAD.length + 1).setValues([HEAD.concat(['data'])]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_(sh) {
  const n = sh.getLastRow() - 1, w = Math.max(sh.getLastColumn(), HEAD.length + 1);
  return n > 0 ? sh.getRange(2, 1, n, w).getValues() : [];
}

function list_(since) {
  return rows_(sheet_()).filter(function (r) { return r[0] && Number(r[2]) > since; }).map(function (r) {
    const del = r[3] === true || r[3] === 'TRUE';
    let data = null;
    if (!del) { try { data = JSON.parse(r.slice(HEAD.length).join('')); } catch (e) { data = null; } }
    return { coll: String(r[0]), id: String(r[1]), t: Number(r[2]), deleted: del, data: data };
  });
}

function write_(coll, id, data, deleted) {
  if (!coll || !id) throw new Error('missing coll/id');
  const sh = sheet_(), rows = rows_(sh), t = Date.now();
  const json = deleted ? '' : JSON.stringify(data || {});
  const chunks = [];
  for (let i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK));
  if (!chunks.length) chunks.push('');
  let idx = -1;
  for (let i = 0; i < rows.length; i++) { if (String(rows[i][0]) === coll && String(rows[i][1]) === String(id)) { idx = i; break; } }
  const width = Math.max(HEAD.length + chunks.length, idx >= 0 ? rows[idx].length : 0);
  const row = [coll, String(id), t, !!deleted].concat(chunks);
  while (row.length < width) row.push('');
  const at = idx >= 0 ? idx + 2 : sh.getLastRow() + 1;
  const range = sh.getRange(at, 1, 1, row.length);
  range.setNumberFormat('@');
  range.setValues([row]);
  sh.getRange(at, 3).setNumberFormat('0').setValue(t);
  sh.getRange(at, 4).setNumberFormat('General').setValue(!!deleted);
  return t;
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* recreate below */ } }
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function upload_(req) {
  const bytes = Utilities.base64Decode(req.b64 || '');
  if (!bytes.length) throw new Error('empty file');
  if (bytes.length > 2 * 1024 * 1024 + 1024) throw new Error('file lebih dari 2 MB');
  const name = String(req.name || 'evidence').slice(0, 180);
  const blob = Utilities.newBlob(bytes, req.type || 'application/octet-stream', name);
  const file = folder_().createFile(blob);
  return { ok: true, fid: file.getId() };
}

function file_(fid) {
  const file = DriveApp.getFileById(String(fid));
  const parents = file.getParents();
  const folderId = folder_().getId();
  let inFolder = false;
  while (parents.hasNext()) { if (parents.next().getId() === folderId) { inFolder = true; break; } }
  if (!inFolder) throw new Error('not_found');
  const blob = file.getBlob();
  return { ok: true, type: blob.getContentType(), name: file.getName(), b64: Utilities.base64Encode(blob.getBytes()) };
}
