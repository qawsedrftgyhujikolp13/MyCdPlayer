(()=>{const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DB="mcp30",STORE="files",KEY="mcp30_albums";let albums=[],current=null,queue=[],qi=0,shuffle=false,repeat=false,themeMode="auto",viewFilter="albums";
const audio=$("#audio");const uid=()=>crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2);const fmt=n=>{n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0")};const esc=s=>(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(t){let e=document.createElement("div");e.className="toast";e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2100)}
function load(){try{albums=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{albums=[]}albums.forEach(a=>{a.tracks??=[];a.tracks.forEach(t=>t.favorite=!!t.favorite)})}
function save(){
  const serialized=JSON.stringify(albums);
  localStorage.setItem(KEY,serialized);
  return true;
}
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function putFile(k,f){let d=await openDB();return new Promise((ok,no)=>{let t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(f,k);t.oncomplete=ok;t.onerror=()=>no(t.error)})}
async function getFile(k){if(!k)return null;let d=await openDB();return new Promise((ok,no)=>{let r=d.transaction(STORE).objectStore(STORE).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function delFile(k){if(!k)return;let d=await openDB();d.transaction(STORE,"readwrite").objectStore(STORE).delete(k)}
function render(){
  const all=albums.slice().reverse();
  const favTracks=all.flatMap(a=>a.tracks.map(t=>({a,t}))).filter(x=>x.t.favorite);
  if(viewFilter==="fav"){
    $("#albumCount").textContent=`${favTracks.length} FAVORITE${favTracks.length===1?"":"S"}`;
    $("#empty").style.display=favTracks.length?"none":"flex";
    $("#albumGrid").innerHTML=favTracks.map((x,i)=>`<article class="album-card favorite-card" data-id="${x.a.id}" data-track-fav="${x.t.id}" style="animation-delay:${i*45}ms">
      <div class="album-cover">${x.a.cover?`<img src="${x.a.cover}" alt="">`:"♫"}</div>
      <div><h3>${esc(x.t.name)}</h3><div class="meta">${esc(x.a.name)} · ${esc(x.a.artist||"아티스트 미입력")}</div><div class="meta">${fmt(x.t.duration)}</div></div>
      <button class="more" data-more="${x.a.id}">•••</button>
    </article>`).join("");
  }else{
    $("#albumCount").textContent=`${all.length} ALBUM${all.length===1?"":"S"}`;
    $("#empty").style.display=all.length?"none":"flex";
    $("#albumGrid").innerHTML=all.map((a,i)=>`<article class="album-card" data-id="${a.id}" style="animation-delay:${i*45}ms"><div class="album-cover">${a.cover?`<img src="${a.cover}" alt="">`:"♫"}</div><div><h3>${esc(a.name)}</h3><div class="meta">${esc(a.artist||"아티스트 미입력")} · ${esc(a.date||"발매일 미입력")}</div><div class="meta">${a.tracks.length}곡</div></div><button class="more" data-more="${a.id}">•••</button></article>`).join("");
  }
  $$("#albumGrid .album-card").forEach(card=>card.onclick=e=>{
    if(e.target.closest(".more"))return;
    const a=albums.find(x=>x.id===card.dataset.id);
    if(!a)return;
    if(card.dataset.trackFav){
      const t=a.tracks.find(x=>x.id===card.dataset.trackFav);
      if(t)start(a,a.tracks.map((_,idx)=>idx),a.tracks.indexOf(t));
    }else albumDetail(a);
  });
  $$("#albumGrid [data-more]").forEach(b=>b.onclick=e=>{e.stopPropagation();const a=albums.find(x=>x.id===b.dataset.more);if(a)trackOrAlbumActions(a)});
}
function modal(body){$("#mini").hidden=true;document.body.classList.add("modal-open");$("#modal").innerHTML=`<div class="modal-bg"><section class="modal-card">${body}</section></div>`;$(".modal-bg").onclick=e=>{if(e.target===e.currentTarget)closeModal()}}
function closeModal(){$("#modal").innerHTML="";document.body.classList.remove("modal-open");if(!audio.paused&&queue.length)showMini()}
function albumForm(a=null,presetCover=null){let cover=(presetCover ?? a?.cover ?? "");modal(`<div class="modal-head"><h2>${a?"앨범 수정":"새 앨범"}</h2><button class="icon" id="mx">×</button></div><div class="field"><label>앨범명 *</label><input id="an" placeholder="앨범명을 입력하세요" value="${esc(a?.name)}"></div><div class="field"><label>가수명</label><input id="aa" placeholder="가수명을 입력하세요" value="${esc(a?.artist)}"></div><div class="field"><label>발매일</label><input id="ad" type="date" value="${a?.date||""}"></div><div class="field"><label>앨범 표지</label><div class="photo" id="photo">${cover?`<img src="${cover}">`:"📸 사진을 넣어주세요"}</div></div><div class="actions"><button class="glass-btn" id="mc">취소</button><button class="pink" id="saveAlbum">SAVE</button></div>`);
$("#mx").onclick=closeModal;$("#mc").onclick=closeModal;$("#photo").onclick=()=>$("#coverInput").click();$("#coverInput").onchange=()=>{
  const f=$("#coverInput").files[0]; if(!f)return;
  const formData={name:$("#an").value,artist:$("#aa").value,date:$("#ad").value};
  window.openSquareCropper(f,$("#coverInput"),(dataUrl)=>{
    albumForm(a,dataUrl);
    $("#an").value=formData.name;
    $("#aa").value=formData.artist;
    $("#ad").value=formData.date;
    $("#photo").innerHTML=`<img src="${dataUrl}">`;
  });
};$("#saveAlbum").onclick=()=>{
  const name=$("#an").value.trim();
  if(!name){toast("앨범명을 입력해 주세요.");$("#an").focus();return}
  const data={name,artist:$("#aa").value.trim(),date:$("#ad").value,cover};
  try{
    if(a){
      Object.assign(a,data);
    }else{
      albums.unshift({id:uid(),...data,tracks:[],createdAt:Date.now()});
    }
    save();
    render();
    closeModal();
    toast(a?"앨범을 수정했어요.":"앨범을 만들었어요.");
  }catch(err){
    console.error("Album save failed:",err);
    toast("앨범을 저장하지 못했어요. 저장 공간을 확인해 주세요.");
  }
}}
function albumDetail(a){
  current=a;
  modal(`<div class="modal-head album-detail-head">
    <div><h2>${esc(a.name)}</h2><p class="meta">${esc(a.artist||"")} ${a.date?`· ${esc(a.date)}`:""}</p></div>
    <div class="head-actions"><button class="icon" id="editA" aria-label="앨범 수정">✎</button><button class="icon" id="mx" aria-label="닫기">×</button></div>
  </div>
  ${a.cover?`<div class="detail-cover-wrap"><img class="detail-cover" src="${a.cover}" alt=""></div>`:""}
  <div class="detail-center"><div class="detail-count">${a.tracks.length}곡</div></div>
  <div class="track-list">${a.tracks.length?a.tracks.map((t,i)=>`<div class="track" data-track-row="${i}">
    <div class="track-leading"><span class="track-dot"></span></div>
    <div class="track-main"><div class="track-name">${esc(t.name)}</div><div class="track-time">${fmt(t.duration)}${t.lyrics?.length?" · 가사":""}</div></div>
    <button class="more" data-track="${i}" aria-label="곡 메뉴">•••</button>
  </div>`).join(""):`<p class="meta empty-tracks">아직 노래가 없어요.</p>`}</div>
  <div class="album-detail-actions">
    <button class="glass-btn add-track-small" id="addT"><span>＋</span> 노래 추가</button>
    <button class="pink play-album-large" id="playAll"><span class="play-shape"></span><span>재생</span></button>
  </div>`);
  $("#mx").onclick=closeModal;
  $("#editA").onclick=()=>albumForm(a);
  $("#addT").onclick=()=>trackForm(a);
  $("#playAll").onclick=()=>{if(!a.tracks.length)return toast("먼저 노래를 추가해 주세요.");start(a,a.tracks.map((_,i)=>i),0)};
  $$("[data-track]").forEach(b=>b.onclick=()=>trackActions(a,+b.dataset.track));
  $$("[data-track-row]").forEach(row=>row.onclick=e=>{
    if(e.target.closest("[data-track]"))return;
    const i=+row.dataset.trackRow;
    if(a.tracks[i])start(a,a.tracks.map((_,idx)=>idx),i);
  });
}
function trackForm(a){let file=null,dur=0;modal(`<div class="modal-head"><h2>노래 추가</h2><button class="icon" id="mx">×</button></div><div class="field"><label>노래 제목 *</label><input id="tn" placeholder="노래 제목을 입력하세요"></div><div class="field"><label>음원</label><button class="glass-btn" id="pickSong">MP3 / 음원 불러오기</button><span id="fn" class="meta"></span></div><div class="field"><label>길이(초)</label><input id="td" type="number" min="0" step="1" placeholder="자동 인식"></div><div class="actions"><button class="glass-btn" id="mc">취소</button><button class="pink" id="saveT">SAVE</button></div>`);
$("#mx").onclick=closeModal;$("#mc").onclick=closeModal;$("#pickSong").onclick=()=>$("#songInput").click();$("#songInput").onchange=()=>{file=$("#songInput").files[0];if(!file)return;$("#fn").textContent=" · "+file.name;let u=URL.createObjectURL(file),x=new Audio;x.onloadedmetadata=()=>{$("#td").value=Math.round(x.duration);dur=x.duration;URL.revokeObjectURL(u)};x.src=u};$("#saveT").onclick=async()=>{let name=$("#tn").value.trim();if(!name)return toast("노래 제목을 입력해 주세요.");let d=+$("#td").value||dur||0,key=file?uid():"";if(file)await putFile(key,file);a.tracks.push({id:uid(),name,duration:d,fileKey:key,lyrics:[]});save();albumDetail(a);toast("노래를 추가했어요.")}}
function trackActions(a,i){let t=a.tracks[i];modal(`<div class="modal-head"><h2>${esc(t.name)}</h2><button class="icon" id="mx">×</button></div><p class="meta">${fmt(t.duration)} · ${esc(a.artist||"")}</p><div class="actions"><button class="glass-btn" id="lyricsEdit">가사 편집</button><button class="glass-btn" id="delT">삭제</button><button class="pink" id="playT">재생</button></div>`);$("#mx").onclick=closeModal;$("#playT").onclick=()=>start(a,[i]);$("#delT").onclick=async()=>{await delFile(t.fileKey);a.tracks.splice(i,1);save();albumDetail(a);toast("노래를 삭제했어요.")};$("#lyricsEdit").onclick=()=>lyricsEditor(t)}
function lyricsEditor(t){
  let rows=(t.lyrics||[]).map(x=>({
    start:Number(x.start)||0,
    end:Number(x.end)||0,
    text:(x.text===undefined||x.text===null)?"":String(x.text)
  }));
  if(!rows.length)rows=[{start:0,end:5,text:""}];

  const readRows=()=>{
    rows=$$("#le .lyric-row").map(row=>({
      start:Math.max(0,Number($(".ls",row)?.value)||0),
      end:Math.max(0,Number($(".le",row)?.value)||0),
      text:$(".lt",row)?.value ?? ""
    }));
  };
  const attr=v=>esc(String(v).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"));

  const openEditor=()=>{
    const rowsHTML=rows.map((r,i)=>`<div class="lyric-row" data-i="${i}">
      <input class="ls" type="number" min="0" step=".1" value="${Number(r.start)||0}" placeholder="시작">
      <input class="le" type="number" min="0" step=".1" value="${Number(r.end)||0}" placeholder="끝">
      <input class="lt" value="${attr(r.text)}" placeholder="가사 / 비워두면 ♪">
      <button type="button" data-rm="${i}" aria-label="구간 삭제">×</button>
    </div>`).join("");

    modal(`<div class="modal-head"><h2>가사 편집</h2><button class="icon" id="mx">×</button></div>
      <div class="help"><b>구간별 가사</b><br>시작/끝 시간을 입력하고 가사를 적으세요. 가사를 비워두면 ♪ 간주로 저장됩니다.</div>
      <div class="lyric-editor" id="le">${rowsHTML}</div>
      <div class="actions"><button class="glass-btn" id="addL">＋ 구간</button><button class="pink" id="saveL">SAVE</button></div>`);

    $("#mx").onclick=closeModal;
    $("#addL").onclick=()=>{
      readRows();
      const last=rows[rows.length-1];
      const nextStart=Math.max(0,Number(last?.end)||0);
      rows.push({start:nextStart,end:nextStart+5,text:""});
      openEditor();
    };
    $$("#le [data-rm]").forEach(b=>b.onclick=()=>{
      readRows();
      rows.splice(Number(b.dataset.rm),1);
      if(!rows.length)rows.push({start:0,end:5,text:""});
      openEditor();
    });
    $("#saveL").onclick=()=>{
      readRows();
      t.lyrics=rows.filter(x=>x.end>x.start).sort((a,b)=>a.start-b.start).map(x=>({
        start:x.start,end:x.end,text:x.text===""?" ":x.text
      }));
      save();
      closeModal();
      renderLyrics(t);
      toast("가사를 저장했어요.");
    };
  };
  openEditor();
}
function activeTrack(){return queue[qi]||null}
function updateFavoriteUI(){
  const on=!!activeTrack()?.favorite;
  $("#pFav")?.classList.toggle("active",on);
  $("#miniFav")?.classList.toggle("active",on);
}
function toggleFavorite(){
  const t=activeTrack();
  if(!t||!current){toast("재생 중인 노래가 없어요.");return}
  t.favorite=!t.favorite;
  save();
  updateFavoriteUI();
  if(viewFilter==="fav")render();
  toast(t.favorite?"찜한 노래에 추가했어요.":"찜한 노래에서 뺐어요.");
}
function trackOrAlbumActions(a){
  modal(`<div class="modal-head"><h2>${esc(a.name)}</h2><button class="icon" id="mx">×</button></div>
    <div class="actions">
      <button class="glass-btn" id="op">앨범 열기</button>
      <button class="glass-btn" id="ed">수정</button>
      <button class="glass-btn" id="del">삭제</button>
    </div>`);
  $("#mx").onclick=closeModal;
  $("#op").onclick=()=>albumDetail(a);
  $("#ed").onclick=()=>albumForm(a);
  $("#del").onclick=async()=>{
    if(!confirm("앨범을 삭제할까요?"))return;
    for(const t of a.tracks)await delFile(t.fileKey);
    albums=albums.filter(x=>x.id!==a.id);
    save();render();closeModal();toast("앨범을 삭제했어요.");
  };
}
async function start(a,inds,at=0){
  current=a;
  queue=inds.map(i=>a.tracks[i]).filter(Boolean);
  qi=Math.max(0,Math.min(at,queue.length-1));
  closeModal();
  $("#player").hidden=false;
  $("#mini").hidden=true;
  document.body.style.overflow="hidden";
  if(!queue.length)return;
  await loadTrack(true);
}
async function loadTrack(autoplay=false){
  const t=queue[qi];
  if(!t)return;
  $("#pTitle").textContent=t.name;
  $("#pArtist").textContent=current?.artist||"아티스트";
  $("#frontCover").innerHTML=current?.cover?`<img src="${current.cover}" alt="">`:"";
  renderLyrics(t);
  renderQueue();
  updateFavoriteUI();
  media(t);
  const f=await getFile(t.fileKey);
  if(!f){
    audio.removeAttribute("src");
    setPlaying(false);
    toast("이 곡의 음원 파일을 찾을 수 없어요. 다시 추가해 주세요.");
    return;
  }
  if(audio.src)URL.revokeObjectURL(audio.src);
  const url=URL.createObjectURL(f);
  audio.src=url;
  audio.load();
  if(autoplay){
    try{
      await audio.play();
      setPlaying(true);
    }catch(err){
      setPlaying(false);
      toast("재생 준비가 완료됐어요. 재생 버튼을 눌러 주세요.");
    }
  }else{
    setPlaying(false);
  }
}
function setPlaying(on){
  $("#pToggle").classList.toggle("is-playing",on);
  $("#backDisc").classList.toggle("playing",on);
  $("#frontCover").classList.toggle("playing",on);
  $("#mini").classList.toggle("playing",on);
  $("#miniPlay").classList.toggle("is-playing",on);
  $("#mini").hidden=!on;
  if(on)showMini();
}
function next(){
  if(!queue.length)return;
  if(shuffle){
    if(queue.length===1)qi=0;
    else{let n;do n=Math.floor(Math.random()*queue.length);while(n===qi);qi=n}
  }else if(qi<queue.length-1)qi++;
  else if(repeat)qi=0;
  else{audio.pause();setPlaying(false);return}
  loadTrack(true);
}
function prev(){
  if(!queue.length)return;
  if(audio.currentTime>3){
    audio.currentTime=0;
    return;
  }
  if(qi>0){
    qi--;
  }else if(repeat){
    qi=queue.length-1;
  }else{
    qi=0;
    audio.currentTime=0;
    return;
  }
  loadTrack(true);
}
function showMini(){
  $("#mini").hidden=false;
  const t=queue[qi];
  $("#miniTitle").textContent=t?.name||"—";
  $("#miniArtist").textContent=current?.artist||"—";
  const cover=$("#miniCover");
  if(cover)cover.innerHTML=current?.cover?`<img src="${current.cover}" alt="">`:`<span>♫</span>`;
}
function media(t){
  if(!("mediaSession" in navigator))return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:t.name,
      artist:current?.artist||"MCP",
      album:current?.name||"MY CD PLAYER",
      artwork:current?.cover?[{src:current.cover,sizes:"512x512",type:"image/jpeg"}]:[]
    });
  }catch{}
  const handlers={
    play:()=>{audio.play();setPlaying(true)},
    pause:()=>{audio.pause();setPlaying(false)},
    nexttrack:()=>next(),
    previoustrack:()=>prev(),
    seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-10),
    seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10)
  };
  for(const [n,fn] of Object.entries(handlers)){
    try{navigator.mediaSession.setActionHandler(n,fn)}catch{}
  }
}
function renderLyrics(t){
  const box=$("#lyricsLines"),ls=t?.lyrics||[];
  if(!ls.length){box.innerHTML='<p class="meta" style="text-align:center;padding:20px">등록된 가사가 없어요.</p>';return}
  box.innerHTML=ls.map((l,i)=>{
    const text=String(l.text??"");
    const interlude=!text.trim();
    return `<div class="lyric ${interlude?"interlude":""}" data-lyric="${i}">${interlude?"♪":esc(text)}</div>`;
  }).join("");
}
function renderQueue(){$("#queueList").innerHTML=queue.map((t,i)=>`<div class="queue-item ${i===qi?"active":""}" data-q="${i}"><span class="queue-dot">${i===qi?"●":""}</span><span>${esc(t.name)}<small class="meta"> · ${fmt(t.duration)}</small></span><span class="queue-now">${i===qi?"NOW":""}</span></div>`).join("")}
function queueOpen(){renderQueue();$("#queue").hidden=false}

async function trimToolModal(){
  modal(`<div class="modal-head"><h2>길이 조절기</h2><button class="glass-icon" id="mx">×</button></div>
  <div class="help"><b>원하는 구간만 남기기</b><br>음원을 선택하고 시작/끝 시간을 조절한 뒤 새 파일로 저장할 수 있어요.</div>
  <div class="field"><label>음원</label><button class="glass-btn" id="pickTrim">음원 선택</button><span id="trimName" class="meta"></span></div>
  <div id="trimInfo" class="length hidden">
    <b id="trimDuration">0:00</b>
    <div><label>시작 시간 <span id="trimStartLabel">0:00</span></label><input id="trimStart" type="range" min="0" max="1" step=".01" value="0"></div>
    <div><label>끝 시간 <span id="trimEndLabel">0:00</span></label><input id="trimEnd" type="range" min="0" max="1" step=".01" value="1"></div>
    <p id="trimSelection" class="meta"></p>
  </div>
  <div class="actions"><button class="glass-btn" id="cancelTrim">취소</button><button class="pink" id="saveTrim" disabled>앨범에 저장</button></div>`);
  let file=null,buffer=null;
  $("#mx").onclick=closeModal;$("#cancelTrim").onclick=closeModal;
  $("#pickTrim").onclick=()=>$("#songInput").click();
  $("#songInput").onchange=async()=>{
    file=$("#songInput").files[0]; if(!file)return;
    $("#trimName").textContent=" · "+file.name;
    try{
      const ac=new AudioContext();
      buffer=await ac.decodeAudioData(await file.arrayBuffer());
      await ac.close();
      const d=buffer.duration;
      $("#trimInfo").classList.remove("hidden");
      $("#trimDuration").textContent="전체 "+fmt(d);
      $("#trimStart").max=d;$("#trimStart").value=0;
      $("#trimEnd").max=d;$("#trimEnd").value=d;
      updateTrimLabels();
      $("#saveTrim").disabled=false;
    }catch(e){toast("이 음원을 읽을 수 없어요.")}
  };
  function updateTrimLabels(){
    if(!buffer)return;
    let a=+$("#trimStart").value,b=+$("#trimEnd").value;
    if(a>=b-0.05){if(document.activeElement?.id==="trimStart")$("#trimStart").value=Math.max(0,b-.05);else $("#trimEnd").value=Math.min(buffer.duration,a+.05);a=+$("#trimStart").value;b=+$("#trimEnd").value}
    $("#trimStartLabel").textContent=fmt(a);$("#trimEndLabel").textContent=fmt(b);$("#trimSelection").textContent=`선택 구간 ${fmt(b-a)}`;
  }
  $("#trimStart").oninput=updateTrimLabels;$("#trimEnd").oninput=updateTrimLabels;
  $("#saveTrim").onclick=async()=>{
    if(!buffer)return;
    const a=+$("#trimStart").value,b=+$("#trimEnd").value;
    if(b<=a)return toast("끝 시간은 시작 시간보다 뒤여야 해요.");
    const sample=buffer.sampleRate,channels=buffer.numberOfChannels,len=Math.floor((b-a)*sample);
    const off=new OfflineAudioContext(channels,len,sample),src=off.createBufferSource();
    src.buffer=buffer;src.connect(off.destination);src.start(0,a,b);
    const rendered=await off.startRendering();
    const wav=audioBufferToWav(rendered),blob=new Blob([wav],{type:"audio/wav"});
    const filename=file.name.replace(/\.[^.]+$/,"")+"_trimmed.wav";
    const downloadBtn=document.createElement("button");
    downloadBtn.className="glass-btn";downloadBtn.textContent="파일로 저장";
    downloadBtn.onclick=()=>downloadBlob(blob,filename);
    $("#saveTrim").parentElement.insertBefore(downloadBtn,$("#saveTrim"));
    const key=uid();await putFile(key,blob);
    if(current){
      current.tracks.push({id:uid(),name:file.name.replace(/\.[^.]+$/,"")+" (trimmed)",duration:b-a,fileKey:key,lyrics:[],favorite:false});
      save();render();closeModal();toast("잘라낸 음원을 앨범에 추가했어요.");
    }else{
      const a=albums[0];
      if(a){a.tracks.push({id:uid(),name:file.name.replace(/\.[^.]+$/,"")+" (trimmed)",duration:b-a,fileKey:key,lyrics:[],favorite:false});save();render();closeModal();toast("잘라낸 음원을 첫 번째 앨범에 추가했어요.")}
      else {closeModal();toast("앨범을 먼저 만들어 주세요.")}
    }
  };
}
function audioBufferToWav(buffer){
  const ch=buffer.numberOfChannels,len=buffer.length,bytes=44+len*ch*2,out=new ArrayBuffer(bytes),v=new DataView(out),rate=buffer.sampleRate;
  let p=0;const w=(s)=>{for(let i=0;i<s.length;i++)v.setUint8(p++,s.charCodeAt(i))};
  w("RIFF");v.setUint32(p,36+len*ch*2,true);p+=4;w("WAVE");w("fmt ");v.setUint32(p,16,true);p+=4;v.setUint16(p,1,true);p+=2;v.setUint16(p,ch,true);p+=2;v.setUint32(p,rate,true);p+=4;v.setUint32(p,rate*ch*2,true);p+=4;v.setUint16(p,ch*2,true);p+=2;v.setUint16(p,16,true);p+=2;w("data");v.setUint32(p,len*ch*2,true);p+=4;
  const data=[];for(let c=0;c<ch;c++)data.push(buffer.getChannelData(c));
  for(let i=0;i<len;i++)for(let c=0;c<ch;c++){let x=Math.max(-1,Math.min(1,data[c][i]));v.setInt16(p,x<0?x*32768:x*32767,true);p+=2}
  return out;
}

function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function convertModal(){modal(`<div class="modal-head"><h2>MP3 변환</h2><button class="icon" id="mx">×</button></div><div class="help">동영상 파일에서 오디오를 추출해 MP3로 변환합니다. 변환이 끝나면 현재 앨범에 바로 추가할 수 있어요.</div><button class="glass-btn" id="pickVideo">동영상 선택</button><p id="videoName" class="meta"></p><div class="convert-progress"><div class="convert-bar"><i id="bar"></i></div><div class="convert-pct" id="pct">0%</div></div><div class="actions"><button class="glass-btn" id="cancelC">취소</button><button class="pink" id="doConvert" disabled>MP3로 변환</button></div>`);let video=null;$("#mx").onclick=closeModal;$("#cancelC").onclick=closeModal;$("#pickVideo").onclick=()=>$("#videoInput").click();$("#videoInput").onchange=()=>{video=$("#videoInput").files[0];if(video){$("#videoName").textContent=video.name;$("#doConvert").disabled=false}};$("#doConvert").onclick=async()=>{if(!video)return;try{await convertVideo(video)}catch(e){console.error(e);toast("이 파일은 변환할 수 없어요.")}}}
async function convertVideo(file){let btn=$("#doConvert"),bar=$("#bar"),pct=$("#pct");btn.disabled=true;btn.textContent="변환 중…";let ac=new AudioContext();let ab=await file.arrayBuffer();let decoded=await ac.decodeAudioData(ab);let rate=decoded.sampleRate,channels=Math.min(2,decoded.numberOfChannels),len=decoded.length;let enc=new lamejs.Mp3Encoder(channels,rate,128),chunks=[],block=1152;for(let i=0;i<len;i+=block){let left=decoded.getChannelData(0).subarray(i,Math.min(i+block,len)),right=channels===2?decoded.getChannelData(1).subarray(i,Math.min(i+block,len)):left;let L=new Int16Array(left.length),R=new Int16Array(right.length);for(let j=0;j<left.length;j++){L[j]=Math.max(-1,Math.min(1,left[j]))*32767;R[j]=Math.max(-1,Math.min(1,right[j]))*32767}let mp=channels===2?enc.encodeBuffer(L,R):enc.encodeBuffer(L);if(mp.length)chunks.push(new Int8Array(mp));let p=Math.min(100,Math.round(i/len*100));bar.style.width=p+"%";pct.textContent=p+"%";await new Promise(r=>setTimeout(r,0))}let end=enc.flush();if(end.length)chunks.push(new Int8Array(end));let blob=new Blob(chunks,{type:"audio/mpeg"});let url=URL.createObjectURL(blob);bar.style.width="100%";pct.textContent="100%";btn.textContent="변환 완료";btn.disabled=true;
const filename=(file.name.replace(/\.[^.]+$/,"")||"converted")+".mp3";
const target=current||albums[0];
$("#modal .modal-card").innerHTML=`<div class="modal-head"><h2>MP3 변환 완료</h2><button class="icon" id="mx">×</button></div>
<div class="mp3-done-card"><div class="mp3-done-icon">MP3</div><div><b>${esc(filename)}</b><span>변환이 완료됐어요.</span></div></div>
<div class="mp3-save-note">이제 저장할 곳을 선택하세요.</div>
<div class="actions mp3-save-actions"><button class="glass-btn" id="saveFileNow">파일에 저장</button><button class="pink" id="saveAlbumNow" ${target?"":"disabled"}>앨범에 저장</button></div>`;
$("#mx").onclick=closeModal;
$("#saveFileNow").onclick=()=>downloadBlob(blob,filename);
$("#saveAlbumNow").onclick=async()=>{
  if(!target){toast("먼저 앨범을 만들어 주세요.");return}
  let name=file.name.replace(/\.[^.]+$/,"")||"변환된 노래",key=uid();
  await putFile(key,blob);target.tracks??=[];target.tracks.push({id:uid(),name,duration:decoded.duration,fileKey:key,lyrics:[]});save();URL.revokeObjectURL(url);closeModal();render();toast(`“${target.name}”에 MP3를 저장했어요.`)
};
await ac.close()}
$("#heroAdd").onclick=()=>albumForm();$("#favHeroBtn").onclick=()=>{$("[data-filter=\"fav\"]")?.click()};$("#emptyAdd").onclick=()=>albumForm();$("#fab").onclick=()=>albumForm();$("#homeBtn").onclick=()=>{closeModal();$("#player").hidden=true;document.body.style.overflow=""};$("#albumGrid").onclick=e=>{let m=e.target.closest("[data-more]");if(m){let a=albums.find(x=>x.id===m.dataset.more);modal(`<div class="modal-head"><h2>${esc(a.name)}</h2><button class="icon" id="mx">×</button></div><div class="actions"><button class="glass-btn" id="op">앨범 열기</button><button class="glass-btn" id="ed">수정</button><button class="glass-btn" id="del">삭제</button></div>`);$("#mx").onclick=closeModal;$("#op").onclick=()=>albumDetail(a);$("#ed").onclick=()=>albumForm(a);$("#del").onclick=async()=>{if(!confirm("앨범을 삭제할까요?"))return;for(let t of a.tracks)await delFile(t.fileKey);albums=albums.filter(x=>x.id!==a.id);save();render();closeModal();toast("앨범을 삭제했어요.")}}else{let c=e.target.closest("[data-id]");if(c)albumDetail(albums.find(x=>x.id===c.dataset.id))}};
$("#playerClose").onclick=()=>{
  $("#player").hidden=true;
  document.body.style.overflow="";
  $("#mini").hidden=false;
  showMini();
  if(!audio.paused)setPlaying(true);
};
$("#miniMain").onclick=()=>{
  $("#player").hidden=false;
  document.body.style.overflow="hidden";
  if(!audio.paused)setPlaying(true);
};
$("#pFav").onclick=toggleFavorite;$("#miniFav").onclick=toggleFavorite;$("#miniPrev").onclick=prev;
$("#miniNext").onclick=next;
$("#miniPlay").onclick=()=>$("#pToggle").click();
$("#pToggle").onclick=()=>{if(audio.paused){audio.play();setPlaying(true)}else{audio.pause();setPlaying(false)}};
$("#pNext").onclick=()=>{if(!queue.length)return;const b=$("#pNext");b.classList.remove("arrow-shift");void b.offsetWidth;b.classList.add("arrow-shift");setTimeout(next,120)};
$("#pPrev").onclick=prev;
$("#pShuffle").onclick=()=>{shuffle=!shuffle;$("#pShuffle").classList.toggle("active",shuffle);};
$("#pRepeat").onclick=()=>{repeat=!repeat;$("#pRepeat").classList.toggle("active",repeat);};$("#seek").oninput=()=>{if(audio.duration)audio.currentTime=audio.duration*$("#seek").value/100};audio.onerror=()=>{if(queue.length)toast("음원을 재생할 수 없어요. 파일을 다시 추가해 주세요.")};
audio.ontimeupdate=()=>{if(!audio.duration)return;let t=queue[qi],ls=t?.lyrics||[];$("#seek").value=audio.currentTime/audio.duration*100;$("#pCur").textContent=fmt(audio.currentTime);$("#pRemain").textContent="-"+fmt(audio.duration-audio.currentTime);$("#miniRemain").textContent=fmt(audio.duration-audio.currentTime);$$("[data-lyric]").forEach((el,i)=>el.classList.toggle("active",audio.currentTime>=ls[i].start&&audio.currentTime<ls[i].end));let active=$(".lyric.active");if(active)active.scrollIntoView({behavior:"smooth",block:"center"})};audio.onplay=()=>setPlaying(true);audio.onpause=()=>setPlaying(false);audio.onended=next;
$("#queueBtn").onclick=queueOpen;$("#closeQueue").onclick=()=>$("#queue").hidden=true;$("#queueList").onclick=e=>{let x=e.target.closest("[data-q]");if(x){qi=+x.dataset.q;$("#queue").hidden=true;loadTrack()}};$("#lyricsBtn").onclick=()=>$("#lyrics").scrollIntoView({behavior:"smooth"});$("#editLyrics").onclick=()=>queue[qi]&&lyricsEditor(queue[qi]);$("#homeMp3Tool").onclick=convertModal;$("#homeTrimTool").onclick=trimToolModal;
$("#searchBtn").onclick=()=>{let q=prompt("앨범 또는 곡 검색");if(q===null)return;let n=albums.filter(a=>a.name.includes(q)||a.artist?.includes(q)||a.tracks.some(t=>t.name.includes(q))).length;toast(n?`${n}개의 앨범에서 찾았어요.`:"검색 결과가 없어요.")};
load();$$("[data-filter]").forEach(b=>b.onclick=()=>{viewFilter=b.dataset.filter;$$("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));render()});
render();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js?v=FINAL_01").catch(()=>{});setTimeout(()=>{$("#splash").style.opacity=0;setTimeout(()=>$("#splash")?.remove(),600)},1450);
})();


/* MCP FINAL — working 1:1 album cover cropper */
window.openSquareCropper=function(file,input,onDone){
  const root=document.getElementById("modal");
  const url=URL.createObjectURL(file);
  root.innerHTML=`<div class="modal-bg crop-modal-bg">
    <section class="modal-card crop-modal-card">
      <div class="modal-head"><h2>앨범 사진 자르기</h2><button class="icon" id="cropClose">×</button></div>
      <div class="crop-help">정사각형 안에 들어갈 부분을 드래그하세요. 확대/축소도 가능합니다.</div>
      <div class="crop-stage" id="cropStage"><img id="cropImg" src="${url}" draggable="false"></div>
      <div class="crop-controls">
        <button class="glass-btn" id="cropMinus">−</button>
        <input id="cropZoom" type="range" min="1" max="3" step=".01" value="1">
        <button class="glass-btn" id="cropPlus">＋</button>
      </div>
      <div class="actions"><button class="glass-btn" id="cropCancel">취소</button><button class="pink" id="cropDone">1:1 적용</button></div>
    </section>
  </div>`;

  const stage=root.querySelector("#cropStage"),img=root.querySelector("#cropImg"),zoom=root.querySelector("#cropZoom");
  let scale=1,x=0,y=0,drag=false,sx=0,sy=0;

  function fit(){
    if(!img.naturalWidth)return;
    const side=stage.clientWidth;
    const base=Math.max(side/img.naturalWidth,side/img.naturalHeight);
    const sc=base*scale,w=img.naturalWidth*sc,h=img.naturalHeight*sc;
    const maxX=Math.max(0,(w-side)/2),maxY=Math.max(0,(h-side)/2);
    x=Math.max(-maxX,Math.min(maxX,x));y=Math.max(-maxY,Math.min(maxY,y));
    img.style.width=w+"px";img.style.height=h+"px";
    img.style.left=((side-w)/2+x)+"px";img.style.top=((side-h)/2+y)+"px";
  }
  img.onload=()=>{scale=1;zoom.value=1;fit()};
  const close=()=>{URL.revokeObjectURL(url);root.innerHTML="";document.body.classList.remove("modal-open")};
  root.querySelector("#cropClose").onclick=close;
  root.querySelector("#cropCancel").onclick=close;
  zoom.oninput=()=>{scale=Number(zoom.value);fit()};
  root.querySelector("#cropMinus").onclick=()=>{scale=Math.max(1,scale-.1);zoom.value=scale;fit()};
  root.querySelector("#cropPlus").onclick=()=>{scale=Math.min(3,scale+.1);zoom.value=scale;fit()};

  stage.onpointerdown=e=>{
    drag=true;stage.setPointerCapture(e.pointerId);
    sx=e.clientX-x;sy=e.clientY-y;
  };
  stage.onpointermove=e=>{if(drag){x=e.clientX-sx;y=e.clientY-sy;fit()}};
  stage.onpointerup=()=>drag=false;
  stage.onpointercancel=()=>drag=false;

  root.querySelector("#cropDone").onclick=()=>{
    const side=stage.clientWidth;
    const canvas=document.createElement("canvas");
    canvas.width=1024;canvas.height=1024;
    const ctx=canvas.getContext("2d");
    const base=Math.max(side/img.naturalWidth,side/img.naturalHeight);
    const sc=base*scale;
    const w=img.naturalWidth*sc,h=img.naturalHeight*sc;
    const left=(side-w)/2+x,top=(side-h)/2+y;
    ctx.drawImage(img,left*1024/side,top*1024/side,w*1024/side,h*1024/side);
    canvas.toBlob(blob=>{
      if(!blob)return;
      const cropped=new File([blob],"album-cover.jpg",{type:"image/jpeg"});
      const dt=new DataTransfer();dt.items.add(cropped);
      input.files=dt.files;
      const reader=new FileReader();
      reader.onload=()=>{
        close();
        onDone(reader.result);
      };
      reader.readAsDataURL(cropped);
      const toast=document.createElement("div");
      toast.className="toast";toast.textContent="1:1 앨범 사진 적용 완료";document.body.append(toast);
      setTimeout(()=>toast.remove(),1800);
    },"image/jpeg",.92);
  };
};
