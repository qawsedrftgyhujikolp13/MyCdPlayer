const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const DB="mcp20", STORE="files", KEY="library"; let albums=[],current=null,queue=[],qi=0,shuffle=false,repeat=false,sortMode=0;
const audio=$("#audio");
const id=()=>crypto.randomUUID?.()||Date.now()+Math.random().toString(36);
const fmt=n=>{n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+":"+String(n%60).padStart(2,"0")};
const esc=s=>(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function putFile(key,file){if(!file)return;const d=await db();return new Promise((res,rej)=>{const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).put(file,key);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
async function getFile(key){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(STORE);const r=t.objectStore(STORE).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function delFile(key){if(!key)return;const d=await db();const t=d.transaction(STORE,"readwrite");t.objectStore(STORE).delete(key)}
function load(){try{albums=JSON.parse(localStorage.getItem("mcp20_albums")||"[]")}catch{albums=[]}}
function persist(){localStorage.setItem("mcp20_albums",JSON.stringify(albums))}
function toast(x){const e=document.createElement("div");e.className="toast";e.textContent=x;document.body.append(e);setTimeout(()=>e.remove(),2000)}
function render(){let a=[...albums].sort((x,y)=>x.name.localeCompare(y.name,"ko",{sensitivity:"base"}));$("#albumCount").textContent=`${a.length} ALBUM${a.length===1?"":"S"}`;$("#empty").style.display=a.length?"none":"flex";$("#grid").innerHTML=a.map(x=>`<article class="album" data-id="${x.id}"><div class="cover">${x.cover?`<img src="${x.cover}">`:"♫"}</div><div><h3>${esc(x.name)}</h3><div class="meta">${esc(x.artist||"아티스트 미입력")} · ${esc(x.date||"발매일 미입력")}</div><div class="meta">${x.tracks.length} tracks</div></div><button class="more" data-more="${x.id}">•••</button></article>`).join("")}
function modal(html){$("#modal").innerHTML=`<div class="modal-bg"><div class="modal-card">${html}</div></div>`;$(".modal-bg").onclick=e=>{if(e.target===e.currentTarget)closeModal()}}
function closeModal(){$("#modal").innerHTML=""}
function albumForm(a=null){let cover=a?.cover||"";modal(`<div class="modal-head"><h2>${a?"앨범 수정":"새 앨범"}</h2><button class="glass-icon" id="mx">×</button></div><div class="field"><label>앨범명 *</label><input id="an" placeholder="앨범명을 입력하세요" value="${esc(a?.name)}"></div><div class="field"><label>가수명</label><input id="aa" placeholder="가수명을 입력하세요" value="${esc(a?.artist)}"></div><div class="field"><label>발매일</label><input id="ad" type="date" value="${a?.date||""}"></div><div class="field"><label>표지</label><div class="photo" id="photo">${cover?`<img src="${cover}">`:"📸 사진을 넣어주세요"}</div></div><div class="actions"><button class="glass-btn" id="mc">취소</button><button class="pink-btn" id="as">SAVE</button></div>`);$("#mx").onclick=closeModal;$("#mc").onclick=closeModal;$("#photo").onclick=()=>$("#coverInput").click();$("#coverInput").onchange=()=>{let f=$("#coverInput").files[0];if(!f)return;let r=new FileReader;r.onload=()=>{cover=r.result;$("#photo").innerHTML=`<img src="${cover}">`};r.readAsDataURL(f)};$("#as").onclick=()=>{let name=$("#an").value.trim();if(!name)return toast("앨범명을 입력해 주세요.");if(a)Object.assign(a,{name,artist:$("#aa").value.trim(),date:$("#ad").value,cover});else albums.push({id:id(),name,artist:$("#aa").value.trim(),date:$("#ad").value,cover,tracks:[]});persist();render();closeModal();toast(a?"수정 완료":"앨범 생성 완료")}}
function openAlbum(a){current=a;modal(`<div class="modal-head"><h2>${esc(a.name)}</h2><button class="glass-icon" id="mx">×</button></div>${a.cover?`<img class="detail-cover" src="${a.cover}">`:""}<div class="detail-title"><h2>${esc(a.name)}</h2><p>${esc(a.artist||"")} · ${esc(a.date||"")}</p></div><div>${a.tracks.length?a.tracks.map((t,i)=>`<div class="track"><div class="track-no">${i+1}</div><div><div class="track-name">${esc(t.name)}</div><div class="track-info">${fmt(t.duration)}${t.fileKey?" · 음원 저장됨":""}</div></div><button class="more" data-track="${i}">•••</button></div>`).join(""):"<p style='text-align:center;color:var(--muted)'>아직 노래가 없어요.</p>"}</div><div class="actions"><button class="glass-btn" id="ae">수정</button><button class="pink-btn" id="at">＋ 노래 추가</button></div>`);$("#mx").onclick=closeModal;$("#ae").onclick=()=>albumForm(a);$("#at").onclick=()=>trackForm(a);$$("[data-track]").forEach(b=>b.onclick=()=>trackActions(a,+b.dataset.track))}
async function trackForm(a){let file=null,dur=0;modal(`<div class="modal-head"><h2>노래 추가</h2><button class="glass-icon" id="mx">×</button></div><div class="field"><label>노래 제목 *</label><input id="tn" placeholder="노래 제목"></div><div class="field"><label>음원</label><button class="glass-btn" id="pick">MP3 / 음원 불러오기</button><div id="fn" class="meta"></div></div><div class="field"><label>길이(초)</label><input id="td" type="number" min="0" placeholder="자동 인식"></div><div class="actions"><button class="glass-btn" id="mc">취소</button><button class="pink-btn" id="ts">SAVE</button></div>`);$("#mx").onclick=closeModal;$("#mc").onclick=closeModal;$("#pick").onclick=()=>$("#audioInput").click();$("#audioInput").onchange=()=>{file=$("#audioInput").files[0];if(!file)return;$("#fn").textContent=file.name;let u=URL.createObjectURL(file),x=new Audio;x.onloadedmetadata=()=>{$("#td").value=Math.round(x.duration);dur=x.duration;URL.revokeObjectURL(u)};x.src=u};$("#ts").onclick=async()=>{let n=$("#tn").value.trim();if(!n)return toast("제목을 입력해 주세요.");let d=+$("#td").value||dur||0, key=file?id():"";if(file)await putFile(key,file);a.tracks.push({id:id(),name:n,duration:d,fileKey:key});persist();openAlbum(a);toast("노래 추가 완료")}}

function lyricsFor(t){ return Array.isArray(t.lyrics)?t.lyrics:[] }
function renderLyrics(t){
  const box=$("#lyricsView"); if(!box)return;
  const ls=lyricsFor(t);
  if(!ls.length){box.innerHTML='<div class="lyrics-note">♪</div><p class="lyrics-empty">등록된 가사가 없어요.<br>「가사 편집」에서 직접 추가할 수 있어요.</p>';return}
  box.innerHTML=ls.map((l,i)=>`<div class="lyric-line ${l.text===" "?"interlude":""}" data-lyric="${i}">${l.text===" "?"♪":esc(l.text)}</div>`).join("");
}
function openLyricsEditor(){
  const t=queue[qi]; if(!t)return;
  let rows=lyricsFor(t).map(x=>({start:x.start,end:x.end,text:x.text}));
  if(!rows.length) rows=[{start:0,end:5,text:""}];
  const rowHtml=()=>rows.map((r,i)=>`<div class="lyric-row" data-li="${i}">
    <input class="ls" type="number" min="0" step=".1" value="${r.start}" placeholder="시작초">
    <input class="le" type="number" min="0" step=".1" value="${r.end}" placeholder="끝초">
    <input class="lt" value="${r.text===" "?"":esc(r.text)}" placeholder="가사 / 공백=간주">
    <button class="lyric-delete" data-rm="${i}">×</button>
  </div>`).join("");
  modal(`<div class="modal-head"><h2>가사 편집</h2><button class="glass-icon" id="lx">×</button></div>
    <div class="lyric-help">
      <b>예:</b> 시작 <b>12</b> / 끝 <b>16</b> / 가사 <b>안녕 오늘도</b><br>
      간주는 가사 칸에 <b>아무 글자도 입력하지 않고 저장</b>하면 ♪로 표시돼요.
    </div>
    <div class="lyric-editor" id="lyricEditor">${rowHtml()}</div>
    <div class="actions"><button class="glass-btn" id="addLyric">＋ 구간 추가</button><button class="pink-btn" id="saveLyrics">SAVE</button></div>`);
  $("#lx").onclick=closeModal;
  $("#addLyric").onclick=()=>{rows.push({start:0,end:5,text:""});openLyricsEditor()};
  $$("#lyricEditor [data-rm]").forEach(b=>b.onclick=()=>{rows.splice(+b.dataset.rm,1);openLyricsEditor()});
  $("#saveLyrics").onclick=()=>{
    const out=$$("#lyricEditor .lyric-row").map(row=>{
      const start=Math.max(0,+$(".ls",row).value||0);
      const end=Math.max(start,+$(".le",row).value||start);
      const raw=$(".lt",row).value;
      return {start,end,text:raw.trim()===""?" ":raw.trim()};
    }).filter(x=>x.end>=x.start);
    out.sort((a,b)=>a.start-b.start);
    t.lyrics=out; persist(); closeModal(); renderLyrics(t); toast("가사를 저장했어요.");
  };
}

function trackActions(a,i){let t=a.tracks[i];modal(`<div class="modal-head"><h2>${esc(t.name)}</h2><button class="glass-icon" id="mx">×</button></div><p class="meta">${fmt(t.duration)} · ${esc(a.artist||"")}</p><div class="actions"><button class="glass-btn" id="del">삭제</button><button class="pink-btn" id="one">재생하기</button></div>`);$("#mx").onclick=closeModal;$("#one").onclick=()=>start(a,[i]);$("#del").onclick=async()=>{await delFile(t.fileKey);a.tracks.splice(i,1);persist();openAlbum(a);toast("삭제했어요")}}
async function start(a,inds,start=0){current=a;queue=inds.map(i=>a.tracks[i]);qi=start;closeModal();$("#player").hidden=false;document.body.style.overflow="hidden";await playCurrent()}
async function playCurrent(){let t=queue[qi];if(!t)return;let f=await getFile(t.fileKey);if(f){audio.src=URL.createObjectURL(f);audio.play().catch(()=>{});$("#play").textContent="Ⅱ";$("#bigDisc").classList.add("playing")}else{audio.removeAttribute("src");$("#play").textContent="▶";$("#bigDisc").classList.remove("playing")}$("#nowTitle").textContent=t.name;$("#nowArtist").textContent=current.artist||"아티스트";$("#nowAlbum").textContent=current.name;$("#playerCounter").textContent=`${qi+1} / ${queue.length}`;renderLyrics(t);$("#playerCover").innerHTML=current.cover?`<img src="${current.cover}">`:"";updateQueue();media(t)}
function next(){if(!queue.length)return;if(shuffle)qi=Math.floor(Math.random()*queue.length);else if(qi<queue.length-1)qi++;else if(repeat)qi=0;else return;playCurrent()}
function prev(){if(audio.currentTime>4){audio.currentTime=0;return}qi=(qi-1+queue.length)%queue.length;playCurrent()}
function media(t){if(!("mediaSession"in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:t.name,artist:current.artist||"MCP",album:current.name,artwork:current.cover?[{src:current.cover,sizes:"512x512",type:"image/jpeg"}]:[]});for(const [a,fn] of Object.entries({play:()=>audio.play(),pause:()=>audio.pause(),nexttrack:next,previoustrack:prev,seekbackward:()=>audio.currentTime=Math.max(0,audio.currentTime-10),seekforward:()=>audio.currentTime=Math.min(audio.duration||0,audio.currentTime+10)})){try{navigator.mediaSession.setActionHandler(a,fn)}catch{}}}
function updateQueue(){$("#queueList").innerHTML=queue.map((t,i)=>`<div class="queue-item ${i===qi?"active":""}" data-q="${i}"><b>${i+1}</b><span>${esc(t.name)}<small class="meta"> · ${fmt(t.duration)}</small></span><span>${i===qi?"●":""}</span></div>`).join("")}
$("#newAlbumBtn").onclick=()=>albumForm();$("#emptyNew").onclick=()=>albumForm();$("#fab").onclick=()=>albumForm();$("#homeBtn").onclick=()=>{closeModal();$("#player").hidden=true};$("#grid").onclick=e=>{let m=e.target.closest("[data-more]");if(m){let a=albums.find(x=>x.id===m.dataset.more);modal(`<div class="modal-head"><h2>${esc(a.name)}</h2><button class="glass-icon" id="mx">×</button></div><div class="actions"><button class="glass-btn" id="op">열기</button><button class="glass-btn" id="ed">수정</button><button class="glass-btn" id="de">삭제</button></div>`);$("#mx").onclick=closeModal;$("#op").onclick=()=>openAlbum(a);$("#ed").onclick=()=>albumForm(a);$("#de").onclick=()=>{if(confirm("앨범을 삭제할까요?")){albums=albums.filter(x=>x.id!==a.id);persist();render();closeModal()}}}else{let c=e.target.closest("[data-id]");if(c)openAlbum(albums.find(x=>x.id===c.dataset.id))}};
$("#playerClose").onclick=()=>{audio.pause();$("#player").hidden=true;document.body.style.overflow=""};$("#play").onclick=()=>{if(audio.paused){audio.play();$("#play").textContent="Ⅱ";$("#bigDisc").classList.add("playing")}else{audio.pause();$("#play").textContent="▶";$("#bigDisc").classList.remove("playing")}};$("#next").onclick=next;$("#prev").onclick=prev;$("#shuffle").onclick=()=>{shuffle=!shuffle;$("#shuffle").style.color=shuffle?"var(--pink)":"inherit"};$("#repeat").onclick=()=>{repeat=!repeat;$("#repeat").style.color=repeat?"var(--pink)":"inherit"};$("#progress").oninput=()=>{if(audio.duration)audio.currentTime=audio.duration*$("#progress").value/100};audio.ontimeupdate=()=>{
if(!audio.duration)return;
const t=queue[qi]; const ls=lyricsFor(t);
$$(".lyric-line").forEach((el,i)=>el.classList.toggle("active",audio.currentTime>=ls[i].start&&audio.currentTime<ls[i].end));
const active=$(".lyric-line.active"); if(active) active.scrollIntoView({behavior:"smooth",block:"center"});
$("#progress").value=audio.currentTime/audio.duration*100;$("#elapsed").textContent=fmt(audio.currentTime);$("#remaining").textContent="-"+fmt(audio.duration-audio.currentTime)};audio.onended=next;
$("#lyricsEdit").onclick=openLyricsEditor;
$("#queueOpen").onclick=()=>$("#queuePanel").hidden=false;$("#queueClose").onclick=()=>$("#queuePanel").hidden=true;$("#queueList").onclick=e=>{let x=e.target.closest("[data-q]");if(x){qi=+x.dataset.q;$("#queuePanel").hidden=true;playCurrent()}};$("#sortBtn").onclick=()=>{sortMode=1-sortMode;render();toast(sortMode?"이름순 정렬":"가나다순 정렬")};
$("#themeBtn").onclick=()=>{let d=document.documentElement.dataset.theme==="dark";document.documentElement.dataset.theme=d?"light":"dark";$("#themeBtn").textContent=d?"☾":"☀"};
$("#searchBtn").onclick=()=>{let q=prompt("앨범/곡 검색");if(q===null)return;let found=albums.filter(a=>a.name.includes(q)||a.artist?.includes(q)||a.tracks.some(t=>t.name.includes(q)));toast(found.length?`${found.length}개의 앨범을 찾았어요.`:"검색 결과가 없어요.")};
load();render();if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});setTimeout(()=>$("#splash").style.opacity=0,1100);setTimeout(()=>$("#splash")?.remove(),1700);
