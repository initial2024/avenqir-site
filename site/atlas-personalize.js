"use strict";
/* AVENQIR local recommendations: explicit opt-in only, category aggregates, no network. */
(function(root){
 const KEY='avenqir.atlas.local-recommend.v1', DAY=86400000, TTL=60, MAX=30;
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const category=x=>typeof x==='string'&&x.trim().length>0&&x.length<=32&&!/[\x00-\x1f<>\\/:?#@.]/.test(x)&&!['__proto__','constructor','prototype'].includes(x)?x.trim():null;
 const today=(now=Date.now())=>Math.floor(now/DAY);
 const blank=()=>({v:1,enabled:false,interests:[],activity:{}});
 function clean(raw,now=today()){
   const s=blank();
   if(!raw||raw.v!==1||raw.enabled!==true||!Array.isArray(raw.interests)||typeof raw.activity!=='object'||raw.activity===null||Array.isArray(raw.activity))return s;
   s.enabled=true;
   for(const x of raw.interests.slice(0,12)){const c=category(x);if(c&&!s.interests.includes(c))s.interests.push(c);}
   let i=0;
   for(const [key,value] of Object.entries(raw.activity)){
     if(i>=MAX)break;
     const c=category(key),v=value;
     if(!c||!v||!Number.isInteger(v.day)||v.day>now+1||v.day<now-TTL||!Number.isInteger(v.opens)||!Number.isInteger(v.saves)||v.opens<0||v.opens>100||v.saves<0||v.saves>100)continue;
     Object.defineProperty(s.activity,c,{value:{opens:v.opens,saves:v.saves,day:v.day},enumerable:true,writable:true,configurable:true});i++;
   }
   return s;
 }
 function create(storage,clock=Date.now){
   const current=()=>today(clock());
   function read(){
     if(!storage)return blank();
     try{
       const raw=storage.getItem(KEY);
       if(!raw)return blank();
       const state=clean(JSON.parse(raw),current());
       // Expired category aggregates are physically removed on the next local visit.
       if(state.enabled&&JSON.stringify(state)!==raw){
         try{storage.setItem(KEY,JSON.stringify(state));}catch{}
       }
       return state;
     }catch{return blank();}
   }
   function save(state){
     if(!storage)return false;
     try{storage.setItem(KEY,JSON.stringify(clean(state,current())));return true;}catch{return false;}
   }
   function setEnabled(enabled){
     if(!enabled){try{storage?.removeItem(KEY);}catch{}return false;}
     const existing=read();
     existing.enabled=true;
     return save(existing);
   }
   function setInterest(value,enabled){
     const c=category(value),s=read();if(!s.enabled||!c)return false;
     s.interests=s.interests.filter(x=>x!==c);
     if(enabled&&s.interests.length<12)s.interests.push(c);
     return save(s);
   }
   function record(value,action='open'){
     const c=category(value),s=read();if(!s.enabled||!c||!['open','save'].includes(action))return false;
     const day=current();let old=own(s.activity,c)?s.activity[c]:null;
     if(!old||day-old.day>TTL)old={opens:0,saves:0,day};
     const counts={opens:old.opens,saves:old.saves,day};
     if(action==='open')counts.opens=Math.min(100,counts.opens+1);
     else counts.saves=Math.min(100,counts.saves+1);
     if(!own(s.activity,c)&&Object.keys(s.activity).length>=MAX){
       const oldest=Object.entries(s.activity).sort((a,b)=>a[1].day-b[1].day)[0]?.[0];
       if(oldest)delete s.activity[oldest];
     }
     Object.defineProperty(s.activity,c,{value:counts,enumerable:true,writable:true,configurable:true});
     return save(s);
   }
   function recommend(items,excluded=[],limit=6,policy={}){
     limit=Number.isFinite(limit)?Math.max(0,Math.min(10,Math.floor(limit))):6;if(!limit)return [];
     const allowed=typeof policy.allowed==='function'?policy.allowed:()=>true;
     const priority=typeof policy.priority==='function'?policy.priority:()=>0;
     const s=read();if(!s.enabled||!Array.isArray(items))return [];
     const favs=new Set(excluded);const day=current(),weights=Object.create(null),reasons=Object.create(null);
     for(const c of s.interests){weights[c]=5;reasons[c]='你主动选择了「'+c+'」兴趣';}
     for(const [c,a] of Object.entries(s.activity)){
       const days=Math.max(0,day-a.day);
       const value=(a.opens+2*a.saves)*Math.pow(0.5,days/20);
       if(value<=0.15)continue;
       weights[c]=(weights[c]||0)+Math.min(8,2*Math.log2(1+value));
       if(!own(reasons,c))reasons[c]='来自本机「'+c+'」分类的打开或收藏记录';
     }
     if(Object.keys(weights).length===0)return [];
     // Stable daily ordering avoids a static ranking while preserving category diversity.
     function hash(str){let n=2166136261;for(let i=0;i<str.length;i++){n^=str.charCodeAt(i);n=Math.imul(n,16777619);}return(n>>>0)/4294967296;}
     const seen=new Set(),candidates=[];
     for(const x of items){
       if(!x||!category(x.category)||typeof x.url!=='string'||favs.has(x.url)||seen.has(x.url)||!own(weights,x.category))continue;
       let host,bonus=0;try{const u=new URL(x.url);if(u.protocol!=='https:'||u.username||u.password||!allowed(x))continue;host=u.hostname;const p=Number(priority(x));if(Number.isFinite(p))bonus=Math.max(0,Math.min(.35,p));}catch{continue;}
       seen.add(x.url);
       candidates.push({item:x,host,reason:reasons[x.category]||'本地兴趣相关',score:weights[x.category]+bonus+hash(x.url+'|'+day)*0.42});
     }
     candidates.sort((a,b)=>b.score-a.score||a.item.url.localeCompare(b.item.url));
     const chosen=[],used=Object.create(null),hosts=new Map(),chosenURLs=new Set();
     for(let pass=1;pass<=Math.max(1,Math.min(limit,10));pass++){
       for(const x of candidates){
         if(chosen.length>=limit)break;
         const c=x.item.category;
         if((used[c]||0)>=pass||(hosts.get(x.host)||0)>=pass||chosenURLs.has(x.item.url))continue;
         chosen.push(x);chosenURLs.add(x.item.url);hosts.set(x.host,(hosts.get(x.host)||0)+1);used[c]=(used[c]||0)+1;
       }
       if(chosen.length>=limit)break;
     }
     return chosen;
   }
   return Object.freeze({read,setEnabled,setInterest,record,recommend});
 }
 const api=Object.freeze({KEY,create,clean,category,TTL});
 root.AVENQIR_LOCAL_RECOMMEND=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
