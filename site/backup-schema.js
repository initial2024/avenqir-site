"use strict";
/* AVENQIR browser-only backup schema: strict allowlist, no network or server calls. */
(function (root) {
  const FORMAT = 'avenqir-device-transfer-v1';
  const GROUPS = Object.freeze({
    bookmarks: { label: '私人书签', keys: ['avenqir_v6_bookmarks'] },
    notes: { label: '本地笔记', keys: ['avenqir_v6_notes'] },
    daily: { label: '计时、任务与游戏记录',
      keys: ['avenqir_v5_timer','avenqir_v5_tasks','avenqir_v5_2048',
             'avenqir_v5_2048best','avenqir_v5_memorybest','avenqir_v5_pop'] }
  });
  const KEYS = Object.values(GROUPS).flatMap(x => x.keys);
  const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const validNum = (x, min, max) => Number.isFinite(x) && x >= min && x <= max;
  const validScore = x => Number.isInteger(x) && x >= 0 && x <= 100000000;
  const validBoard = b => Array.isArray(b) && b.length === 16 &&
    b.every(x => Number.isInteger(x) && x >= 0 && (x === 0 || (x <= 131072 && (x & (x - 1)) === 0)));
  function safeURL(raw) {
    if (typeof raw !== 'string' || raw.length > 1800) return false;
    try {
      const u = new URL(raw);
      return ['http:','https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password;
    } catch { return false; }
  }
  function validateBookmarks(value) {
    if (!Array.isArray(value) || value.length > 200) return false;
    const ids = new Set(), urls = new Set();
    for (const x of value) {
      if (!isObj(x) || typeof x.id !== 'string' || !x.id || x.id.length > 80 ||
          typeof x.name !== 'string' || !x.name.trim() || x.name.length > 80 ||
          typeof x.category !== 'string' || !x.category.trim() || x.category.length > 32 ||
          typeof x.note !== 'string' || x.note.length > 250 ||
          !safeURL(x.url) || !validNum(x.at, 1, 1e15) ||
          typeof x.fav !== 'boolean' || typeof x.todo !== 'boolean' ||
          typeof x.custom !== 'boolean') return false;
      if (ids.has(x.id) || urls.has(x.url)) return false;
      ids.add(x.id); urls.add(x.url);
    }
    return true;
  }
  function validateNotes(value) {
    if (!Array.isArray(value) || value.length > 30) return false;
    const ids = new Set();
    for (const x of value) {
      if (!isObj(x) || typeof x.id !== 'string' || !x.id || x.id.length > 80 ||
          typeof x.title !== 'string' || x.title.length > 100 ||
          typeof x.body !== 'string' || x.body.length > 30000 ||
          !validNum(x.at, 1, 1e15) || ids.has(x.id)) return false;
      ids.add(x.id);
    }
    return true;
  }
  function validGame(value) {
    return isObj(value) && validBoard(value.board) && validScore(value.score);
  }
  function validate(key, value) {
    switch (key) {
      case 'avenqir_v6_bookmarks': return validateBookmarks(value);
      case 'avenqir_v6_notes': return validateNotes(value);
      case 'avenqir_v5_tasks':
        return isObj(value) && typeof value.day === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(value.day) &&
          Array.isArray(value.items) && value.items.length <= 3 &&
          value.items.every(t => isObj(t) && typeof t.text === 'string' &&
            !!t.text.trim() && t.text.length <= 100 && typeof t.done === 'boolean');
      case 'avenqir_v5_timer':
        return isObj(value) && validNum(value.total, 60, 14400) &&
          validNum(value.remaining, 0, 14400) && typeof value.label === 'string' &&
          value.label.length <= 80 && typeof value.running === 'boolean' &&
          validNum(value.endAt, 0, 1e15);
      case 'avenqir_v5_2048':
        return validGame(value) &&
          (value.prev === undefined || value.prev === null || validGame(value.prev)) &&
          typeof value.won === 'boolean';
      case 'avenqir_v5_2048best':
      case 'avenqir_v5_memorybest':
      case 'avenqir_v5_pop': return validScore(value);
      default: return false;
    }
  }
  function transferCopy(key, val) {
    // Do not resume an old wall-clock timer immediately after migrating devices.
    if (key === 'avenqir_v5_timer') {
      const x = Object.assign({}, val);
      if (x.running) x.remaining = Math.max(0, Math.min(x.total, Math.ceil((x.endAt-Date.now())/1000)));
      x.running = false;
      x.endAt = 0;
      return x;
    }
    return val;
  }
  function makeExport(storage, groupNames) {
    const selected = new Set(groupNames);
    const data = Object.create(null), skipped = [];
    for (const [group, info] of Object.entries(GROUPS)) {
      if (!selected.has(group)) continue;
      for (const key of info.keys) {
        let raw;
        try { raw = storage.getItem(key); } catch { skipped.push(key); continue; }
        if (raw === null) continue;
        try {
          const value = JSON.parse(raw);
          if (!validate(key, value)) { skipped.push(key); continue; }
          data[key] = transferCopy(key, value);
        } catch { skipped.push(key); }
      }
    }
    if (!Object.keys(data).length) throw new Error('没有可导出的有效本地记录');
    return { archive: {format: FORMAT, exportedAt: new Date().toISOString(), data}, skipped };
  }
  function readArchive(value) {
    if (!isObj(value) || value.format !== FORMAT || !isObj(value.data)) throw new Error('文件不是 AVENQIR 统一备份');
    const entries = Object.entries(value.data);
    if (!entries.length || entries.length > KEYS.length) throw new Error('备份内容为空或字段数超限');
    const result = Object.create(null);
    for (const [key, item] of entries) {
      if (!KEYS.includes(key) || !validate(key, item)) throw new Error('备份中存在未知或无效字段');
      result[key] = transferCopy(key, item);
    }
    return result;
  }
  function selectedKeys(data, groupNames) {
    const selected = new Set(groupNames);
    return Object.entries(GROUPS).filter(([g]) => selected.has(g))
      .flatMap(([,x]) => x.keys).filter(key => Object.prototype.hasOwnProperty.call(data,key));
  }
  function importInto(storage, data, keys) {
    // Read the original bytes first. On quota/write errors restore the original values.
    const prior = new Map();
    for (const key of keys) prior.set(key,storage.getItem(key));
    const done = [];
    try {
      for (const key of keys) {
        if (!KEYS.includes(key) || !Object.prototype.hasOwnProperty.call(data,key) ||
            !validate(key,data[key])) throw new Error('备份数据校验未通过');
        storage.setItem(key,JSON.stringify(data[key]));
        done.push(key);
      }
    } catch (error) {
      for (const key of done.reverse()) {
        try {
          const old = prior.get(key);
          if (old === null) storage.removeItem(key);
          else storage.setItem(key,old);
        } catch { throw new Error('写入失败且回滚未完成，请勿清理原备份'); }
      }
      throw error;
    }
    return done.length;
  }
  root.AVENQIR_TRANSFER = Object.freeze({FORMAT,GROUPS,KEYS,validate,makeExport,readArchive,selectedKeys,importInto});
})(typeof window !== 'undefined' ? window : globalThis);
