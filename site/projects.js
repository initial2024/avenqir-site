'use strict';
(() => {
const $=id=>document.getElementById(id);
const root=$('repos'); if(!root)return;
const owner=root.dataset.scope==='owner';
const repoKey='avenqir_projects_local_v5',cacheKey='avenqir_projects_cache_v5';
const oldRepoKey='avenqir_v4_repos',oldCacheKey='avenqir_v4_ghcache';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const safeRepo=s=>typeof s==='string'&&/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/.test(s)&&!s.includes('..')&&!s.endsWith('/.');
function clean(list){return Array.isArray(list)?[...new Map(list.filter(safeRepo).map(s=>[s.toLowerCase(),s])).values()].slice(0,12):[]}
let repos=owner?clean(Array.from(root.querySelectorAll('[data-repo]')).map(x=>x.dataset.repo)):clean(read(repoKey,[]));
let cache=Object.create(null);
if(!owner){const raw=read(cacheKey,{});if(raw&&typeof raw==='object')for(const r of repos)if(Object.hasOwn(raw,r))cache[r]=raw[r]}
let refreshing=false,epoch=0;
function persist(){if(owner)return;try{localStorage.setItem(repoKey,JSON.stringify(repos));localStorage.setItem(cacheKey,JSON.stringify(cache))}catch{}}
function write(msg){$('ghStatus').textContent=msg}
function link(label,url){const a=document.createElement('a');a.className='smalllink';a.target='_blank';a.rel='noopener noreferrer';a.href=url;a.textContent=label;return a}
function releaseLink(url,repo){if(typeof url!=='string')return false;try{const u=new URL(url);return u.origin==='https://github.com'&&!u.username&&!u.password&&u.pathname.toLowerCase().startsWith('/'+repo.toLowerCase()+'/releases/')}catch{return false}}
function draw(){
 for(const repo of repos){
  const row=owner?Array.from(root.querySelectorAll('[data-repo]')).find(x=>x.dataset.repo===repo):document.createElement('div');
  if(!row)continue;
  let body=owner?row.querySelector('[data-release-result]'):row;
  if(!body)continue;
  if(!owner){row.className='record';row.dataset.repo=repo;const top=document.createElement('div');top.className='flexend';const h=document.createElement('h3');h.textContent=repo;const rem=document.createElement('button');rem.className='btn mini-btn ghost';rem.textContent='移除';rem.disabled=refreshing;rem.addEventListener('click',()=>{repos=repos.filter(x=>x!==repo);delete cache[repo];persist();render()});top.append(h,rem);row.append(top);body=document.createElement('div');row.append(body)}
  else body.replaceChildren();
  const val=cache[repo];const p=document.createElement('p');p.textContent=!val?'尚未查询':val.error?'查询失败：'+val.error:val.none?'仓库目前没有公开 Release。':'上次查询：'+new Date(val.at).toLocaleString();body.append(p);
  if(val&&!val.error&&!val.none&&val.release){const r=val.release;const line=document.createElement('p');line.textContent='Release：'+(r.name||r.tag_name||'未命名')+' · '+(r.prerelease?'预发布':'正式发布')+' · '+(r.published_at?r.published_at.slice(0,10):'无发布日期');body.append(line);const urls=document.createElement('div');urls.className='chiplist';if(releaseLink(r.html_url,repo))urls.append(link('打开 Release ↗',r.html_url));if(Array.isArray(r.assets))r.assets.filter(a=>releaseLink(a.browser_download_url,repo)&&/\.(apk|zip)$/i.test(a.name||'')).slice(0,8).forEach(a=>urls.append(link(a.name+' ↗',a.browser_download_url)));body.append(urls)}
  else body.append(link('打开 GitHub 仓库 ↗','https://github.com/'+repo));
  if(!owner)root.append(row);
 }
}
function render(){if(!owner){root.replaceChildren();if(!repos.length){const p=document.createElement('p');p.textContent='还没有本地项目。请输入 owner/repo 后添加。';root.append(p)}}draw()}
function cleanupLegacy(){try{localStorage.removeItem(oldRepoKey);localStorage.removeItem(oldCacheKey)}catch{}$('legacyPanel').hidden=true}
if(!owner){
 const legacy=clean(read(oldRepoKey,[]));
 if(legacy.length){$('legacyPanel').hidden=false;for(const repo of legacy){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=repo;label.append(input,document.createTextNode(' '+repo));$('legacyRepos').append(label)}}
 $('importRepos')?.addEventListener('click',()=>{repos=clean([...repos,...Array.from($('legacyRepos').querySelectorAll('input:checked')).map(x=>x.value)]);cleanupLegacy();persist();render();write('已导入选中的旧记录。')});
 $('discardLegacy')?.addEventListener('click',()=>{cleanupLegacy();write('已丢弃旧版项目和缓存。')});
 $('eraseRepos')?.addEventListener('click',()=>{if(!confirm('清除当前浏览器的全部项目和发布缓存？'))return;epoch++;repos=[];cache=Object.create(null);try{localStorage.removeItem(repoKey);localStorage.removeItem(cacheKey)}catch{}cleanupLegacy();render();write('已清除本地项目。管理员账号数据不受影响。')});
 function add(){if(refreshing)return;const s=$('repoInput').value.trim();if(!safeRepo(s)){write('格式错误，应为 GitHub owner/repo。');return}if(repos.some(x=>x.toLowerCase()===s.toLowerCase())){write('项目已存在。');return}if(repos.length>=12){write('最多跟踪 12 个仓库。');return}repos.push(s);persist();$('repoInput').value='';render();write('已保存到当前浏览器。')}
 $('addRepo').addEventListener('click',add);
 $('repoInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add()}});
}
$('refreshRepos').addEventListener('click',async()=>{
 if(refreshing||!repos.length){if(!repos.length)write('请先添加项目。');return}
 refreshing=true;const generation=epoch,b=$('refreshRepos');b.disabled=true;$('ghBadge').textContent='正在查询';render();let count=0,errors=0;
 for(const repo of repos.slice()){
  if(generation!==epoch)break;
  try{
   const old=cache[repo];if(old&&Date.now()-old.at<600000&&!old.error){count++;continue}
   const response=await fetch('https://api.github.com/repos/'+repo+'/releases?per_page=1',{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout?AbortSignal.timeout(12000):undefined});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();if(!Array.isArray(data))throw Error('响应格式错误');
   if(generation!==epoch)break;
   const r=data[0];cache[repo]={at:Date.now(),none:!r,release:r?{name:r.name,tag_name:r.tag_name,prerelease:r.prerelease,published_at:r.published_at,html_url:r.html_url,assets:Array.isArray(r.assets)?r.assets.slice(0,100).map(a=>({name:a.name,browser_download_url:a.browser_download_url})):[]}:null};count++;
  }catch(e){if(generation!==epoch)break;cache[repo]={at:Date.now(),error:String(e.message).slice(0,120)};errors++}
  render();
 }
 refreshing=false;b.disabled=false;if(generation!==epoch){$('ghBadge').textContent='已清除';render();return}
 persist();render();$('ghBadge').textContent=errors?'部分失败':'完成';write('完成 '+count+' 个仓库，失败 '+errors+' 个。'+(owner?'结果仅保留在本次页面内存。':'10 分钟内复用本地缓存。'))
});
render();
})();
