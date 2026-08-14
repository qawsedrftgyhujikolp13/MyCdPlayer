(()=>{const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const DB="mcp30",STORE="files",KEY="mcp30_albums";let albums=[],current=null,queue=[],qi=0,shuffle=false,repeat=false,themeMode="auto";
const audio=$("#audio");const uid=()=>crypto.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2);const fmt=n=>{n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0")};const esc=s=>(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(t){let e=document.createElement("div");e.className="toast";e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2100)}
function load(){try{albums=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{albums=[]}albums.forEach(a=>{a.tracks??=[]})}
function save(){localStorage.setItem(KEY,JSON.stringify(albums))}
function openDB(){return new Promise((ok,no)=>{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function putFile(k,f){let d=await openDB();return new Promise((ok,no)=>{let t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(f,k);t.oncomplete=ok;t.onerror=()=>no(t.error)})}
async function getFile(k){if(!k)return null;let d=await openDB();return new Promise((ok,no)=>{let r=d.transaction(STORE).objectStore(STORE).get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function delFile(k){if(!k)return;let d=await openDB();d.transaction(STORE,"readwrite").objectStore(STORE).delete(k)}
function render(){let list=[...albums].sort((a,b)=>a.name.localeCompare(b.name,"ko",{sensitivity:"base"}));$("#albumCount").textContent=`${list.length} ALBUM${list.length===1?"":"S"}`;$("#empty").style.display=list.length?"none":"flex";$("#albumGrid").innerHTML=list.map((a,i)=>`<article class="album-card" data-id="${a.id}" style="animation-delay:${i*45}ms"><div class="album-cover">${a.cover?`<img src="${a.cover}">`:"♫"}</div><div><h3>${esc(a.name)}</h3><div class="meta">${esc(a.artist||"아티스트 미입력")} · ${esc(a.date||"발매일 미입력")}</div><div class="meta">${a.tracks.length}곡</div></div><button class="more" data-more="${a.id}">•••</button></article>`).join("")}
function modal(body){$("#mini").hidden=true;document.body.classList.add("modal-open");$("#modal").innerHTML=`<div class="modal-bg"><section class="modal-card">${body}</section></div>`;$(".modal-bg").onclick=e=>{if(e.target===e.currentTarget)closeModal()}}
function closeModal(){$("#modal").innerHTML="";document.body.classList.remove("modal-open");if(!audio.paused&&queue.length)showMini()}
function albumForm(a=null){let cover=a?.cover||"";modal(`<div class="modal-head"><h2>${a?"앨범 수정":"새 앨범"}</h2><button class="icon" id="mx">×</button></div><div class="field"><label>앨범명 *</label><input id="an" placeholder="앨범명을 입력하세요" value="${esc(a?.name)}"></div><div class="field"><label>가수명</label><input id="aa" placeholder="가수명을 입력하세요" value="${esc(a?.artist)}"></div><div class="field"><label>발매일</label><input id="ad" type="date" value="${a?.date||""}"></div><div class="field"><label>앨범 표지</label><div class="photo" id="photo">${cover?`<img src="${cover}">`:"📸 사진을 넣어주세요"}</div></div><div class="actions"><button class="glass-btn" id="mc">취소</button><button class="pink" id="saveAlbum">SAVE</button></div>`);
$("#mx").onclick=closeModal;$("#mc").onclick=closeModal;$("#photo").onclick=()=>$("#coverInput").click();$("#coverInput").onchange=()=>{let f=$("#coverInput").files[0];if(!f)return;let r=new FileReader;r.onload=()=>{cover=r.result;$("#photo").innerHTML=`<img src="${cover}">`};r.readAsDataURL(f)};$("#saveAlbum").onclick=()=>{let name=$("#an").value.trim();if(!name)return toast("앨범명을 입력해 주세요.");if(a)Object.assign(a,{name,artist:$("#aa").value.trim(),date:$("#ad").value,cover});else albums.push({id:uid(),name,artist:$("#aa").value.trim(),date:$("#ad").value,cover,tracks:[]});save();render();closeModal();toast(a?"앨범을 수정했어요.":"앨범을 만들었어요.")}}
function albumDetail(a){current=a;modal(`<div class="modal-head"><h2>${esc(a.name)}</h2><button class="icon" id="mx">×</button></div>${a.cover?`<img class="detail-cover" src="${a.cover}">`:""}<div class="detail-center"><h2>${esc(a.name)}</h2><p>${esc(a.artist||"")} · ${esc(a.date||"")}</p></div><div>${a.tracks.length?a.tracks.map((t,i)=>`<div class="track"><div class="track-no">${i+1}</div><div><div class="track-name">${esc(t.name)}</div><div class="track-time">${fmt(t.duration)}${t.lyrics?.length?" · 가사":""}</div></div><button class="more" data-track="${i}">•••</button></div>`).join(""):`<p class="meta" style="text-align:center">아직 노래가 없어요.</p>`}</div><div class="actions"><button class="glass-btn" id="editA">수정</button><button class="pink" id="addT">＋ 노래 추가</button></div>`);
$("#mx").onclick=closeModal;$("#editA").onclick=()=>albumForm(a);$("#addT").onclick=()=>trackForm(a);$$("[data-track]").forEach(b=>b.onclick=()=>trackActions(a,+b.dataset.track))}
function trackForm(a){let file=null,dur=0;modal(`<div class="modal-head"><h2>노래 추가</h2><button class="icon" id="mx">×</button></div><div class="field"><label>노래 제목 *</label><input id="tn" placeholder="노래 제목을 입력하세요"></div><div class="field"><label>음원</label><button class="glass-btn" id="pickSong">MP3 / 음원 불러오기</button><span id="fn" class="meta"></span></div><div class="field"><label>길이(초)</label><input id="td" type="number" min="0" step="1" placeholder="자동 인식"></div><div class="actions"><button class="glass-btn" id="mc">취소</button><button class="pink" id="saveT">SAVE</button></div>`);
$("#mx").onclick=closeModal;$("#mc").onclick=closeModal;$("#pickSong").onclick=()=>$("#songInput").click();$("#songInput").onchange=()=>{file=$("#songInput").files[0];if(!file)return;$("#fn").textContent=" · "+file.name;let u=URL.createObjectURL(file),x=new Audio;x.onloadedmetadata=()=>{$("#td").value=Math.round(x.duration);dur=x.duration;URL.revokeObjectURL(u)};x.src=u};$("#saveT").onclick=async()=>{let name=$("#tn").value.trim();if(!name)return toast("노래 제목을 입력해 주세요.");let d=+$("#td").value||dur||0,key=file?uid():"";if(file)await putFile(key,file);a.tracks.push({id:uid(),name,duration:d,fileKey:key,lyrics:[]});save();albumDetail(a);toast("노래를 추가했어요.")}}
function trackActions(a,i){let t=a.tracks[i];modal(`<div class="modal-head"><h2>${esc(t.name)}</h2><button class="icon" id="mx">×</button></div><p class="meta">${fmt(t.duration)} · ${esc(a.artist||"")}</p><div class="actions"><button class="glass-btn" id="lyricsEdit">가사 편집</button><button class="glass-btn" id="delT">삭제</button><button class="pink" id="playT">재생</button></div>`);$("#mx").onclick=closeModal;$("#playT").onclick=()=>start(a,[i]);$("#delT").onclick=async()=>{await delFile(t.fileKey);a.tracks.splice(i,1);save();albumDetail(a);toast("노래를 삭제했어요.")};$("#lyricsEdit").onclick=()=>lyricsEditor(t)}
function lyricsEditor(t){let rows=(t.lyrics||[]).map(x=>({...x}));if(!rows.length)rows=[{start:0,end:5,text:""}];const rowsHTML=()=>rows.map((r,i)=>`<div class="lyric-row" data-i="${i}"><input class="ls" type="number" min="0" step=".1" value="${r.start}" placeholder="시작"><input class="le" type="number" min="0" step=".1" value="${r.end}" placeholder="끝"><input class="lt" value="${r.text===" "?"":esc(r.text)}" placeholder="가사 / 공백=♪"><button data-rm="${i}">×</button></div>`).join("");modal(`<div class="modal-head"><h2>가사 편집</h2><button class="icon" id="mx">×</button></div><div class="help"><b>예시</b> 12초 → 16초 → 안녕 오늘도<br>가사 칸을 비워 저장하면 그 구간은 <b>♪ 간주</b>가 됩니다.</div><div class="lyric-editor" id="le">${rowsHTML()}</div><div class="actions"><button class="glass-btn" id="addL">＋ 구간</button><button class="pink" id="saveL">SAVE</button></div>`);$("#mx").onclick=closeModal;$("#addL").onclick=()=>{rows.push({start:0,end:5,text:""});lyricsEditor(t)};$$("[data-rm]").forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.rm,1);lyricsEditor(t)});$("#saveL").onclick=()=>{$$("[data-i]").forEach(row=>{let i=+row.dataset.i;rows[i]={start:+$(".ls",row).value||0,end:+$(".le",row).value||0,text:$(".lt",row).value.trim()||" "}});t.lyrics=rows.filter(x=>x.end>=x.start).sort((a,b)=>a.start-b.start);save();closeModal();renderLyrics(t);toast("가사를 저장했어요.")}}
async function start(a,inds,at=0){current=a;queue=inds.map(i=>a.tracks[i]).filter(Boolean);qi=at;closeModal();$("#player").hidden=false;$("#mini").hidden=true;document.body.style.overflow="hidden";await loadTrack()}
async function loadTrack(){let t=queue[qi];if(!t)return;$("#pTitle").textContent=t.name;$("#pArtist").textContent=current.artist||"아티스트";$("#pAlbum").textContent=current.name;$("#pCounter").textContent=`${qi+1} / ${queue.length}`;$("#frontCover").innerHTML=current.cover?`<img src="${current.cover}">`:"";renderLyrics(t);renderQueue();let f=await getFile(t.fileKey);if(f){if(audio.src)URL.revokeObjectURL(audio.src);audio.src=URL.createObjectURL(f);audio.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false))}else{audio.removeAttribute("src");setPlaying(false)}media(t)}
function setPlaying(on){$("#pToggle").textContent=on?"Ⅱ":"▶";$("#backDisc").classList.toggle("playing",on);$("#mini").classList.toggle("playing",on);$("#miniPlay").textContent=on?"Ⅱ":"▶";$("#mini").hidden=!on;if(on)showMini()}
function next(){if(!queue.length)return;if(shuffle)qi=Math.floor(Math.random()*queue.length);else if(qi<queue.length-1)qi++;else if(repeat)qi=0;else{setPlaying(false);return}loadTrack()}
function prev(){if(audio.currentTime>4){audio.currentTime=0;return}qi=(qi-1+queue.length)%queue.length;loadTrack()}
function showMini(){$("#mini").hidden=false;$("#miniTitle").textContent=queue[qi]?.name||"—";$("#miniArtist").textContent=current?.artist||"—"}
function media(t){if(!("mediaSession"in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:t.name,artist:current.artist||"MCP",album:current.name,artwork:current.cover?[{src:current.cover,sizes:"512x512",type:"image/png"}]:[]});for(const [n,fn] of Object.entries({play:()=>audio.play(),pause:()=>audio.pause(),nexttrack:next,previoustrack:prev,seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-10),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10)})){try{navigator.mediaSession.setActionHandler(n,fn)}catch{}}}
function renderLyrics(t){let box=$("#lyricsLines"),ls=t?.lyrics||[];if(!ls.length){box.innerHTML='<p class="meta" style="text-align:center;padding:20px">등록된 가사가 없어요.</p>';return}box.innerHTML=ls.map((l,i)=>`<div class="lyric ${l.text===" "?"interlude":""}" data-lyric="${i}">${l.text===" "?"♪":esc(l.text)}</div>`).join("")}
function renderQueue(){$("#queueList").innerHTML=queue.map((t,i)=>`<div class="queue-item ${i===qi?"active":""}" data-q="${i}"><b>${i+1}</b><span>${esc(t.name)}<small class="meta"> · ${fmt(t.duration)}</small></span><span>${i===qi?"●":""}</span></div>`).join("")}
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
  <div class="actions"><button class="glass-btn" id="cancelTrim">취소</button><button class="pink-btn" id="saveTrim" disabled>구간 저장</button></div>`);
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
    if(a>=b-0.05){if(event?.target?.id==="trimStart")$("#trimStart").value=Math.max(0,b-.05);else $("#trimEnd").value=Math.min(buffer.duration,a+.05);a=+$("#trimStart").value;b=+$("#trimEnd").value}
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
    const key=uid();await putFile(key,blob);
    if(current){
      current.tracks.push({id:uid(),name:file.name.replace(/\.[^.]+$/,"")+" (trimmed)",duration:b-a,fileKey:key,lyrics:[],favorite:false});
      saveLib();render();closeModal();toast("잘라낸 음원을 현재 앨범에 추가했어요.");
    }else{
      const a=albums[0];
      if(a){a.tracks.push({id:uid(),name:file.name.replace(/\.[^.]+$/,"")+" (trimmed)",duration:b-a,fileKey:key,lyrics:[],favorite:false});saveLib();render();closeModal();toast("첫 번째 앨범에 추가했어요.")}
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

function convertModal(){modal(`<div class="modal-head"><h2>MP3 변환</h2><button class="icon" id="mx">×</button></div><div class="help">동영상 파일에서 오디오를 추출해 MP3로 변환합니다. 변환이 끝나면 현재 앨범에 바로 추가할 수 있어요.</div><button class="glass-btn" id="pickVideo">동영상 선택</button><p id="videoName" class="meta"></p><div class="convert-progress"><div class="convert-bar"><i id="bar"></i></div><div class="convert-pct" id="pct">0%</div></div><div class="actions"><button class="glass-btn" id="cancelC">취소</button><button class="pink" id="doConvert" disabled>MP3로 변환</button></div>`);let video=null;$("#mx").onclick=closeModal;$("#cancelC").onclick=closeModal;$("#pickVideo").onclick=()=>$("#videoInput").click();$("#videoInput").onchange=()=>{video=$("#videoInput").files[0];if(video){$("#videoName").textContent=video.name;$("#doConvert").disabled=false}};$("#doConvert").onclick=async()=>{if(!video)return;try{await convertVideo(video)}catch(e){console.error(e);toast("이 파일은 변환할 수 없어요.")}}}
async function convertVideo(file){let btn=$("#doConvert"),bar=$("#bar"),pct=$("#pct");btn.disabled=true;btn.textContent="변환 중…";let ac=new AudioContext();let ab=await file.arrayBuffer();let decoded=await ac.decodeAudioData(ab);let rate=decoded.sampleRate,channels=Math.min(2,decoded.numberOfChannels),len=decoded.length;let enc=new lamejs.Mp3Encoder(channels,rate,128),chunks=[],block=1152;for(let i=0;i<len;i+=block){let left=decoded.getChannelData(0).subarray(i,Math.min(i+block,len)),right=channels===2?decoded.getChannelData(1).subarray(i,Math.min(i+block,len)):left;let L=new Int16Array(left.length),R=new Int16Array(right.length);for(let j=0;j<left.length;j++){L[j]=Math.max(-1,Math.min(1,left[j]))*32767;R[j]=Math.max(-1,Math.min(1,right[j]))*32767}let mp=channels===2?enc.encodeBuffer(L,R):enc.encodeBuffer(L);if(mp.length)chunks.push(new Int8Array(mp));let p=Math.min(100,Math.round(i/len*100));bar.style.width=p+"%";pct.textContent=p+"%";await new Promise(r=>setTimeout(r,0))}let end=enc.flush();if(end.length)chunks.push(new Int8Array(end));let blob=new Blob(chunks,{type:"audio/mpeg"});let url=URL.createObjectURL(blob);bar.style.width="100%";pct.textContent="100%";btn.textContent="저장 / 앨범에 추가";btn.disabled=false;btn.onclick=async()=>{let name=file.name.replace(/\.[^.]+$/,"")||"변환된 노래";let key=uid();await putFile(key,blob);current.tracks.push({id:uid(),name,duration:decoded.duration,fileKey:key,lyrics:[]});save();URL.revokeObjectURL(url);closeModal();toast("MP3를 앨범에 저장했어요.")};await ac.close()}
$("#heroAdd").onclick=()=>albumForm();$("#emptyAdd").onclick=()=>albumForm();$("#fab").onclick=()=>albumForm();$("#homeBtn").onclick=()=>{closeModal();$("#player").hidden=true;document.body.style.overflow=""};$("#albumGrid").onclick=e=>{let m=e.target.closest("[data-more]");if(m){let a=albums.find(x=>x.id===m.dataset.more);modal(`<div class="modal-head"><h2>${esc(a.name)}</h2><button class="icon" id="mx">×</button></div><div class="actions"><button class="glass-btn" id="op">앨범 열기</button><button class="glass-btn" id="ed">수정</button><button class="glass-btn" id="del">삭제</button></div>`);$("#mx").onclick=closeModal;$("#op").onclick=()=>albumDetail(a);$("#ed").onclick=()=>albumForm(a);$("#del").onclick=async()=>{if(!confirm("앨범을 삭제할까요?"))return;for(let t of a.tracks)await delFile(t.fileKey);albums=albums.filter(x=>x.id!==a.id);save();render();closeModal();toast("앨범을 삭제했어요.")}}else{let c=e.target.closest("[data-id]");if(c)albumDetail(albums.find(x=>x.id===c.dataset.id))}};
$("#playerClose").onclick=()=>{$("#player").hidden=true;audio.pause();setPlaying(false);document.body.style.overflow=""};$("#miniMain").onclick=()=>$("#player").hidden=false;$("#miniPrev").onclick=prev;$("#miniNext").onclick=next;$("#miniPlay").onclick=()=>$("#pToggle").click();$("#pToggle").onclick=()=>{if(audio.paused){audio.play();setPlaying(true)}else{audio.pause();setPlaying(false)}};$("#pNext").onclick=next;$("#pPrev").onclick=prev;$("#pShuffle").onclick=()=>{shuffle=!shuffle;$("#pShuffle").style.color=shuffle?"var(--pink)":"#fff"};$("#pRepeat").onclick=()=>{repeat=!repeat;$("#pRepeat").style.color=repeat?"var(--pink)":"#fff"};$("#seek").oninput=()=>{if(audio.duration)audio.currentTime=audio.duration*$("#seek").value/100};audio.ontimeupdate=()=>{if(!audio.duration)return;let t=queue[qi],ls=t?.lyrics||[];$("#seek").value=audio.currentTime/audio.duration*100;$("#pCur").textContent=fmt(audio.currentTime);$("#pRemain").textContent="-"+fmt(audio.duration-audio.currentTime);$("#miniRemain").textContent=fmt(audio.duration-audio.currentTime);$$("[data-lyric]").forEach((el,i)=>el.classList.toggle("active",audio.currentTime>=ls[i].start&&audio.currentTime<ls[i].end));let active=$(".lyric.active");if(active)active.scrollIntoView({behavior:"smooth",block:"center"})};audio.onplay=()=>setPlaying(true);audio.onpause=()=>setPlaying(false);audio.onended=next;
$("#queueBtn").onclick=queueOpen;$("#closeQueue").onclick=()=>$("#queue").hidden=true;$("#queueList").onclick=e=>{let x=e.target.closest("[data-q]");if(x){qi=+x.dataset.q;$("#queue").hidden=true;loadTrack()}};$("#lyricsBtn").onclick=()=>$("#lyrics").scrollIntoView({behavior:"smooth"});$("#editLyrics").onclick=()=>queue[qi]&&lyricsEditor(queue[qi]);$("#convertBtn").onclick=convertModal;$("#homeMp3Tool").onclick=convertModal;$("#homeTrimTool").onclick=trimToolModal;
$("#searchBtn").onclick=()=>{let q=prompt("앨범 또는 곡 검색");if(q===null)return;let n=albums.filter(a=>a.name.includes(q)||a.artist?.includes(q)||a.tracks.some(t=>t.name.includes(q))).length;toast(n?`${n}개의 앨범에서 찾았어요.`:"검색 결과가 없어요.")};
load();render();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js?v=33").catch(()=>{});setTimeout(()=>{$("#splash").style.opacity=0;setTimeout(()=>$("#splash")?.remove(),600)},1450);
})();