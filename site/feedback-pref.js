"use strict";
/* Opt-in local contact preference; never retain feedback bodies, queries, tokens or consent. */
(() => {
 const form=document.querySelector('form.fb-form');if(!form)return;
 const name=form.querySelector('input[name="name"]');
 const email=form.querySelector('input[name="email"]');
 if(!name||!email)return;
 // Transfer one intentional recommendation locally; no query in the URL.
 try{const q=sessionStorage.getItem('avenqir.feedback.query.once.v1');sessionStorage.removeItem('avenqir.feedback.query.once.v1');if(q&&form.querySelector('select[name="kind"]').value==='link'){const subject=form.querySelector('[name="subject"]'),body=form.querySelector('[name="body"]');if(!subject.value)subject.value='申请补充收录：'+q.slice(0,80);if(!body.value)body.value='在公开网址目录中未找到「'+q.slice(0,80)+'」相关资源。希望站长审核并补充优质网站。';}}catch{}
 const KEY='avenqir.feedback.contact.v1';
 const wrap=document.createElement('div');wrap.className='fb-local-preferences';
 const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';
 check.id='fbRememberContact';
 const labelText=document.createElement('span');labelText.textContent='在此浏览器记住昵称和选填邮箱（下次自动填写）';
 label.append(check,labelText);
 const save=document.createElement('button');save.type='button';save.textContent='保存本机联系信息';
 const clear=document.createElement('button');clear.type='button';clear.textContent='清除本机记忆';
 const status=document.createElement('small');status.className='fb-local-status';status.setAttribute('role','status');
 wrap.append(label,save,clear,status);
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
 check.addEventListener('change',()=>{if(!check.checked){try{localStorage.removeItem(KEY);status.textContent='已关闭联系信息记忆。';}catch{status.textContent='无法清除本机记忆，请检查浏览器设置。';}}});
 function saveContact(){
   if(!check.checked){status.textContent='请先选择记住联系信息。';return;}
   const entry={version:1,name:name.value.trim().slice(0,60),email:email.value.trim().slice(0,190)};
   if(entry.name.length<2||!email.validity.valid){status.textContent='请填写有效昵称及选填邮箱。';return;}
   try{localStorage.setItem(KEY,JSON.stringify(entry));status.textContent='已保存本机联系信息，下次自动填写。不会保存留言内容。';}catch{status.textContent='浏览器不允许保存偏好，表单仍可提交。';}
 }
 save.addEventListener('click',saveContact);
 form.addEventListener('submit',()=>{if(check.checked)saveContact();});
})();
