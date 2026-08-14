const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const DB='mcp-db', STORE='albums';
let db, albums=[], currentAlbum=null, currentAudioUrl=null;

const openDB=()=>new Promise((res,rej)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'id'});
  r.onsuccess=()=>{db=r.result;res(db)};r.onerror=()=>rej(r.error)
});
const getAll=()=>new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
const put=x=>new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(x);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});
const del=id=>new Promise((res,rej)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>res();r.onerror=()=>rej(r.error)});

function esc(x=''){return x.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function duration(s){if(!isFinite(s))return '--:--';s=Math.max(0,Math.round(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
function toast(t){const x=document.createElement('div');x.className='toast';x.textContent=t;document.body.append(x);setTimeout(()=>x.remove(),1800)}
function sortAlbums(){albums.sort((a,b)=>a.title.localeCompare(b.title,'ko',{numeric:true,sensitivity:'base'}))}
function coverHTML(a,cls='cover'){return a.cover?`<img class="${cls}" src="${a.cover}" alt="">`:`<div class="${cls} placeholder">M</div>`}

function renderHome(){
 sortAlbums(); $('#albumCount').textContent=albums.length;
 const grid=$('#albumGrid');
 if(!albums.length){grid.innerHTML=`<div class="empty"><div class="empty-inner"><div class="empty-orb">＋</div><h2>앨범이 없네요</h2><p>오른쪽 아래 + 버튼으로<br>나만의 앨범을 만들어보아요.</p></div></div>`;return}
 grid.innerHTML=albums.map(a=>`<article class="album-card glass" data-id="${a.id}">
   ${coverHTML(a)}
   <div class="album-meta"><h3>${esc(a.title)}</h3><p class="artist">${esc(a.artist||'아티스트 미입력')}</p><p>${esc(a.date||'발매일 미입력')}</p></div>
   <button class="card-menu" data-menu="${a.id}">•••</button>
 </article>`).join('');
 $$('.album-card').forEach(c=>c.addEventListener('click',e=>{if(e.target.closest('.card-menu'))return;openAlbum(c.dataset.id)}));
 $$('.card-menu').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();albumMenu(b.dataset.menu)}));
}
function show(v){$$('.view').forEach(x=>x.classList.remove('active'));$(v).classList.add('active');scrollTo({top:0,behavior:'smooth'})}
function openAlbum(id){currentAlbum=albums.find(a=>a.id===id);if(!currentAlbum)return;show('#albumView');renderAlbum()}
function renderAlbum(){
 const a=currentAlbum;
 $('#detailCover').style.backgroundImage=a.cover?`url("${a.cover}")`:'linear-gradient(145deg,#ffc2db,#ff5fa2)';
 $('#detailArtist').textContent=a.artist||'아티스트 미입력';$('#detailTitle').textContent=a.title;$('#detailDate').textContent=a.date||'';
 const list=$('#trackList');
 list.innerHTML=a.tracks.length?a.tracks.map((t,i)=>`<div class="track">
 <div class="track-no">${String(i+1).padStart(2,'0')}</div><div><div class="track-title">${esc(t.title)}</div><div class="track-sub">${esc(t.fileName||'MP3')}</div></div>
 <div class="track-time">${duration((t.end??t.duration)-(t.start??0))}</div><button class="track-more" data-track="${t.id}">•••</button>
 </div>`).join(''):`<div class="empty" style="min-height:35svh"><div class="empty-inner"><div class="empty-orb">♪</div><h2>아직 노래가 없어요</h2><p>＋ 버튼으로 MP3를 추가해보세요.</p></div></div>`;
 $$('.track-more').forEach(b=>b.onclick=()=>trackMenu(b.dataset.track));
}
function closeModal(){$('#modalLayer').classList.add('hidden');$('#modal').innerHTML=''}
function modal(html){$('#modal').innerHTML=html;$('#modalLayer').classList.remove('hidden')}
function albumForm(edit=null){
 modal(`<div class="modal-head"><h2>${edit?'앨범 수정':'새 앨범'}</h2><button class="close" id="close">×</button></div>
 <div class="field"><label>앨범명 *</label><input id="aTitle" value="${esc(edit?.title||'')}" placeholder="앨범명을 입력하세요."></div>
 <div class="field"><label>가수명</label><input id="aArtist" value="${esc(edit?.artist||'')}" placeholder="가수명을 입력하세요."></div>
 <div class="field"><label>발매일</label><input id="aDate" type="date" value="${edit?.date||''}"></div>
 <div class="file-box"><label class="file-label" for="aCover">📸 사진을 넣어주세요</label><input id="aCover" type="file" accept="image/*">${edit?.cover?`<img id="preview" class="preview" src="${edit.cover}">`:`<img id="preview" class="preview" hidden>`}</div>
 <button class="primary" id="saveAlbum">${edit?'수정 / SAVE':'저장 / SAVE'}</button>`);
 $('#close').onclick=closeModal;
 $('#aCover').onchange=e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=()=>{$('#preview').src=r.result;$('#preview').hidden=false};r.readAsDataURL(f)}};
 $('#saveAlbum').onclick=async()=>{
  const title=$('#aTitle').value.trim();if(!title){toast('앨범명을 입력해주세요.');return}
  let cover=edit?.cover||'';const f=$('#aCover').files[0];if(f)cover=await dataURL(f);
  const a=edit||{id:crypto.randomUUID(),tracks:[]};Object.assign(a,{title,artist:$('#aArtist').value.trim(),date:$('#aDate').value,cover});
  await put(a);albums=await getAll();closeModal();renderHome();toast(edit?'앨범이 수정됐어요.':'앨범이 만들어졌어요.');
 };
}
function albumMenu(id){
 const a=albums.find(x=>x.id===id);if(!a)return;
 modal(`<div class="modal-head"><h2>${esc(a.title)}</h2><button class="close" id="close">×</button></div>
 <div class="menu-stack"><button id="edit">앨범 수정</button><button class="danger" id="delete">앨범 삭제</button></div>`);
 $('#close').onclick=closeModal;$('#edit').onclick=()=>albumForm(a);
 $('#delete').onclick=async()=>{if(confirm('이 앨범을 삭제할까요?')){await del(id);albums=await getAll();closeModal();renderHome();toast('삭제했어요.')}}}
