'use strict';
document.querySelectorAll('form[data-confirm-delete]').forEach(form=>{form.addEventListener('submit',event=>{if(!confirm('确定永久删除这条留言吗？此操作不可恢复。'))event.preventDefault();});});
