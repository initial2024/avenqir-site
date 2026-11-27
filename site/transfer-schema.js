"use strict";
/* AVENQIR browser-only backup schema: strict allowlist, no network or server calls. */
(function (root) {
  const FORMAT = 'avenqir-device-transfer-v1';
  const RECOMMENDATIONS=root.AVENQIR_RECOMMENDATIONS||
    (typeof module==='object'&&module.exports?require('./recommendations-model.js'):null);
  const GROUPS = Object.freeze({
    start: { label: '首页工具收藏', keys: ['avenqir.start.favorites.v1'] },
    bookmarks: { label: '私人书签 / 公开网址收藏', keys: ['avenqir_v6_bookmarks','avenqir.link-atlas.favorites.v8'] },
    notes: { label: '本地笔记', keys: ['avenqir_v6_notes'] },
    daily: { label: '计时、任务与游戏记录',
      keys: ['avenqir_v5_timer','avenqir_v5_tasks','avenqir_v5_2048',
             'avenqir_v5_2048best','avenqir_v5_memorybest','avenqir_v5_pop'] },
    recommendations: { label: '本机打开记录与评分', keys: ['avenqir.recommendations.local.v1'] },
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
    const ids = new Set();
    for (const x of value) {
      if (!isObj(x) || typeof x.id !== 'string' || !x.id || x.id.length > 80 ||
          typeof x.name !== 'string' || !x.name.trim() || x.name.length > 80 ||
          typeof x.category !== 'string' || !x.category.trim() || x.category.length > 32 ||
          typeof x.note !== 'string' || x.note.length > 250 ||
          !safeURL(x.url) || !validNum(x.at, 1, 1e15) ||
          typeof x.fav !== 'boolean' || typeof x.todo !== 'boolean' ||
          typeof x.custom !== 'boolean') return false;
      if (ids.has(x.id)) return false;
      ids.add(x.id);
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
      case 'avenqir.start.favorites.v1':
        // Only site-relative built-in tool paths are eligible. The homepage only renders known cards.
        return Array.isArray(value) && value.length <= 100 && new Set(value).size === value.length &&
          value.every(x => typeof x === 'string' && /^[a-z][a-z-]{0,40}\.(?:html|php)(?:#[A-Za-z][\w-]{0,60})?$/.test(x));
      case 'avenqir.recommendations.local.v1': return !!RECOMMENDATIONS?.valid(value);
      case 'avenqir.link-atlas.favorites.v8':
        return Array.isArray(value) && value.length <= 500 && value.every(x => typeof x === 'string' && safeURL(x)) && new Set(value).size === value.length;
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
    if (key === 'avenqir.recommendations.local.v1') return RECOMMENDATIONS.clean(val);
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
  // Deliberately conservative merge: the local record always wins if its ID / URL exists.
  // For non-list state (timer, games, tasks), merge only fills absent local keys.
  // Never silently overwrite an existing note body or resume an imported timer.
  function mergeRecords(key, local, incoming) {
    if (key === 'avenqir.recommendations.local.v1') return RECOMMENDATIONS.merge(local,incoming);
    if (key === 'avenqir.link-atlas.favorites.v8' || key === 'avenqir.start.favorites.v1') {
      return [...new Set([...local, ...incoming])];
    }
    if (key === 'avenqir_v6_bookmarks' || key === 'avenqir_v6_notes') {
      const list=local.slice(), ids=new Set(local.map(x=>x.id));
      const urls=key==='avenqir_v6_bookmarks'?new Set(local.map(x=>x.url)):null;
      for (const item of incoming) {
        if (ids.has(item.id) || (urls&&urls.has(item.url))) continue;
        list.push(item);ids.add(item.id);
        if(urls)urls.add(item.url);
      }
      return list;
    }
    return local;
  }
  function prepareImport(storage, data, keys, mode='replace') {
    if (!['replace','merge'].includes(mode)) throw new Error('未知恢复模式');
    const chosen=[...new Set(keys)], updates=Object.create(null), counts={written:0,unchanged:0,merged:0};
    for (const key of chosen) {
      if (!KEYS.includes(key) || !Object.prototype.hasOwnProperty.call(data,key) || !validate(key,data[key])) {
        throw new Error('备份数据校验未通过');
      }
      const old=storage.getItem(key);
      if (mode==='replace' || old===null) {
        updates[key]=transferCopy(key,data[key]);counts.written++;continue;
      }
      let original;
      try{original=JSON.parse(old);}catch{throw new Error('本机 '+key+' 数据损坏，请先导出并选择覆盖，不能盲目合并');}
      if (!validate(key,original))throw new Error('本机 '+key+' 格式异常，请先单独备份');
      const combined=mergeRecords(key,original,data[key]);
      if (!validate(key,combined))throw new Error('合并后 '+key+' 超过数量限制或包含无效记录');
      if(JSON.stringify(combined)===JSON.stringify(original))counts.unchanged++;
      else{updates[key]=combined;counts.written++;counts.merged++;}
    }
    return {updates,counts};
  }
  function toMarkdown(data) {
    const esc=value=>String(value??'').replace(/[\\\r\n]+/g,' ').replace(/([\\\[\]_*<>|])/g,'\\$1').slice(0,30000);
    const out=['# AVENQIR 可读数据备份','', '> 仅供阅读：不能从此 Markdown 文件恢复；恢复数据必须使用 JSON 备份。','> 注意：包含明文书签和笔记，请勿上传到公共平台。',''];
    const add=(title,records,format)=>{
      if(!Array.isArray(records)||!records.length)return;
      out.push('## '+title,'');
      for(const r of records)out.push(format(r),'');
    };
    add('私人书签',data.avenqir_v6_bookmarks,x=>'- **'+esc(x.name)+'** ('+esc(x.category)+')\n  - 网址：'+esc(x.url)+'\n  - 备注：'+esc(x.note));
    add('公开目录收藏',data['avenqir.link-atlas.favorites.v8'],x=>'- '+esc(x));
    add('首页工具收藏',data['avenqir.start.favorites.v1'],x=>'- '+esc(x));
    add('本地笔记',data.avenqir_v6_notes,x=>'### '+esc(x.title)+'\n\n'+esc(x.body));
    if(data.avenqir_v5_tasks)out.push('## 今日任务','',...data.avenqir_v5_tasks.items.map(x=>'- ['+(x.done?'x':' ')+'] '+esc(x.text)),'');
    const other=Object.keys(data).filter(k=>!['avenqir_v6_bookmarks','avenqir_v6_notes','avenqir.start.favorites.v1','avenqir.link-atlas.favorites.v8','avenqir_v5_tasks'].includes(k));
    if(other.length)out.push('## 其他已备份状态','',...other.map(k=>'- '+esc(k)+'：已保存（完整状态仅在 JSON 中）'),'');
    return out.join('\n');
  }
  function importInto(storage, data, keys, mode='replace') {
    // Read the original bytes first. On quota/write errors restore the original values.
    const {updates}=prepareImport(storage,data,keys,mode);
    const changed=Object.keys(updates);
    const prior = new Map();
    for (const key of changed) prior.set(key,storage.getItem(key));
    const done = [];
    try {
      for (const key of changed) {
        done.push(key); // Roll back even if a storage provider mutates then throws.
        storage.setItem(key,JSON.stringify(updates[key]));
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
  root.AVENQIR_TRANSFER = Object.freeze({FORMAT,GROUPS,KEYS,validate,makeExport,readArchive,selectedKeys,prepareImport,importInto,toMarkdown});
})(typeof window !== 'undefined' ? window : globalThis);