function trackForm(){
 modal(`<div class="modal-head"><h2>노래 추가</h2><button class="close" id="close">×</button></div>
 <div class="field"><label>노래 제목</label><input id="tTitle" placeholder="노래 제목을 입력하세요."></div>
 <div class="file-box"><label class="file-label" for="tFile">🎵 MP3 파일 업로드</label><input id="tFile" type="file" accept="audio/mpeg,audio/mp3,audio/*"><p id="fileName" class="muted">선택된 파일 없음</p></div>
 <button class="primary" id="saveTrack">저장 / SAVE</button>`);
 $('#close').onclick=closeModal;$('#tFile').onchange=e=>{$('#fileName').textContent=e.target.files[0]?.name||'선택된 파일 없음'};
 $('#saveTrack').onclick=async()=>{const f=$('#tFile').files[0];if(!f){toast('MP3 파일을 선택해주세요.');return}
 const title=$('#tTitle').value.trim()||f.name.replace(/\.[^.]+$/,'');const dur=await getDuration(f);
 currentAlbum.tracks.push({id:crypto.randomUUID(),title,fileName:f.name,blob:await f.arrayBuffer(),duration:dur,start:0,end:dur});
 await put(currentAlbum);albums=await getAll();closeModal();renderAlbum();toast('노래가 추가됐어요.')};
}
function trackMenu(id){
 const t=currentAlbum.tracks.find(x=>x.id===id);
 modal(`<div class="modal-head"><h2>${esc(t.title)}</h2><button class="close" id="close">×</button></div>
 <div class="menu-stack"><button id="trim">노래 길이 편집</button><button id="play">재생</button><button class="danger" id="delete">노래 삭제</button></div>`);
 $('#close').onclick=closeModal;$('#trim').onclick=()=>trimForm(t);$('#play').onclick=()=>{playTrack(t);closeModal()};
 $('#delete').onclick=async()=>{currentAlbum.tracks=currentAlbum.tracks.filter(x=>x.id!==id);await put(currentAlbum);albums=await getAll();closeModal();renderAlbum();toast('노래를 삭제했어요.')};
}
function trimForm(t){
 modal(`<div class="modal-head"><h2>노래 길이 편집</h2><button class="close" id="close">×</button></div>
 <div class="file-box"><label class="file-label" for="trimFile">MP3 불러오기</label><input id="trimFile" type="file" accept="audio/*"><p class="muted" id="trimName">${esc(t.fileName||'현재 곡 사용')}</p></div>
 <div class="range-wrap"><div class="range-track"></div><input id="rStart" type="range" min="0" max="${t.duration}" step=".1" value="${t.start||0}"><input id="rEnd" type="range" min="0" max="${t.duration}" step=".1" value="${t.end??t.duration}"></div>
 <p class="muted" id="rangeText">${duration(t.start||0)} — ${duration(t.end??t.duration)} / 원본 ${duration(t.duration)}</p>
 <button class="primary" id="saveTrim">저장 / SAVE</button>`);
 $('#close').onclick=closeModal;
 const update=()=>{$('#rangeText').textContent=`${duration(+$('#rStart').value)} — ${duration(+$('#rEnd').value)} / 원본 ${duration(t.duration)}`};
 $('#rStart').oninput=()=>{if(+$('#rStart').value>+$('#rEnd').value-0.1)$('#rStart').value=+$('#rEnd').value-0.1;update()};
 $('#rEnd').oninput=()=>{if(+$('#rEnd').value<+$('#rStart').value+0.1)$('#rEnd').value=+$('#rStart').value+0.1;update()};
 $('#trimFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;t.blob=await f.arrayBuffer();t.fileName=f.name;t.duration=await getDuration(f);t.start=0;t.end=t.duration;$('#rStart').max=t.duration;$('#rEnd').max=t.duration;$('#rStart').value=0;$('#rEnd').value=t.duration;$('#trimName').textContent=f.name;update()};
 $('#saveTrim').onclick=async()=>{t.start=+$('#rStart').value;t.end=+$('#rEnd').value;await put(currentAlbum);albums=await getAll();closeModal();renderAlbum();toast('길이를 저장했어요.')};
}
function playTrack(t){
 const blob=new Blob([t.blob],{type:'audio/mpeg'});if(currentAudioUrl)URL.revokeObjectURL(currentAudioUrl);currentAudioUrl=URL.createObjectURL(blob);
 const p=$('#player');p.src=currentAudioUrl;p.currentTime=t.start||0;p.play().catch(()=>{});p.ontimeupdate=()=>{if(p.currentTime>=(t.end??t.duration)){p.pause();p.currentTime=t.start||0}};
 toast(`재생 중 · ${t.title}`);
}
async function dataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function getDuration(file){return new Promise(res=>{const a=document.createElement('audio');a.preload='metadata';a.onloadedmetadata=()=>{URL.revokeObjectURL(a.src);res(isFinite(a.duration)?a.duration:0)};a.src=URL.createObjectURL(file)})}

async function videoToMp3(){
 modal(`<div class="modal-head"><h2>MP3 변환</h2><button class="close" id="close">×</button></div>
 <div class="file-box"><label class="file-label" for="videoFile">🎬 동영상 파일 선택</label><input id="videoFile" type="file" accept="video/*"><p id="videoName" class="muted">선택된 파일 없음</p></div>
 <button class="primary" id="convert" disabled>MP3으로 변환</button><div class="progress"><i id="bar"></i></div><p class="convert-status" id="status">파일을 선택하면 변환할 수 있어요.</p><button class="secondary" id="download" disabled style="width:100%;margin-top:8px">저장</button>`);
 $('#close').onclick=closeModal;
  $('#videoFile').onchange=e=>{const f=e.target.files[0];if(f){$('#videoName').textContent=f.name;$('#convert').disabled=false;$('#status').textContent='변환 준비 완료'}};
 $('#convert').onclick=async()=>{
  const f=$('#videoFile').files[0];if(!f)return;$('#convert').disabled=true;$('#status').textContent='오디오 추출 중…';
  try{
   if(!window.lamejs){await loadScript('https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js')}
   const ctx=new AudioContext(), source=ctx.createMediaElementSource(document.createElement('video'));
   const v=document.createElement('video');v.src=URL.createObjectURL(f);v.muted=true;v.crossOrigin='anonymous';v.preload='auto';
   await new Promise(r=>{v.onloadedmetadata=r;v.load()});
   const stream=v.captureStream();const ac=ctx.createMediaStreamSource(stream);const dest=ctx.createMediaStreamDestination();ac.connect(dest);
   const rec=new MediaRecorder(dest.stream,{mimeType:'audio/webm'});const chunks=[];rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
   rec.start();v.play();const total=v.duration;let last=0;
   await new Promise(resolve=>{v.ontimeupdate=()=>{const p=Math.min(95,v.currentTime/total*95);$('#bar').style.width=p+'%';if(v.currentTime>=total-0.05){v.pause();rec.stop();resolve()}}});
   await new Promise(r=>rec.onstop=r);
   // Decode recorded audio and encode to MP3 with lamejs.
   const audioBlob=new Blob(chunks,{type:'audio/webm'});const buf=await audioBlob.arrayBuffer();const decoded=await ctx.decodeAudioData(buf);
   const samples=decoded.getChannelData(0);const enc=new lamejs.Mp3Encoder(1,decoded.sampleRate,128), block=1152, mp3=[];
   for(let i=0;i<samples.length;i+=block){const end=Math.min(i+block,samples.length), pcm=new Int16Array(end-i);for(let j=i;j<end;j++)pcm[j-i]=Math.max(-1,Math.min(1,samples[j]))*32767;const b=enc.encodeBuffer(pcm);if(b.length)mp3.push(new Int8Array(b));$('#bar').style.width=(95+i/samples.length*5)+'%'}
   const end=enc.flush();if(end.length)mp3.push(new Int8Array(end));const out=new Blob(mp3,{type:'audio/mpeg'});const url=URL.createObjectURL(out);
   $('#bar').style.width='100%';$('#status').textContent='변환 완료!';$('#download').disabled=false;$('#download').onclick=()=>{const a=document.createElement('a');a.href=url;a.download=f.name.replace(/\.[^.]+$/,'')+'.mp3';a.click();toast('MP3 저장을 시작했어요.')};
  }catch(e){console.error(e);$('#status').textContent='이 브라우저에서 변환에 실패했어요. 다른 동영상으로 다시 시도해주세요.';$('#convert').disabled=false}
 };
}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.append(s)})}

$('#brandBtn').onclick=()=>{show('#homeView');renderHome()};$('#addAlbumFab').onclick=()=>albumForm();$('#addTrackBtn').onclick=trackForm;
$('#backHome').onclick=()=>{show('#homeView');renderHome()};$('#albumMore').onclick=()=>currentAlbum&&albumMenu(currentAlbum.id);
$('#modalBackdrop').onclick=closeModal;$('#themeBtn').onclick=()=>document.documentElement.classList.toggle('force-dark');

(async()=>{await openDB();albums=await getAll();renderHome();setTimeout(()=>$('#splash').classList.add('hide'),1750)})();
