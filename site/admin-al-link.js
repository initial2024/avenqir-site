"use strict";
/* Private AL shortcut. Runs only inside authenticated admin.php.
 * The address is a local bookmark, not a proxy or proof of Access auth.
 * Never submits, reads credentials, captures session cookies, or contacts
 * an origin. Access itself independently enforces authentication and MFA.
 */
(function(root){
  const key="avenqir.remote-access-url.v1";
  const direct=root.document.getElementById("adminAlDirect");
  const notice=root.document.getElementById("adminAlState");
  if(!direct || !notice)return;
  let saved="";
  try{saved=root.localStorage.getItem(key)||"";}catch(_){}
  if(!saved)return;
  try{
    const url=new URL(saved);
    const host=url.hostname;
    if(url.protocol!=="https:" || url.username || url.password ||
       (url.port && url.port!=="443") || url.pathname!=="/" ||
       url.search || url.hash || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ||
       /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
       host.endsWith(".local")||host.endsWith(".internal"))return;
    direct.href=url.origin+"/";
    notice.textContent="已读取此浏览器本地保存的 AL 入口。仍需先通过 Cloudflare Access 身份认证和 VNC 密码验证。";
  }catch(_){}
})(window);
