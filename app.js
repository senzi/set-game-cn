const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={mode:'set',hard:false,colorblind:localStorage.getItem('set-colorblind')==='1',deck:[],cards:[],selected:[],hinted:[],hints:0,found:{set:0,planet:0,comet:0},time:0,timer:null,locked:false,streak:0,practiceAnswer:false,practiceReady:false,practiceTime:0,practiceTimer:null,practiceGeneration:0,confirmAction:null,lastResult:null};
const colors={normal:['#d94b42','#3f9461','#7655b5'],accessible:['#d94b42','#d49e25','#287db5']};
const keysSet=['1','2','3','Q','W','E','A','S','D','Z','X','C'];
const keysPlanet=['Q','W','E','A','S','D','Z','X','C'];
const svgCache=new Map();let svgSerial=0;

function allCards(){const a=[];for(let n=0;n<3;n++)for(let c=0;c<3;c++)for(let s=0;s<3;s++)for(let f=0;f<3;f++)a.push(`${n}${c}${s}${f}`);return a}
function shuffle(a){for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function add(a,b){return a.split('').map((v,i)=>(+v + +b[i])%3).join('')}
function completion(a,b){return a.split('').map((v,i)=>(3-(+v + +b[i])%3)%3).join('')}
function subtract(a,b){return a.split('').map((v,i)=>(+v- +b[i]+3)%3).join('')}
function isSet(a,b,c){return add(add(a,b),c)==='0000'}
function isPlanetCodes(a,b,c,d){return add(a,b)===add(c,d)||add(a,c)===add(b,d)||add(a,d)===add(b,c)}
function isComet(cards){return cards.length===9&&cards.reduce(add,'0000')==='0000'}
function findSet(cards){for(let i=0;i<cards.length-2;i++)for(let j=i+1;j<cards.length-1;j++)for(let k=j+1;k<cards.length;k++)if(isSet(cards[i],cards[j],cards[k]))return[i,j,k];return null}
function findPlanet(cards){for(let a=0;a<cards.length-3;a++)for(let b=a+1;b<cards.length-2;b++)for(let c=b+1;c<cards.length-1;c++)for(let d=c+1;d<cards.length;d++)if(isPlanetCodes(cards[a],cards[b],cards[c],cards[d]))return[a,b,c,d];return null}
function findSolution(){return findSet(state.cards)||findPlanet(state.cards)||(isComet(state.cards)?[0,1,2,3,4,5,6,7,8]:null)}

function cardSVG(code,uid='c',accessible=state.colorblind){
  const cacheKey=`${accessible?'a':'n'}-${code}`;let template=svgCache.get(cacheKey);
  if(template)return template.replaceAll('__PATTERN__',`p-${uid}-${svgSerial++}`);
  const [num,col,shape,fill]=code.split('').map(Number), color=(accessible?colors.accessible:colors.normal)[col];
  const count=num+1, xs=count===1?[80]:count===2?[52,108]:[35,80,125];
  const pattern='__PATTERN__';
  let shapeEl='';
  if(shape===0)shapeEl='<rect x="-24" y="-34" width="48" height="68" rx="23"/>';
  if(shape===1)shapeEl='<path d="M0-39 L27 0 L0 39 L-27 0 Z"/>';
  if(shape===2)shapeEl='<path d="M-27-30 C-4-43 5-20 27-30 C18-9 18 10 27 30 C5 20-4 43-27 30 C-18 10-18-9-27-30 Z"/>';
  const style=fill===0?`fill="${color}" stroke="${color}"`:fill===1?`fill="url(#${pattern})" stroke="${color}"`:`fill="none" stroke="${color}"`;
  template=`<svg viewBox="0 0 160 100" role="img" aria-label="${count} 个${accessible?['红','黄','蓝'][col]:['红','绿','紫'][col]}色图形"><defs><pattern id="${pattern}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><line x1="0" y1="0" x2="0" y2="6" stroke="${color}" stroke-width="2"/></pattern></defs>${xs.map(x=>`<g transform="translate(${x} 50) scale(.72)" ${style} stroke-width="4" stroke-linejoin="round">${shapeEl}</g>`).join('')}</svg>`;
  svgCache.set(cacheKey,template);return template.replaceAll('__PATTERN__',`p-${uid}-${svgSerial++}`)
}
function preloadSVGs(){allCards().forEach(code=>{cardSVG(code,'preload',false);cardSVG(code,'preload',true)})}
function makeCard(code,i,key){const b=document.createElement('button');b.className='set-card';b.dataset.i=i;b.dataset.code=code;b.setAttribute('aria-label',`第 ${i+1} 张牌`);b.innerHTML=`<span class="keycap">${key||''}</span>${cardSVG(code,`${i}`)}`;return b}
function show(id){$$('.screen').forEach(x=>x.classList.remove('active'));$('#'+id).classList.add('active');window.scrollTo(0,0)}
function setStatus(text,tone=''){const el=$('#status');el.textContent=text;el.style.color=tone||''}
function formatTime(t){return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`}

function start(mode,hard=false){
  clearInterval(state.timer);Object.assign(state,{mode,hard,deck:shuffle(allCards()),cards:[],selected:[],hinted:[],hints:0,found:{set:0,planet:0,comet:0},time:0,locked:false,lastResult:null});
  closeModals();cancelConfirm();
  const count=mode==='set'?12:9;state.cards=state.deck.splice(-count);
  if(mode==='set')ensureSet();
  $('#mode-kicker').textContent=hard?'HARD MODE':mode==='set'?'IMPROVED':'SET · PLANET · COMET';$('#mode-title').textContent=mode==='set'?'SET':'行星与彗星';
  $('#hard-badge').classList.toggle('on',hard);$('#timer').textContent='0:00';show('game');render();
  state.timer=setInterval(()=>{$('#timer').textContent=formatTime(++state.time)},1000);
}
function ensureSet(){
  if(findSet(state.cards))return;
  for(let i=0;i<state.cards.length;i++)for(let j=i+1;j<state.cards.length;j++){
    const need=completion(state.cards[i],state.cards[j]),di=state.deck.indexOf(need);
    if(di>=0){const swap=state.deck[di];state.deck[di]=state.cards[state.cards.length-1];state.cards[state.cards.length-1]=swap;return}
  }
  for(let i=0;i<state.cards.length;i++)for(let j=0;j<state.deck.length;j++){
    const need=completion(state.cards[i],state.deck[j]),di=state.deck.indexOf(need);
    if(di>=0&&di!==j){
      const a=state.cards.length-2,b=state.cards.length-1,oldA=state.cards[a],oldB=state.cards[b];
      state.cards[a]=state.deck[j];state.cards[b]=state.deck[di];state.deck[j]=oldA;state.deck[di]=oldB;return
    }
  }
}
function render(){
  const board=$('#board');board.className=`board ${state.mode==='planet'?'planet':''}`;board.innerHTML='';
  const keys=state.mode==='set'?keysSet:keysPlanet;state.cards.forEach((c,i)=>board.append(makeCard(c,i,keys[i])));
  state.selected.forEach(i=>board.children[i]?.classList.add('selected'));state.hinted.forEach(i=>board.children[i]?.classList.add('hinted'));
  $('.controls').classList.toggle('planet-controls',state.mode==='planet');$('[data-action="hint"]').disabled=state.hard;$('#hint-label').textContent=state.hard?'困难模式不允许提示':'提示';
  $('#remaining').textContent=state.deck.length;setStatus(state.mode==='set'?'找出一组 SET':'选择 3 张 SET，或 4 张行星');
}
function selectCard(i){
  if(state.locked||!state.cards[i])return;state.hinted=[];
  const p=state.selected.indexOf(i);if(p>=0)state.selected.splice(p,1);else state.selected.push(i);render();
  if(state.mode==='set'&&state.selected.length===3)judgeSet();
  else if(state.mode==='planet'&&state.selected.length===3&&isSet(...state.selected.map(x=>state.cards[x])))success(state.selected,'SET');
  else if(state.mode==='planet'&&state.selected.length===4)judgePlanet();
}
function judgeSet(){const ids=[...state.selected];if(isSet(...ids.map(i=>state.cards[i])))success(ids,'SET');else fail('这三张还不是 SET')}
function judgePlanet(){
  const ids=[...state.selected];
  for(let a=0;a<2;a++)for(let b=a+1;b<3;b++)for(let c=b+1;c<4;c++)if(isSet(state.cards[ids[a]],state.cards[ids[b]],state.cards[ids[c]]))return success([ids[a],ids[b],ids[c]],'SET');
  if(isPlanetCodes(...ids.map(i=>state.cards[i])))success(ids,'行星');else fail('它们没有形成行星')
}
function success(ids,label){state.locked=true;if(label==='SET')state.found.set++;else if(label==='行星')state.found.planet++;else if(label==='彗星')state.found.comet++;setStatus(`${label}！漂亮。`,'var(--accent)');setTimeout(()=>{removeAndRefill(ids);state.selected=[];state.locked=false;render();checkEnd()},430)}
function fail(msg){state.locked=true;setStatus(state.hard?`${msg}，正在记录本局成绩`:`${msg}，再看看`,'#ff9b83');setTimeout(()=>{if(state.hard)finishHardFailure();else{state.selected=[];state.locked=false;render()}},650)}
function removeAndRefill(ids){ids.sort((a,b)=>b-a).forEach(i=>state.cards.splice(i,1));while(state.cards.length<(state.mode==='set'?12:9)&&state.deck.length)state.cards.push(state.deck.pop());if(state.mode==='set')ensureSet()}
function hint(){if(state.hard)return;const sol=state.mode==='set'?findSet(state.cards):findSolution();if(sol){state.hints++;state.hinted=sol;render();setStatus(sol.length===9?'整片牌桌正在拖着一条彗尾…':`提示 ${state.hints}：留意高亮的牌`,'#6de5ca')}}
function checkComet(){if(state.mode!=='planet'||state.locked)return;if(isComet(state.cards))success([0,1,2,3,4,5,6,7,8],'彗星');else fail('这片星空还不是彗星')}
function checkEnd(){const sol=state.mode==='set'?findSet(state.cards):findSolution();if(!sol)finishGame(true)}
function goHome(){clearInterval(state.timer);clearInterval(state.practiceTimer);state.practiceReady=false;state.practiceGeneration++;cancelConfirm();closeModals();show('home');updateHistoryCount()}
function toggleColor(){state.colorblind=!state.colorblind;localStorage.setItem('set-colorblind',state.colorblind?'1':'0');document.body.classList.toggle('accessible',state.colorblind);$('.color-toggle').classList.toggle('on',state.colorblind);$('#color-state').textContent=state.colorblind?'开':'关';if($('#game').classList.contains('active'))render();if($('#practice').classList.contains('active'))newPractice();renderRuleCards()}

function requestConfirm(text,action){state.confirmAction=action;$('#confirm-text').textContent=text;$('#confirm-bar').classList.add('on')}
function cancelConfirm(){state.confirmAction=null;$('#confirm-bar').classList.remove('on')}
function confirmAction(){const action=state.confirmAction;cancelConfirm();if(action)action()}
function closeModals(){$$('.modal').forEach(m=>m.classList.remove('on'))}
function history(){try{return JSON.parse(localStorage.getItem('set-history')||'[]')}catch{return[]}}
function practiceBest(){try{return JSON.parse(localStorage.getItem('set-practice-best')||'null')}catch{return null}}
function updateHistoryCount(){$('#history-count').textContent=history().length+(practiceBest()?.score>0?1:0)}
function modeName(result=state){return result.mode==='set'?'改进版 SET':'行星与彗星'}
function createResult(completed=false,reason='ended'){return{id:Date.now(),mode:state.mode,hard:state.hard,time:state.time,hints:state.hints,found:{...state.found},remaining:state.deck.length,completed,reason,date:new Date().toISOString(),active:true}}
function persistResult(result){const records=history(),{active,...saved}=result;records.unshift(saved);localStorage.setItem('set-history',JSON.stringify(records.slice(0,50)));updateHistoryCount()}
function clearedCards(r){const found=r.found||{};return(found.set||0)*3+(found.planet||0)*4+(found.comet||0)*9}
function isHardBest(result,records=history()){const score=clearedCards(result);if(score<=0)return false;const prior=records.filter(r=>r.hard&&r.mode===result.mode&&clearedCards(r)>0).sort((a,b)=>clearedCards(b)-clearedCards(a)||a.time-b.time)[0];return!prior||score>clearedCards(prior)||(score===clearedCards(prior)&&result.time<prior.time)}
function reportTitle(result){return result.best?'困难模式新纪录':result.completed?'本局完成':result.reason==='mistake'?'答错结束':'本局已结束'}
function showResult(result){$('#result-title').textContent=reportTitle(result);$('#result-time').textContent=formatTime(result.time);$('#result-mode').textContent=`${modeName(result)}${result.hard?' · 困难模式':''}`;$('#result-hints').textContent=result.hard?'提示已禁用':`${result.hints} 次提示`;renderResultDetails(result);$('[data-action="replay"]').textContent=result.best?'继续挑战':'再来一局';$('#result-modal').classList.add('on')}
function finishGame(completed=false){
  if(state.lastResult&&state.lastResult.active)return;clearInterval(state.timer);state.locked=true;
  const result=createResult(completed);state.lastResult=result;persistResult(result);showResult(result)
}
function finishHardFailure(){clearInterval(state.timer);const result=createResult(false,'mistake'),best=isHardBest(result);result.best=best;persistResult(result);if(best){state.lastResult=result;state.locked=true;showResult(result)}else start(state.mode,true)}
function resultMetrics(r){const found=r.found||{set:0,planet:0,comet:0};return r.mode==='set'?[['找到 SET',found.set||0]]:[['SET',found.set||0],['行星',found.planet||0],['彗星',found.comet||0],['牌堆剩余',r.remaining??0]]}
function renderResultDetails(result){const el=$('#result-details');el.classList.toggle('set-result',result.mode==='set');el.innerHTML='';resultMetrics(result).forEach(([label,value])=>{const item=document.createElement('div');item.innerHTML=`<strong>${value}</strong><span>${label}</span>`;el.append(item)})}
function resultSummary(r){const metrics=resultMetrics(r).map(([label,value])=>`${label} ${value}`).join(' · ');return `${r.hard?'提示禁用':`${r.hints||0} 次提示`} · ${metrics}`}
function recordOutcome(r){return r.completed?'完成牌局':r.reason==='mistake'?'答错结束':'主动结束'}
function renderHistory(){const list=$('#history-list'),records=history(),best=practiceBest();list.innerHTML=records.length||best?.score?'':'<div class="empty-history">还没有完成过牌局</div>';if(best?.score){const item=document.createElement('div');item.className='history-item';item.innerHTML=`<span>行星练习 · 最高连胜</span><strong>${best.score} 题</strong><small>${new Date(best.date).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small><small>用时 ${formatTime(best.time)}</small>`;list.append(item)}records.forEach(r=>{const item=document.createElement('div');item.className='history-item';item.innerHTML=`<span>${modeName(r)}${r.hard?' · 困难':''}${r.best?' · 最佳':''}</span><strong>${formatTime(r.time)}</strong><small>${new Date(r.date).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${recordOutcome(r)}</small><small>${resultSummary(r)}</small>`;const download=document.createElement('button');download.className='history-download';download.dataset.action='history-download';download.dataset.recordId=r.id;download.textContent='重新下载成绩图';item.append(download);list.append(item)})}
function openHistory(){renderHistory();$('#history-modal').classList.add('on')}
function saveResultImage(r=state.lastResult){
  if(!r)return;const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1080;const c=canvas.getContext('2d'),metrics=resultMetrics(r),recordDate=new Date(r.date||Date.now());
  const panel=(x,y,w,h,radius=18)=>{c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,radius);else c.rect(x,y,w,h);c.fill()};
  c.fillStyle='#2b2622';c.fillRect(0,0,1080,1080);c.strokeStyle='#4b443e';c.lineWidth=2;c.strokeRect(36,36,1008,1008);
  c.fillStyle='#d7ff64';c.fillRect(72,70,82,5);c.font='22px ui-monospace, monospace';c.fillText('SET³  /  GAME REPORT',72,116);
  c.fillStyle='#f7f5f0';c.font='54px Inter, "PingFang SC", sans-serif';c.fillText(reportTitle(r),72,205);
  c.fillStyle='#f7f5f0';c.font='700 174px ui-monospace, monospace';c.fillText(formatTime(r.time),62,405);
  c.fillStyle='#b8afa3';c.font='25px Inter, "PingFang SC", sans-serif';c.fillText(`${modeName(r)}${r.hard?'  ·  困难模式':''}`,76,464);c.textAlign='right';c.fillText(r.hard?'提示禁用':`${r.hints||0} 次提示`,1008,464);c.textAlign='left';
  c.fillStyle='#4b443e';c.fillRect(72,500,936,2);
  if(metrics.length===1){c.fillStyle='#383330';panel(72,548,936,230);c.fillStyle='#f7f5f0';c.font='700 96px ui-monospace, monospace';c.fillText(String(metrics[0][1]),110,680);c.fillStyle='#b8afa3';c.font='24px Inter, "PingFang SC", sans-serif';c.fillText(metrics[0][0],112,728)}
  else metrics.forEach(([label,value],i)=>{const col=i%2,row=Math.floor(i/2),x=72+col*477,y=548+row*145;c.fillStyle='#383330';panel(x,y,459,127);c.fillStyle='#f7f5f0';c.font='700 52px ui-monospace, monospace';c.fillText(String(value),x+28,y+62);c.fillStyle='#b8afa3';c.font='19px Inter, "PingFang SC", sans-serif';c.fillText(label,x+30,y+96)});
  c.fillStyle='#f7f5f0';c.font='25px Inter, "PingFang SC", sans-serif';c.fillText(recordOutcome(r),72,908);c.fillStyle='#b8afa3';c.font='20px Inter, "PingFang SC", sans-serif';c.fillText(recordDate.toLocaleString('zh-CN'),72,950);c.textAlign='right';c.fillText('set.closeai.moe',1008,950);c.textAlign='left';c.fillStyle='#4b443e';c.fillRect(72,988,936,2);
  const stamp=d=>d.toISOString().replace(/\D/g,'').slice(0,17),filename=`SET-${r.mode}${r.hard?'-hard':''}-${stamp(recordDate)}-${stamp(new Date())}-${Math.random().toString(36).slice(2,7)}.png`;
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=filename;a.href=url;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')
}

function renderRuleCards(){const data=[['0000','1111','2222'],['1211','1121','1001'],['0012','1012','2012'],['0000','0010','1000']];['#rule-cards-a','#rule-cards-b','#rule-cards-c','#rule-cards-d'].forEach((s,j)=>{const el=$(s);if(!el)return;el.innerHTML='';data[j].forEach((c,i)=>el.append(makeCard(c,i,'')))})}
function createPlanetExample(){
  const deck=shuffle(allCards());for(const a of deck)for(const b of deck){if(a===b)continue;const x=completion(a,b);for(const c of deck){if([a,b,x].includes(c))continue;const d=completion(c,x);if(![a,b,c,x].includes(d)){const four=[a,b,c,d];if(strictPlanet(four))return[...four,x]}}}return null
}
function createCometExample(){for(let tries=0;tries<300;tries++){const eight=shuffle(allCards()).slice(0,8),sum=eight.reduce(add,'0000'),last=completion(sum,'0000');if(!eight.includes(last)){const cards=[...eight,last];if(isComet(cards))return cards}}return['0000','1101','2202','0111','1212','2010','0222','1020','2121']}
function renderExample(selector,cards,labels=[]){const el=$(selector);if(!el||!cards)return;el.innerHTML='';cards.forEach((code,i)=>{const wrap=document.createElement('div');wrap.className='example-card-wrap';wrap.append(makeCard(code,i,''));if(labels[i]){const label=document.createElement('span');label.className='example-label';label.textContent=labels[i];wrap.append(label)}el.append(wrap)})}
function refreshPlanetExample(){renderExample('#planet-example',createPlanetExample(),['A','B','C','D','X'])}
function refreshCometExample(){renderExample('#comet-example',createCometExample())}
function openTutorial(mode){
  renderRuleCards();const planet=mode==='planet';$$('[data-rule="planet"]').forEach(x=>x.hidden=!planet);$$('[data-rule="improved"]').forEach(x=>x.hidden=planet);
  if(planet){refreshPlanetExample();refreshCometExample()}
  $('#tutorial-kicker').textContent=planet?'HOW TO PLAY · PLANET & COMET':'HOW TO PLAY · IMPROVED SET';$('#tutorial-title').innerHTML=planet?'读懂行星与<br><em>彗星。</em>':'一眼看懂<br><em>SET。</em>';
  const btn=$('#tutorial-start');btn.dataset.start=mode;btn.textContent=planet?'明白了，开始行星与彗星':'明白了，开始改进版 SET';show('info')
}
function strictPlanet(c){return !findSet(c)&&isPlanetCodes(...c)}
function makePracticeQuestion(wantPlanet){
  if(wantPlanet){const example=createPlanetExample();return example?.slice(0,4)||null}
  for(let tries=0;tries<500;tries++){const cards=shuffle(allCards()).slice(0,4);if(!strictPlanet(cards))return cards}return null
}
function setPracticeReady(ready){state.practiceReady=ready;$$('[data-answer]').forEach(button=>button.disabled=!ready);$('#practice-board').classList.toggle('loading',!ready)}
function renderPracticeBest(){const best=practiceBest();$('#practice-best').textContent=best?.score?`${best.score} 连胜 · ${formatTime(best.time)}`:'尚无记录'}
function updatePracticeBest(){
  if(!state.streak)return;const best=practiceBest();if(!best||state.streak>best.score||(state.streak===best.score&&state.practiceTime<best.time)){localStorage.setItem('set-practice-best',JSON.stringify({score:state.streak,time:state.practiceTime,date:new Date().toISOString()}));renderPracticeBest();updateHistoryCount()}
}
function newPractice(){
  const generation=++state.practiceGeneration;setPracticeReady(false);$('#practice-status').textContent='正在生成题目…';const wantPlanet=Math.random()<.5,cards=makePracticeQuestion(wantPlanet),b=$('#practice-board');b.innerHTML='';
  if(!cards||cards.length!==4){$('#practice-status').textContent='题目生成失败，正在重试…';setTimeout(()=>{$('#practice').classList.contains('active')&&newPractice()},150);return}
  cards.forEach((c,i)=>b.append(makeCard(c,i,'')));state.practiceCards=cards;state.practiceAnswer=wantPlanet;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(generation!==state.practiceGeneration)return;const loaded=b.children.length===4&&b.querySelectorAll('svg').length===4;if(!loaded){$('#practice-status').textContent='题面尚未加载，正在重试…';setTimeout(()=>{$('#practice').classList.contains('active')&&newPractice()},150);return}$('#practice-status').textContent='观察这四张牌';$('#streak').textContent=state.streak;setPracticeReady(true)}))
}
function openPractice(){clearInterval(state.timer);clearInterval(state.practiceTimer);state.streak=0;state.practiceTime=0;$('#streak').textContent='0';$('#practice-time').textContent='0:00';renderPracticeBest();show('practice');state.practiceTimer=setInterval(()=>{$('#practice-time').textContent=formatTime(++state.practiceTime)},1000);newPractice()}
function answerPractice(yes){
  if(!state.practiceReady||state.practiceCards?.length!==4)return;setPracticeReady(false);const ok=yes===state.practiceAnswer;
  if(ok){state.streak++;updatePracticeBest();$('#streak').textContent=state.streak;$('#practice-status').textContent='答对了 · 下一组';setTimeout(()=>{$('#practice').classList.contains('active')&&newPractice()},500)}
  else{$('#practice-status').textContent=state.practiceAnswer?'答案是：它是行星':'答案是：它不是行星';setTimeout(()=>{if(!$('#practice').classList.contains('active'))return;state.streak=0;state.practiceTime=0;$('#streak').textContent='0';$('#practice-time').textContent='0:00';newPractice()},1000)}
}

document.addEventListener('click',e=>{
  const startBtn=e.target.closest('[data-start]');if(startBtn){const [mode,hard]=startBtn.dataset.start.split('-');start(mode,hard==='hard');return}
  const actionTarget=e.target.closest('[data-action]'),action=actionTarget?.dataset.action;if(action==='home')goHome();if(action==='color')toggleColor();if(action==='tutorial-set')openTutorial('set');if(action==='tutorial-planet')openTutorial('planet');if(action==='refresh-planet-example')refreshPlanetExample();if(action==='refresh-comet-example')refreshCometExample();if(action==='practice')openPractice();if(action==='history')openHistory();if(action==='history-download')saveResultImage(history().find(r=>String(r.id)===actionTarget.dataset.recordId));if(action==='hint')hint();if(action==='reset')requestConfirm('重新发牌会清空本局计时与进度',()=>start(state.mode,state.hard));if(action==='end')requestConfirm('结束本局后将立即结算并保存成绩',()=>finishGame(false));if(action==='comet')checkComet();if(action==='cancel-confirm')cancelConfirm();if(action==='confirm')confirmAction();if(action==='close-result'||action==='result-home')goHome();if(action==='replay')start(state.lastResult.mode,state.lastResult.hard);if(action==='save-image')saveResultImage();if(action==='close-history')$('#history-modal').classList.remove('on');if(action==='clear-history')requestConfirm('确认清空当前浏览器中的全部历史成绩与练习记录？',()=>{localStorage.removeItem('set-history');localStorage.removeItem('set-practice-best');renderHistory();renderPracticeBest();updateHistoryCount()});
  const card=e.target.closest('#board .set-card');if(card)selectCard(+card.dataset.i);const ans=e.target.closest('[data-answer]');if(ans)answerPractice(ans.dataset.answer==='yes');
});
document.addEventListener('keydown',e=>{
  if(!$('#game').classList.contains('active')||$('#result-modal').classList.contains('on'))return;const k=e.key.toUpperCase();const keys=state.mode==='set'?keysSet:keysPlanet;const i=keys.indexOf(k);if(i>=0)selectCard(i);else if(k==='H')hint();else if(k==='R')requestConfirm('重新发牌会清空本局计时与进度',()=>start(state.mode,state.hard));else if(e.key==='Escape')requestConfirm('结束本局后将立即结算并保存成绩',()=>finishGame(false));else if(e.code==='Space'){e.preventDefault();checkComet()}
});
preloadSVGs();document.body.classList.toggle('accessible',state.colorblind);$('.color-toggle').classList.toggle('on',state.colorblind);$('#color-state').textContent=state.colorblind?'开':'关';renderRuleCards();updateHistoryCount();
