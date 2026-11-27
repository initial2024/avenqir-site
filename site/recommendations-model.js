"use strict";
(function(root){
  const KEY='avenqir.recommendations.local.v1';
  const DAY=86400000;
  const PAUSE=300000;
  const MAX_CLICKS=3000;
  const idValid=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,40}$/.test(id);
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const stamp=value=>Number.isSafeInteger(value)&&value>0;
  const stars=value=>Number.isInteger(value)&&value>=1&&value<=5;
  const empty=()=>({version:1,clicks:[],ratings:Object.create(null)});
  function valid(value){
    return object(value)&&value.version===1&&Array.isArray(value.clicks)&&value.clicks.length<=MAX_CLICKS&&
      value.clicks.every(row=>object(row)&&idValid(row.toolId)&&stamp(row.ts))&&object(value.ratings)&&
      Object.keys(value.ratings).length<=2000&&Object.entries(value.ratings).every(([id,row])=>
        idValid(id)&&object(row)&&stars(row.stars)&&stamp(row.updatedAt));
  }
  function normalize(clicks,ratings,now){
    const last=new Map();
    const accepted=[];
    for(const {toolId,ts} of clicks.filter(x=>x.ts<=now&&x.ts>now-90*DAY).sort((a,b)=>a.ts-b.ts)){
      if(ts-(last.get(toolId)??-Infinity)<PAUSE)continue;
      accepted.push({toolId,ts});
      last.set(toolId,ts);
    }
    const active=Object.create(null);
    for(const [id,row] of Object.entries(ratings))if(row.updatedAt<=now)active[id]={stars:row.stars,updatedAt:row.updatedAt};
    return {version:1,clicks:accepted.slice(-MAX_CLICKS),ratings:active};
  }
  function clean(value,now=Date.now()){
    return valid(value)?normalize(value.clicks,value.ratings,now):empty();
  }
  function merge(local,incoming,now=Date.now()){
    const ratings=Object.assign(Object.create(null),local.ratings);
    for(const [id,value] of Object.entries(incoming.ratings)){
      if(!Object.hasOwn(ratings,id)||ratings[id].updatedAt<value.updatedAt)ratings[id]=value;
    }
    return normalize([...local.clicks,...incoming.clicks],ratings,now);
  }
  function score(value,days,now=Date.now()){
    const heat=Object.create(null);
    const counts=Object.create(null);
    for(const {toolId,ts} of value.clicks){
      const age=(now-ts)/DAY;
      if(age>=days)continue;
      heat[toolId]=(heat[toolId]||0)+Math.exp(-age/days);
      counts[toolId]=(counts[toolId]||0)+1;
    }
    const most=Math.max(0,...Object.values(heat));
    const ids=new Set([...Object.keys(heat),...Object.keys(value.ratings)]);
    return Object.fromEntries([...ids].map(id=>{
      const rating=value.ratings[id]?.stars;
      const activity=most?((heat[id]||0)/most):0;
      return [id,{clicks:counts[id]||0,score:Math.round(100*(.7*(rating||0)/5+.3*activity))}];
    }));
  }
  function publicAverage(metric){return Number.isInteger(metric?.count)&&metric.count>=5&&Number.isFinite(metric.average)&&metric.average>=1&&metric.average<=5?metric.average:0;}
  function displayScore(metric,isLocal){return (isLocal||publicAverage(metric)>0)&&Number.isInteger(metric?.score)&&metric.score>=0&&metric.score<=100?metric.score:null;}
  function returnPrompt(record,now=Date.now()){return object(record)&&idValid(record.id)&&stamp(record.at)&&record.departed===true&&now-record.at>=8000&&now-record.at<=1800000;}
  const api=Object.freeze({KEY,DAY,valid,empty,clean,merge,score,publicAverage,displayScore,returnPrompt});
  root.AVENQIR_RECOMMENDATIONS=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
