'use strict';
/* AVENQIR v5: games run entirely in the visitor's browser. */
(()=>{
const $=id=>document.getElementById(id);
const K={game:'avenqir_v5_2048',best:'avenqir_v5_2048best',memoryBest:'avenqir_v5_memorybest',pop:'avenqir_v5_pop'};
const load=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x===null?fallback:x}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const icons=['🌙','⭐','🍀','🍋','🎈','🧩','🌷','🐱'];

// 2048. One transaction per valid move. Two fresh tiles for new games.
let g={board:Array(16).fill(0),score:0,prev:null,won:false},best=Number(load(K.best,0))||0;
function validGame(x){return x&&Array.isArray(x.board)&&x.board.length===16&&x.board.every(n=>Number.isInteger(n)&&n>=0&&(n===0||(n<=131072&&(n&(n-1))===0)))&&Number.isFinite(x.score)&&x.score>=0}
function saveGame(){save(K.game,{board:g.board,score:g.score,prev:g.prev,won:g.won});save(K.best,best)}
function addTile(b){const free=[];b.forEach((v,i)=>{if(!v)free.push(i)});if(!free.length)return;const i=free[Math.floor(Math.random()*free.length)];b[i]=Math.random()<.9?2:4}
function message2048(text){$('msg2048').textContent=text}
function gameOver(b){if(b.includes(0))return false;for(let r=0;r<4;r++)for(let c=0;c<4;c++){const k=r*4+c;if(c<3&&b[k]===b[k+1])return false;if(r<3&&b[k]===b[k+4])return false}return true}
function draw2048(){const el=$('board2048');el.replaceChildren();g.board.forEach(v=>{const cell=document.createElement('div');cell.className='game-cell'+(v?' filled v'+Math.min(v,2048):'');cell.textContent=v||'';cell.setAttribute('aria-label',v?String(v):'空');el.append(cell)});$('score2048').textContent=String(g.score);$('best2048').textContent=String(best);$('undo2048').disabled=!g.prev}
function reset2048(){g={board:Array(16).fill(0),score:0,prev:null,won:false};addTile(g.board);addTile(g.board);saveGame();draw2048();message2048('新的一局，向任意方向滑动。')}
function move2048(dir){const b=g.board.slice(),oldScore=g.score;let gained=0;for(let n=0;n<4;n++){let ix=[];for(let j=0;j<4;j++){if(dir==='left')ix.push(n*4+j);else if(dir==='right')ix.push(n*4+3-j);else if(dir==='up')ix.push(j*4+n);else ix.push((3-j)*4+n)}const vals=ix.map(i=>b[i]).filter(Boolean),merged=[];for(let k=0;k<vals.length;k++){if(vals[k]===vals[k+1]){merged.push(vals[k]*2);gained+=vals[k]*2;k++}else merged.push(vals[k])}ix.forEach((index,k)=>{b[index]=merged[k]||0})}
if(b.every((v,i)=>v===g.board[i]))return;
g.prev={board:g.board.slice(),score:oldScore};g.board=b;g.score+=gained;addTile(g.board);best=Math.max(best,g.score);const justWon=!g.won&&g.board.some(v=>v>=2048);g.won=g.won||justWon;saveGame();draw2048();message2048(justWon?'🎉 已达到 2048！可以继续挑战更高分。':gameOver(g.board)?'棋盘已满且无法合并，点击重新开始。':gained?'合并成功 +'+gained:'继续加油。')}
let existing=load(K.game,null);if(validGame(existing)){g={board:existing.board.slice(),score:existing.score,prev:validGame(existing.prev)?{board:existing.prev.board.slice(),score:existing.prev.score}:null,won:!!existing.won};draw2048()}else reset2048();
$('new2048').addEventListener('click',()=>{if(g.score>0&&!confirm('确定放弃当前棋局，重新开始吗？'))return;reset2048()});
$('undo2048').addEventListener('click',()=>{if(!g.prev)return;g.board=g.prev.board;g.score=g.prev.score;g.prev=null;saveGame();draw2048();message2048('已撤销上一步。')});
const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
document.addEventListener('keydown',e=>{if(!keyMap[e.key]||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;const focused=document.activeElement;if(focused?.isContentEditable)return;e.preventDefault();move2048(keyMap[e.key])});
let x0=0,y0=0;
$('board2048').addEventListener('touchstart',e=>{if(e.touches.length!==1)return;x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
$('board2048').addEventListener('touchend',e=>{if(e.changedTouches.length!==1)return;const dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;if(Math.max(Math.abs(dx),Math.abs(dy))<23)return;move2048(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up')},{passive:true});

// Memory pairs.
let memory=[],shown=[],pairs=0,moves=0,lock=false,hideHandle=null;
const bestMemory=()=>{const v=Number(load(K.memoryBest,0));return v>0?v:null};
function renderMemory(){const root=$('memoryGrid');root.replaceChildren();memory.forEach((item,i)=>{const btn=document.createElement('button');const shownNow=item.matched||shown.includes(i);btn.type='button';btn.className='memory-card'+(shownNow?' flipped':'')+(item.matched?' matched':'');btn.textContent=shownNow?item.icon:'?';btn.setAttribute('aria-label',shownNow?item.icon:'隐藏卡片');btn.disabled=item.matched||shown.includes(i)||lock;btn.addEventListener('click',()=>reveal(i));root.append(btn)});$('memoryMoves').textContent=String(moves);$('memoryPairs').textContent=pairs+'/8';$('memoryBest').textContent=bestMemory()??'—'}
function resetMemory(){if(hideHandle)clearTimeout(hideHandle);memory=shuffle(icons.concat(icons).map((icon,id)=>({icon,id,matched:false})));shown=[];pairs=0;moves=0;lock=false;renderMemory();$('memoryStatus').textContent='点开两张卡片，找出相同图案。'}
function reveal(i){if(lock||shown.includes(i)||memory[i]?.matched)return;shown.push(i);if(shown.length===2){moves++;const [a,b]=shown;if(memory[a].icon===memory[b].icon){memory[a].matched=memory[b].matched=true;pairs++;shown=[];if(pairs===8){const prev=bestMemory();if(!prev||moves<prev)save(K.memoryBest,moves);$('memoryStatus').textContent=`🎉 完成！共 ${moves} 回合。`}else $('memoryStatus').textContent='配对成功！'}else{lock=true;$('memoryStatus').textContent='不是一对，再试试。';hideHandle=setTimeout(()=>{shown=[];lock=false;renderMemory()},780)}}renderMemory()}
$('resetMemory').addEventListener('click',resetMemory);resetMemory();

// Pop It. No metrics leave the device.
let popCount=Number(load(K.pop,0))||0;
function createPops(randomize=false){const root=$('popBoard');root.replaceChildren();let pal=['#65cbfd','#8ba8ff','#a289fc','#e4a5d0','#69dcbf'];if(randomize)pal=shuffle(pal);for(let i=0;i<30;i++){const b=document.createElement('button');b.type='button';b.className='pop-bubble';b.style.setProperty('--popcolor',pal[Math.floor(i/6)%pal.length]);b.setAttribute('aria-label','按压泡泡 '+(i+1));b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{b.classList.toggle('popped');const pushed=b.classList.contains('popped');b.setAttribute('aria-pressed',pushed?'true':'false');popCount++;save(K.pop,popCount);$('popStatus').textContent='累计按压 '+popCount+' 次 · 想按多少次都可以。'});root.append(b)}$('popStatus').textContent='累计按压 '+popCount+' 次 · 想按多少次都可以。'}
$('popReset').addEventListener('click',()=>{document.querySelectorAll('.pop-bubble').forEach(b=>{b.classList.remove('popped');b.setAttribute('aria-pressed','false')})});$('popMix').addEventListener('click',()=>createPops(true));createPops();

// Gentle 60s visual breathing rhythm. Auto-pause on tab hiding.
let breathElapsed=0,breathStartTime=0,breathTimer=null;
function drawBreath(){const elapsed=breathElapsed+(breathTimer?performance.now()-breathStartTime:0);const secs=Math.max(0,Math.min(60,elapsed/1000)),phase=secs%8,inhale=phase<4;const progress=inhale?phase/4:1-(phase-4)/4;$('breathOrb').style.setProperty('--breath-scale',(0.76+progress*.24).toFixed(3));$('breathPhase').textContent=inhale?'舒缓扩张':'轻轻收缩';$('breathCount').textContent=Math.max(0,Math.ceil(60-secs))+' 秒';$('breathBadge').textContent=breathTimer?'进行中':'暂停';if(secs>=60){stopBreath(true);return}}
function startBreath(){if(breathTimer)return;if(breathElapsed>=60000)breathElapsed=0;breathStartTime=performance.now();breathTimer=setInterval(drawBreath,80);$('breathStatus').textContent='正在播放舒缓节奏，切换到后台会自动暂停。';$('breathStart').textContent='继续中';drawBreath()}
function stopBreath(done=false){if(breathTimer){breathElapsed+=performance.now()-breathStartTime;clearInterval(breathTimer);breathTimer=null}if(done)breathElapsed=60000;$('breathStart').textContent=done?'再来一分钟':'继续';$('breathBadge').textContent=done?'已完成':'已暂停';$('breathStatus').textContent=done?'一分钟结束，可以继续休息。':'已暂停，不会在后台持续运行。';if(done){$('breathPhase').textContent='已完成';$('breathCount').textContent='0 秒'}else drawBreath()}
$('breathStart').addEventListener('click',()=>{if(breathTimer){stopBreath();return}startBreath()});$('breathStop').addEventListener('click',()=>{stopBreath();breathElapsed=0;$('breathPhase').textContent='准备好';$('breathCount').textContent='—';$('breathOrb').style.setProperty('--breath-scale','0.76');$('breathStart').textContent='开始一分钟';$('breathBadge').textContent='未启动'});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&breathTimer)stopBreath()});

// Finger doodles; all rendering and downloads happen locally.
const canvas=$('drawCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:false});
if(ctx){let drawing=false,erasing=false,last=null;
const coord=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
const line=(a,b)=>{ctx.strokeStyle=erasing?'#101e30':$('drawColor').value;ctx.lineWidth=Number($('drawSize').value)*canvas.width/900;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()};
canvas.addEventListener('pointerdown',e=>{drawing=true;last=coord(e);canvas.setPointerCapture(e.pointerId);line(last,last)});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const now=coord(e);line(last,now);last=now});
const end=()=>{drawing=false;last=null};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
$('drawEraser').addEventListener('click',()=>{erasing=!erasing;$('drawEraser').textContent=erasing?'恢复画笔':'橡皮擦';$('drawStatus').textContent=erasing?'橡皮擦模式（使用背景色覆盖绘制）。':'画笔模式。'});
$('drawClear').addEventListener('click',()=>{ctx.clearRect(0,0,canvas.width,canvas.height);$('drawStatus').textContent='画布已清空。'});
$('drawDownload').addEventListener('click',()=>{try{const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d');c.fillStyle='#101e30';c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);out.toBlob(blob=>{if(!blob){$('drawStatus').textContent='导出失败。';return}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='avenqir-doodle.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);$('drawStatus').textContent='已生成 PNG，请检查浏览器下载记录。'},'image/png')}catch(e){$('drawStatus').textContent='导出失败：'+String(e.message||e)}});
}
})();
