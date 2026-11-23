"use strict";
/* Browser-only AVENQIR data mover. Nothing is uploaded or transmitted. */
(() => {
  const $ = id => document.getElementById(id);
  const API = window.AVENQIR_TRANSFER;
  if (!API) { $('transferStatus').textContent = '本地校验模块未加载，请刷新页面。'; return; }
  const categories = [
    ['bookmarks','书签与公开收藏','私人书签、公开目录的星标收藏'],
    ['notes','笔记','当前浏览器保存的全部随手笔记'],
    ['daily','日常 / 游戏','计时、三件小事、2048、翻牌与泡泡记录']
  ];
  const boxes = document.getElementById('transferCategories');
  for (const [id, title, description] of categories) {
    const label = document.createElement('label');
    label.className = 'transfer-choice';
    const box = document.createElement('input');
    box.type='checkbox';box.checked=true;box.value=id;box.dataset.group=id;
    const detail=document.createElement('span');
    const h=document.createElement('strong');h.textContent=title;
    const p=document.createElement('small');p.textContent=description;
    detail.append(h,p);label.append(box,detail);boxes.append(label);
  }
  const chosen = () => [...boxes.querySelectorAll('input:checked')].map(x=>x.value);
  const status = (message,isError=false) => {
    const s = $('transferStatus');s.textContent=message;s.classList.toggle('transfer-error',isError);
  };
  const preview = $('transferPreview'), restore = $('transferRestore'), input = $('transferInput');
  let loaded = null;
  function clearPreview() {
    loaded = null;restore.disabled=true;preview.replaceChildren();
  }
  function countFor(data, group) {
    const ks=API.GROUPS[group].keys.filter(k=>Object.prototype.hasOwnProperty.call(data,k));
    const main=group==='bookmarks'?'avenqir_v6_bookmarks':group==='notes'?'avenqir_v6_notes':null;
    if(group==='bookmarks'){
      const personal=Array.isArray(data.avenqir_v6_bookmarks)?data.avenqir_v6_bookmarks.length:0;
      const atlas=Array.isArray(data['avenqir.link-atlas.favorites.v8'])?data['avenqir.link-atlas.favorites.v8'].length:0;
      return ks.length?personal+' 条私人书签 / '+atlas+' 条公开收藏':'无记录';
    }
    if(main) return ks.length ? data[main].length+' 条' : '无记录';
    return ks.length+' 组记录';
  }
  function download(content,type,suffix){
    const blob=new Blob([content],{type});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='avenqir-device-'+new Date().toISOString().slice(0,10)+suffix;
    document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  const mode=$('transferMode'),modeHint=$('transferModeHint');
  mode?.addEventListener('change',()=>{
    if(modeHint)modeHint.textContent=mode.value==='merge'?
      '合并：书签按 ID / URL、笔记按 ID 去重；本机冲突记录优先；计时与游戏现有状态不覆盖，只补缺失项。':
      '覆盖：只替换文件中存在且本次勾选的项目，覆盖前请先导出当前设备的 JSON。';
  });
  $('transferExportMarkdown')?.addEventListener('click',()=>{
    if(!chosen().length){status('请至少选择一类导出内容。',true);return;}
    try{
      const pack=API.makeExport(localStorage,chosen());
      download(API.toMarkdown(pack.archive.data),'text/markdown;charset=utf-8','.md');
      status('已导出可读 Markdown（不可恢复）。'+(pack.skipped.length?' 跳过 '+pack.skipped.length+' 组无效数据。':''),!!pack.skipped.length);
    }catch(e){status('Markdown 导出失败：'+String(e.message||e).slice(0,130),true);}
  });
  $('transferExport').addEventListener('click',()=>{
    const groups=chosen();
    if(!groups.length){status('请至少选择一类数据。',true);return;}
    try {
      const pack=API.makeExport(localStorage,groups);
      download(JSON.stringify(pack.archive,null,2),'application/json;charset=utf-8','.json');
      const msg='已生成本地备份，共 '+Object.keys(pack.archive.data).length+' 组数据。';
      status(msg+(pack.skipped.length?' 另外跳过 '+pack.skipped.length+' 组格式无效的数据。':''),!!pack.skipped.length);
    } catch(e){status('导出失败：'+String(e.message||e).slice(0,130),true);}
  });
  input.addEventListener('change',async()=>{
    clearPreview();const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>4*1024*1024) throw Error('文件超过 4 MB');
      const obj=JSON.parse(await file.text());
      loaded=API.readArchive(obj);
      for(const [group,title] of categories){
        const count=countFor(loaded,group);
        const p=document.createElement('p');p.className='transfer-preview-row';
        const a=document.createElement('strong');a.textContent=title;
        const b=document.createElement('span');b.textContent=count;
        p.append(a,b);preview.append(p);
      }
      const small=document.createElement('p');small.className='hint';
      small.textContent='只处理文件中包含且勾选的数据；“合并”优先保留本机已存在的记录，“覆盖”按文件替换对应项目；两者都不删除备份里不存在的项目。';
      preview.append(small);
      restore.disabled=false;
      status('已完成文件格式检查。检查预览后，选择类别并点击恢复。');
    }catch(e){clearPreview();status('无法使用此备份：'+String(e.message||e).slice(0,130),true);}
    finally{input.value='';}
  });
  restore.addEventListener('click',()=>{
    if(!loaded){status('请先选择并检查备份文件。',true);return;}
    const groups=chosen(),keys=API.selectedKeys(loaded,groups);
    if(!keys.length){status('所选类别在文件中没有可恢复的数据。',true);return;}
    const summary=groups.map(g=>API.GROUPS[g]?.label).filter(Boolean).join('、');
    const action=mode?.value==='replace'?'replace':'merge';
    let preview;
    try{preview=API.prepareImport(localStorage,loaded,keys,action);}
    catch(e){status('恢复预检查失败：'+String(e.message||e).slice(0,150),true);return;}
    const label=action==='merge'?'合并（本机冲突数据优先保留）':'覆盖（文件中对应类别的本机数据将被替换）';
    if(!confirm('准备 '+label+'：'+summary+'。预计写入 '+preview.counts.written+' 组，原样保留 '+preview.counts.unchanged+' 组。请确保其他标签页的数据已保存。确定吗？'))return;
    try{
      const n=API.importInto(localStorage,loaded,keys,action);
      status('已按“'+(action==='merge'?'合并':'覆盖')+'”模式恢复 '+n+' 组数据；未修改 '+preview.counts.unchanged+' 组本机数据。请关闭其他 AVENQIR 标签页，然后刷新对应页面。');
      clearPreview();
    }catch(e){status('恢复失败：'+String(e.message||e).slice(0,150),true);}
  });
  $('transferClear').addEventListener('click',()=>{
    clearPreview();input.value='';status('已清除文件预览，没有修改浏览器存储。');
  });
  status('可以先导出，再到另一台设备导入。无需账号或网络上传。');
})();