(()=>{
const DB='MCP_DB',VER=2,A='albums',S='audio';
let db,albums=[],albumId=null,selected=new Set(),queue=[],qi=0,obj=null,shuffle=false,repeat=false,pending=0;
const $=id=>document.getElementById(id),audio=$('audio');
const ready=new Promise((res,rej)=>{const r=indexedDB.open(DB,VER);
 r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(A))d.createObjectStore(A,{keyPath:'id'});if(!d.objectStoreNames.contains(S))d.createObjectStore(S,{keyPath:'id'})};
 r.onsuccess=e=>{db=e.target.result;res()};r.onerror=()=>rej(r.error)});
const store=(n,m='readonly')=>db.transaction(n,m).objectStore(n);
const req=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const all=n=>req(store(n).getAll()),get=(n,k)=>req(store(n).get(k)),put=(n,v)=>req(store(n,'readwrite').put(v)),del=(n,k)=>req(store(n,'readwrite').delete(k));
const uid=()=>crypto.randomUUID?.()||Date.now()+Math.random();
const ft=s=>{s=Math.max(0,Number(s)||0);return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>s?new Date(s+'T00:00:00').toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}):'발매일 미입력';
const dataurl=f=>new Promise((r,j)=>{const x=new FileReader;x.onload=()=>r(x.result);x.onerror=j;x.readAsDataURL(f)});
const toast=t=>{let e=$('mcpToast');if(!e){e=document.createElement('div');e.id='mcpToast';document.body.append(e);Object.assign(e.style,{position:'fixed',zIndex:9999,left:'50%',bottom:'calc(95px + env(safe-area-inset-bottom))',transform:'translateX(-50%)',padding:'12px 17px',borderRadius:'16px',background:'rgba(25,18,22,.9)',color:'#fff',fontWeight:'750',backdropFilter:'blur(18px)',boxShadow:'0 15px 45px #0004',whiteSpace:'nowrap'});}e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>e.style.display='none',2200)};
function injectCompatStyles(){
 const s=document.createElement('style');s.textContent=`
 .albumCard{position:relative;display:flex;align-items:center;gap:15px;padding:13px;border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:0 10px 35px rgba(30,10,20,.07);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);animation:up .45s ease both;transition:transform .2s ease}
 .albumCard:active{transform:scale(.985)}.albumCard .more{position:absolute;right:10px;top:10px;width:40px;height:40px;border-radius:14px;background:transparent;color:var(--muted);font-size:19px}
 .songRow{display:grid;grid-template-columns:1fr 42px;gap:4px;align-items:center}.songMore{width:40px;height:40px;border-radius:14px;background:transparent;color:var(--muted);font-size:18px}.song{width:100%}
 .lyricsWrap{margin:18px 0 4px;width:100%;border-radius:24px;padding:16px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(20px)}.lyricsHead{display:flex;justify-content:space-between;align-items:center}.lyricsHead small{color:var(--p);font-weight:900;letter-spacing:.15em}.lyricsView{height:190px;overflow:auto;text-align:center;padding:12px;scroll-behavior:smooth}.ly{margin:11px 0;color:#aaa;transition:.25s;font-size:15px;line-height:1.5}.ly.active{color:#fff;font-size:20px;font-weight:850;transform:scale(1.02)}.ly.interlude{color:var(--p);font-size:25px}.lyricsEdit{padding:9px 12px;border-radius:13px;background:rgba(255,255,255,.1);color:#fff}.lyRow{display:grid;grid-template-columns:78px 78px 1fr 40px;gap:7px;margin:7px 0}.lyRow input{width:100%;height:43px;border-radius:13px;border:1px solid var(--line);background:var(--card);color:var(--ink);padding:0 8px}.converterInfo{padding:13px;border-radius:17px;background:var(--p2);color:var(--ink);font-size:13px;line-height:1.55}.progressBox{margin-top:15px;padding:14px;border-radius:18px;background:var(--p2)}.progressBox progress{width:100%;accent-color:var(--p)}.convertStatus{text-align:center;margin-top:7px;font-size:12px;color:var(--muted)}
 `;
 document.head.append(s);
}
function renderHome(){
 const l=$('albums');$('empty').classList.toggle('hidden',albums.length>0);
 l.innerHTML=albums.map((a,i)=>`<article class="albumCard" data-id="${a.id}" style="animation-delay:${i*40}ms">
 <div class="cover" ${a.cover?`style="background-image:url('${a.cover}')"`:''}>${a.cover?'':'MCP'}</div>
 <div class="albumInfo"><p>${esc(a.artist||'아티스트 미입력')} · ${esc(date(a.date))}</p><h3>${esc(a.name)}</h3><p>${a.songCount||0}곡 · 나만의 CD</p></div>
 <button class="more" data-menu="${a.id}" aria-label="앨범 메뉴">•••</button></article>`).join('');
 l.querySelectorAll('.albumCard').forEach(x=>x.onclick=e=>{if(e.target.closest('[data-menu]'))return;openAlbum(x.dataset.id)});
 l.querySelectorAll('[data-menu]').forEach(x=>x.onclick=e=>{e.stopPropagation();albumId=x.dataset.menu;$('menuModal').classList.remove('hidden')});
}
async function load(){albums=(await all(A)).sort((x,y)=>x.name.localeCompare(y.name,'ko',{numeric:true,sensitivity:'base'}));renderHome()}
async function openAlbum(id){albumId=id;selected.clear();const a=albums.find(x=>x.id===id);if(!a)return;$('home').classList.add('hidden');$('album').classList.remove('hidden');$('homeBtn').classList.remove('hidden');$('cover').style.backgroundImage=a.cover?`url('${a.cover}')`:'';$('cover').textContent=a.cover?'':'MCP';$('title').textContent=a.name;$('artist').textContent=a.artist||'아티스트 미입력';$('date').textContent=date(a.date);await songs()}
async function songs(){
 const a=albums.find(x=>x.id===albumId),ss=(await all(S)).filter(x=>x.albumId===albumId);a.songCount=ss.length;await put(A,a);
 $('songs').innerHTML=ss.length?ss.map(s=>`<div class="songRow"><button class="song ${selected.has(s.id)?'selected':''}" data-song="${s.id}"><i class="check">✓</i><span><b class="songTitle">${esc(s.title)}</b><small class="songArtist">${esc(s.artist||a.artist||'아티스트 미입력')}</small></span><em class="time songLength">${ft(s.playLength||s.duration)}</em></button><button class="songMore" data-song-menu="${s.id}">•••</button></div>`).join(''):`<div class="empty"><h3>아직 노래가 없어요</h3><p>＋ 노래 추가를 눌러주세요.</p></div>`;
 $('songs').querySelectorAll('[data-song]').forEach(x=>x.onclick=()=>{selected.has(x.dataset.song)?selected.delete(x.dataset.song):selected.add(x.dataset.song);songs()});
 $('songs').querySelectorAll('[data-song-menu]').forEach(x=>x.onclick=e=>{e.stopPropagation();trackMenu(x.dataset.songMenu)});
 $('selectBar').classList.toggle('hidden',!selected.size);$('selectCount').textContent=`${selected.size}곡`;
}
async function albumSubmit(e){e.preventDefault();const old=$('albumId').value?albums.find(x=>x.id===$('albumId').value):null,im=$('albumImage').files[0],cover=im?await dataurl(im):old?.cover||'';const name=$('albumName').value.trim();if(!name)return;$('albumName').blur();const a={id:old?.id||uid(),name,artist:$('albumArtist').value.trim(),date:$('albumDate').value,cover,songCount:old?.songCount||0};await put(A,a);$('albumModal').classList.add('hidden');$('albumForm').reset();await load();if(old)openAlbum(a.id)}
function songFile(f){if(!f)return;$('fileName').textContent=f.name;const u=URL.createObjectURL(f),x=new Audio;x.onloadedmetadata=()=>{pending=x.duration;$('length').min=1;$('length').max=Math.max(1,Math.round(x.duration));$('length').value=Math.max(1,Math.round(x.duration));$('lengthText').textContent=ft(pending);$('lengthBox').classList.remove('hidden');URL.revokeObjectURL(u)};x.onerror=()=>URL.revokeObjectURL(u);x.src=u}
async function songSubmit(e){e.preventDefault();const f=$('songFile').files[0];if(!f)return toast('음원 파일을 먼저 선택해주세요.');const a=albums.find(x=>x.id===albumId);const s={id:uid(),albumId,title:$('songTitle').value.trim()||f.name.replace(/\.[^/.]+$/,''),artist:$('songArtist').value.trim(),fileName:f.name,duration:pending,playLength:pending,blob:f,lyrics:[]};await put(S,s);$('songModal').classList.add('hidden');$('songForm').reset();$('lengthBox').classList.add('hidden');pending=0;await load();openAlbum(albumId)}
async function playSelected(){const ss=(await all(S)).filter(x=>selected.has(x.id));if(!ss.length)return;queue=ss;qi=0;await play(queue[0])}
async function play(s,auto=true){if(!s?.blob)return toast('이 곡의 음원 파일을 찾을 수 없어요.');if(obj)URL.revokeObjectURL(obj);obj=URL.createObjectURL(s.blob);audio.src=obj;audio.currentTime=0;audio.load();const a=albums.find(x=>x.id===s.albumId),name=s.artist||a?.artist||'아티스트 미입력';$('miniTitle').textContent=s.title;$('miniArtist').textContent=name;$('pTitle').textContent=s.title;$('pArtist').textContent=name;$('mini').classList.remove('hidden');renderLyrics(s);mediaSession(s);if(auto)try{await audio.play()}catch{}state()}
function state(){const p=!audio.paused;document.body.classList.toggle('playing',p);$('player').classList.toggle('playing',p);$('miniToggle').textContent=p?'Ⅱ':'▶';$('toggle').textContent=p?'Ⅱ':'▶'}
function progress(){const d=audio.duration||queue[qi]?.playLength||0,r=Math.max(0,d-audio.currentTime);$('miniTime').textContent=`${ft(r)} 남음`;$('cur').textContent=ft(audio.currentTime);$('dur').textContent=ft(d);$('progress').value=d?audio.currentTime/d*100:0;syncLyrics(audio.currentTime)}
async function next(){if(!queue.length)return;if(shuffle&&queue.length>1){let n=Math.floor(Math.random()*queue.length);if(n===qi)n=(n+1)%queue.length;qi=n}else qi++;if(qi>=queue.length){if(repeat)qi=0;else{qi=queue.length-1;audio.pause();state();return}}await play(queue[qi])}
async function prev(){if(audio.currentTime>3){audio.currentTime=0;return}qi=(qi-1+queue.length)%queue.length;await play(queue[qi])}
function toggle(){audio.paused?audio.play().catch(()=>{}):audio.pause();state()}
function close(id){$(id)?.classList.add('hidden')}
function trackMenu(id){
 const t=queue.find(x=>x.id===id)||null;
 const sPromise=get(S,id);sPromise.then(s=>{if(!s)return;const a=albums.find(x=>x.id===s.albumId);
 const m=document.createElement('div');m.className='modal';m.id='trackActionModal';m.innerHTML=`<div class="action"><button id="trackPlay">▶ 재생</button><button id="trackLyrics">가사 편집</button><button id="trackDelete">노래 삭제</button><button id="trackCancel">취소</button></div>`;document.body.append(m);
 $('#trackCancel').onclick=()=>m.remove();$('#trackPlay').onclick=async()=>{m.remove();queue=[s];qi=0;await play(s)};$('#trackLyrics').onclick=()=>{m.remove();lyricsEditor(s)};$('#trackDelete').onclick=async()=>{m.remove();await del(S,id);selected.delete(id);await load();openAlbum(a.id);toast('노래를 삭제했어요.')};
 });
}
function renderLyrics(s){
 let wrap=$('lyricsWrap');if(!wrap){wrap=document.createElement('div');wrap.id='lyricsWrap';wrap.className='lyricsWrap';$('player').querySelector('.playerInner').append(wrap)}
 wrap.innerHTML=`<div class="lyricsHead"><small>LYRICS</small><button class="lyricsEdit" id="lyricsEditBtn">가사 편집</button></div><div class="lyricsView" id="lyricsView"></div>`;
 $('#lyricsEditBtn').onclick=()=>lyricsEditor(s);drawLyrics(s);
}
function drawLyrics(s){const v=$('lyricsView');if(!v)return;const ls=Array.isArray(s.lyrics)?s.lyrics:[];v.innerHTML=ls.length?ls.map((l,i)=>`<div class="ly ${l.text===' '?'interlude':''}" data-li="${i}">${l.text===' ' ? '♪' : esc(l.text)}</div>`).join(''):`<p style="color:#aaa">등록된 가사가 없어요.<br><span style="color:var(--p)">가사 편집</span>에서 직접 추가해보세요.</p>`}
function syncLyrics(time){const s=queue[qi];if(!s)return;const ls=s.lyrics||[];const els=document.querySelectorAll('.ly');let ai=-1;els.forEach((el,i)=>{const l=ls[i];const active=time>=l.start&&time<l.end;el.classList.toggle('active',active);if(active)ai=i});if(ai>=0)els[ai].scrollIntoView({behavior:'smooth',block:'center'})}
function lyricsEditor(s){
 let rows=(s.lyrics||[]).map(x=>({...x}));if(!rows.length)rows=[{start:0,end:5,text:''}];
 const m=document.createElement('div');m.className='modal';m.id='lyricsModal';m.innerHTML=`<div class="sheet"><button class="close" id="lx">×</button><small>LYRICS SYNC</small><h2>가사 편집</h2><p style="color:var(--muted);font-size:13px;line-height:1.6">시작초와 끝초를 입력하세요. 가사 칸을 비워 저장하면 해당 구간은 ♪ 간주로 표시됩니다.</p><div id="lyRows"></div><div class="row" style="margin-top:12px"><button class="pink" id="lyAdd">＋ 구간 추가</button><button class="save" id="lySave" style="margin-top:0">저장 / SAVE</button></div></div>`;document.body.append(m);
 const render=()=>{$('lyRows').innerHTML=rows.map((r,i)=>`<div class="lyRow"><input type="number" step=".1" min="0" value="${r.start}" placeholder="시작초"><input type="number" step=".1" min="0" value="${r.end}" placeholder="끝초"><input value="${r.text===' ' ? '' : esc(r.text)}" placeholder="가사"><button class="icon" data-rm="${i}">×</button></div>`).join('');$('lyRows').querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.rm,1);render()})};render();
 $('lx').onclick=()=>m.remove();$('lyAdd').onclick=()=>{rows.push({start:0,end:5,text:''});render()};$('lySave').onclick=async()=>{rows=[...document.querySelectorAll('.lyRow')].map(r=>{const ins=r.querySelectorAll('input');return{start:Math.max(0,+ins[0].value||0),end:Math.max(+ins[0].value||0,+ins[1].value||0),text:ins[2].value.trim()===''?' ':ins[2].value.trim()}}).sort((a,b)=>a.start-b.start);s.lyrics=rows;await put(S,s);m.remove();if(queue[qi]?.id===s.id)drawLyrics(s);toast('가사를 저장했어요.')};
}
function mediaSession(s){if(!('mediaSession'in navigator))return;const a=albums.find(x=>x.id===s.albumId);try{navigator.mediaSession.metadata=new MediaMetadata({title:s.title,artist:s.artist||a?.artist||'MCP',album:a?.name||'MCP',artwork:a?.cover?[{src:a.cover,sizes:'512x512',type:'image/png'}]:[]});['play','pause','nexttrack','previoustrack','seekbackward','seekforward'].forEach(k=>{try{navigator.mediaSession.setActionHandler(k,{play:()=>audio.play(),pause:()=>audio.pause(),nexttrack:next,previoustrack:prev,seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-10),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10)}[k])}catch{}})}catch{}}
function addConverterButton(){
 const row=document.createElement('button');row.type='button';row.className='pink';row.textContent='🎬 MP3 변환';row.style.marginTop='10px';row.onclick=openConverter;$('songForm').append(row);
}
function openConverter(){
 const m=document.createElement('div');m.className='modal';m.id='converterModal';m.innerHTML=`<div class="sheet"><button class="close" id="cx">×</button><small>MEDIA CONVERTER</small><h2>MP3 변환</h2><div class="converterInfo">동영상의 오디오 트랙을 추출해 MP3로 변환합니다. 변환은 브라우저에서 처리되며 파일 크기와 길이에 따라 시간이 걸릴 수 있어요.</div><label class="file" style="margin-top:14px"><span id="cvName">동영상 파일을 선택하세요</span><input id="cvFile" type="file" accept="video/*"><b>파일 선택</b></label><button class="save" id="cvStart" disabled>MP3로 변환</button><div class="progressBox" id="cvProgress" hidden><progress id="cvBar" max="100" value="0"></progress><div class="convertStatus" id="cvStatus">0%</div></div><button class="save" id="cvSave" hidden>저장 / 앨범에 추가</button></div>`;document.body.append(m);
 let file=null,mp3=null;
 $('#cx').onclick=()=>m.remove();$('#cvFile').onchange=e=>{file=e.target.files[0];$('#cvName').textContent=file?.name||'동영상 파일을 선택하세요';$('#cvStart').disabled=!file};
 $('#cvStart').onclick=async()=>{if(!file)return;$('#cvStart').disabled=true;$('#cvProgress').hidden=false;try{mp3=await convertVideoToMp3(file,p=>{$('cvBar').value=p;$('cvStatus').textContent=`${p}%`});$('#cvStatus').textContent='100% · 변환 완료';$('#cvSave').hidden=false;toast('MP3 변환이 완료됐어요.')}catch(e){console.error(e);$('#cvStatus').textContent='변환 실패 · 브라우저에서 지원하지 않는 형식일 수 있어요.';$('#cvStart').disabled=false}};
 $('#cvSave').onclick=async()=>{if(!mp3)return;const a=albums.find(x=>x.id===albumId);const title=file.name.replace(/\.[^/.]+$/,'');const seconds=mp3.duration||0;const s={id:uid(),albumId,title,artist:a?.artist||'',fileName:title+'.mp3',duration:seconds,playLength:seconds,blob:mp3.blob,lyrics:[]};await put(S,s);await load();m.remove();$('songModal').classList.add('hidden');openAlbum(albumId);toast('MP3을 앨범에 추가했어요.')};
}
async function loadLame(){if(window.lamejs)return window.lamejs;return new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';s.onload=()=>res(window.lamejs);s.onerror=()=>rej(new Error('MP3 encoder load failed'));document.head.append(s)})}
async function convertVideoToMp3(file,onProgress){
 const lame=await loadLame();const buf=await file.arrayBuffer();onProgress(5);const ctx=new (window.AudioContext||window.webkitAudioContext)();const decoded=await ctx.decodeAudioData(buf.slice(0));onProgress(20);
 const ch=Math.min(2,decoded.numberOfChannels),sr=decoded.sampleRate,enc=new lame.Mp3Encoder(ch,sr,128),block=1152,parts=[];
 const left=decoded.getChannelData(0),right=ch>1?decoded.getChannelData(1):left,total=left.length;
 for(let i=0;i<total;i+=block){const end=Math.min(total,i+block),l=new Int16Array(end-i),r=new Int16Array(end-i);for(let j=0;j<l.length;j++){const idx=i+j;l[j]=Math.max(-1,Math.min(1,left[idx]))*32767;r[j]=Math.max(-1,Math.min(1,right[idx]))*32767}const mp3buf=ch===2?enc.encodeBuffer(l,r):enc.encodeBuffer(l);if(mp3buf.length)parts.push(new Int8Array(mp3buf));if(i%Math.max(block*20,1)===0)onProgress(20+Math.floor(i/total*75))}
 const tail=enc.flush();if(tail.length)parts.push(new Int8Array(tail));onProgress(100);await ctx.close();return{blob:new Blob(parts,{type:'audio/mpeg'}),duration:decoded.duration};
}
$('addAlbum').onclick=()=>{$('albumForm').reset();$('albumId').value='';$('albumModal').classList.remove('hidden')};
$('albumForm').onsubmit=albumSubmit;
$('addSong').onclick=()=>{$('songForm').reset();$('fileName').textContent='MP3 파일을 선택하세요';$('lengthBox').classList.add('hidden');pending=0;$('songModal').classList.remove('hidden')};
$('songForm').onsubmit=songSubmit;$('songFile').onchange=e=>songFile(e.target.files[0]);$('length').oninput=e=>{$('lengthText').textContent=ft(e.target.value);pending=Number(e.target.value)};
$('back').onclick=()=>$('homeBtn').click();$('homeBtn').onclick=()=>{$('album').classList.add('hidden');$('home').classList.remove('hidden');$('homeBtn').classList.add('hidden');load()};
document.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>close(x.dataset.close));
$('edit').onclick=()=>{const a=albums.find(x=>x.id===albumId);$('albumId').value=a.id;$('albumName').value=a.name;$('albumArtist').value=a.artist||'';$('albumDate').value=a.date||'';$('albumImage').value='';close('menuModal');$('albumModal').classList.remove('hidden')};
$('del').onclick=async()=>{if(!confirm('앨범과 안의 노래를 모두 삭제할까요?'))return;for(const s of (await all(S)).filter(x=>x.albumId===albumId))await del(S,s.id);await del(A,albumId);close('menuModal');$('homeBtn').click()};
$('menu').onclick=()=>$('menuModal').classList.remove('hidden');$('playSelected').onclick=playSelected;$('miniOpen').onclick=()=>$('player').classList.remove('hidden');$('miniPrev').onclick=prev;$('miniNext').onclick=next;$('miniToggle').onclick=toggle;$('playerClose').onclick=()=>close('player');$('prev').onclick=prev;$('next').onclick=next;$('toggle').onclick=toggle;
$('repeat').onclick=()=>{repeat=!repeat;$('repeat').classList.toggle('on',repeat)};$('shuffle').onclick=()=>{shuffle=!shuffle;$('shuffle').classList.toggle('on',shuffle)};$('progress').oninput=e=>{if(audio.duration)audio.currentTime=audio.duration*e.target.value/100};
audio.ontimeupdate=progress;audio.onplay=state;audio.onpause=state;audio.onended=next;addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
injectCompatStyles();setTimeout(()=>{const sp=$('splash');if(sp&&!sp.querySelector('img')){const img=document.createElement('img');img.src='logo.png';img.style.cssText='width:min(62vw,330px);border-radius:28px;filter:drop-shadow(0 24px 35px #ff3e8640)';sp.innerHTML='';sp.append(img)}},0);
setTimeout(()=>{$('splash')?.classList.add('hidden');$('app')?.classList.remove('hidden')},1800);
ready.then(async()=>{try{await load()}catch(e){console.error(e)}if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{})});
addConverterButton();
})()