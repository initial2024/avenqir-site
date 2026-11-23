"use strict";
/* Opt-in local contact preference; never retain feedback bodies, queries, tokens or consent. */
(() => {
 const form=document.querySelector('form.fb-form');if(!form)return;
 const name=form.querySelector('input[name="name"]');
 const email=form.querySelector('input[name="email"]');
 if(!name||!email)return;
 const KEY='avenqir.feedback.contact.v1';
 const wrap=document.createElement('div');wrap.className='fb-local-preferences';
 const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';
 check.id='fbRememberContact';
 const labelText=document.createElement('span');labelText.textContent='在此浏览器记住昵称和选填邮箱（下次自动填写）';
 label.append(check,labelText);
 const clear=document.createElement('button');clear.type='button';clear.textContent='清除本机记忆';
 const status=document.createElement('small');status.className='fb-local-status';status.setAttribute('role','status');
 wrap.append(label,clear,status);
 const row=form.querySelector('.fb-pair');if(row)row.insertAdjacentElement('afterend',wrap);else form.prepend(wrap);
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
 if(saved&&saved.version===1&&typeof saved.name==='string'&&typeof saved.email==='string'){
   if(!name.value)name.value=saved.name.slice(0,60);
   if(!email.value)email.value=saved.email.slice(0,190);
   check.checked=true;
   status.textContent='已从本机恢复联系信息；留言正文不会保存。';
 }else status.textContent='默认不记忆；可自行选择。';
 clear.addEventListener('click',()=>{
   try{localStorage.removeItem(KEY);}catch{}
   check.checked=false;status.textContent='已清除本机保存的联系信息。';
 });
 form.addEventListener('submit',()=>{
   if(!check.checked)return;
   const entry={version:1,name:name.value.trim().slice(0,60),email:email.value.trim().slice(0,190)};
   if(entry.name.length<2)return;
   try{localStorage.setItem(KEY,JSON.stringify(entry));}catch{status.textContent='浏览器不允许保存偏好，表单仍可提交。';}
 });
})();
