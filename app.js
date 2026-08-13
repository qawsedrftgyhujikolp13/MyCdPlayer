const $=s=>document.querySelector(s);
const audio=$("#audio");
let albums=JSON.parse(localStorage.getItem("albums")||"[]");
let currentAlbum=null,currentIndex=0,shuffle=false,repeat="all",coverData=null,selectedAudio=[];
let db;
const openDB=indexedDB.open("CDAlbumDB",1);
openDB.onupgradeneeded=e=>{db=e.target.result;db.createObjectStore("audio")};
openDB.onsuccess=e=>{db=e.target.result;renderAlbums()};

function saveMeta(){localStorage.setItem("albums",JSON.stringify(albums))}
function blobPut(key,blob){return new Promise((res,rej)=>{let t=db.transaction("audio","readwrite");t.objectStore("audio").put(blob,key);t.oncomplete=()=>res();t.onerror=()=>rej(t.error)})}
function blobGet(key){return new Promise((res,rej)=>{let t=db.transaction("audio");let r=t.objectStore("audio").get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
function fmt(s){if(!isFinite(s))return"0:00";s=Math.floor(s);return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function renderAlbums(){
 $("#albumCount").textContent=`${albums.length} albums`;
 const g=$("#albumGrid");g.innerHTML="";
 if(!albums.length){g.innerHTML='<div class="empty">아직 앨범이 없어요.<br>＋ 앨범 만들기로 시작하세요.</div>';return}
 albums.forEach((a,i)=>{let d=document.createElement("div");d.className="album-card";d.innerHTML=`<div class="cover">${a.cover?`<img src="${a.cover}">`:""}</div><h3>${esc(a.name)}</h3><p>${a.tracks.length}곡</p>`;d.onclick=()=>openPlayer(i);g.appendChild(d)})
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function show(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.screen===id))}
$("#newAlbum").onclick=()=>$("#albumModal").classList.add("open");
document.querySelector("[data-close]").onclick=()=>$("#albumModal").classList.remove("open");
$("#pickCover").onclick=()=>$("#coverFile").click();
$("#coverFile").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{coverData=r.result;$("#coverPreview").innerHTML=`<img src="${coverData}">`};r.readAsDataURL(f)};
$("#pickAudio").onclick=()=>$("#audioFiles").click();
$("#audioFiles").onchange=e=>{selectedAudio=[...e.target.files];$("#selectedFiles").innerHTML=selectedAudio.map((f,i)=>`<div>${i+1}. ${esc(f.name)}</div>`).join("")};
$("#createAlbum").onclick=async()=>{
 let name=$("#albumName").value.trim()||"새 앨범"; if(!selectedAudio.length){alert("MP3를 한 곡 이상 선택해주세요.");return}
 let id=crypto.randomUUID(),tracks=[];
 for(let i=0;i<selectedAudio.length;i++){let f=selectedAudio[i],tid=crypto.randomUUID();await blobPut(tid,f);tracks.push({id:tid,name:f.name.replace(/\.[^.]+$/,""),start:0,end:null})}
 albums.push({id,name,cover:coverData,tracks});saveMeta();selectedAudio=[];coverData=null;$("#albumName").value="";$("#selectedFiles").innerHTML="";$("#coverPreview").textContent="＋";$("#albumModal").classList.remove("open");renderAlbums();
};
async function openPlayer(i){currentAlbum=albums[i];currentIndex=0;$("#playerAlbumName").textContent=currentAlbum.name.toUpperCase();$("#cdImg").src=currentAlbum.cover||"";renderTracks();await loadTrack();show("player")}
function renderTracks(){let box=$("#trackList");box.innerHTML=currentAlbum.tracks.map((t,i)=>`<div class="track ${i===currentIndex?"active":""}" data-i="${i}"><span class="num">${i+1}</span><b>${esc(t.name)}</b></div>`).join("");box.querySelectorAll(".track").forEach(x=>x.onclick=async()=>{currentIndex=+x.dataset.i;await loadTrack();play()})}
async function loadTrack(){let t=currentAlbum.tracks[currentIndex],b=await blobGet(t.id);audio.src=URL.createObjectURL(b);audio.currentTime=t.start||0;$("#songTitle").textContent=t.name;$("#songMeta").textContent=`${currentIndex+1} / ${currentAlbum.tracks.length}`;$("#cdImg").src=currentAlbum.cover||"";renderTracks();audio.onloadedmetadata=()=>{$("#totalTime").textContent=fmt((t.end||audio.duration)-t.start);$("#seek").value=0}}
function play(){audio.play();$("#play").textContent="Ⅱ";$("#cd").classList.add("playing")}
function pause(){audio.pause();$("#play").textContent="▶";$("#cd").classList.remove("playing")}
$("#play").onclick=()=>audio.paused?play():pause();
$("#prev").onclick=()=>{currentIndex=(currentIndex-1+currentAlbum.tracks.length)%currentAlbum.tracks.length;loadTrack().then(play)};
$("#next").onclick=()=>nextTrack();
function nextTrack(){if(shuffle){currentIndex=Math.floor(Math.random()*currentAlbum.tracks.length)}else{currentIndex++}if(currentIndex>=currentAlbum.tracks.length){if(repeat==="all")currentIndex=0;else{pause();return}}loadTrack().then(play)}
audio.ontimeupdate=()=>{let t=currentAlbum?.tracks[currentIndex];if(!t)return;let end=t.end||audio.duration;let start=t.start||0;$("#currentTime").textContent=fmt(Math.max(0,audio.currentTime-start));$("#seek").value=((audio.currentTime-start)/(end-start))*100;if(audio.currentTime>=end-.05)nextTrack()};
$("#seek").oninput=e=>{let t=currentAlbum.tracks[currentIndex],end=t.end||audio.duration,start=t.start||0;audio.currentTime=start+(end-start)*(+e.target.value/100)}
$("#shuffle").onclick=()=>{shuffle=!shuffle;$("#shuffle").classList.toggle("active",shuffle)}
$("#repeat").onclick=()=>{repeat=repeat==="all"?"one":"all";$("#repeat").classList.toggle("active",repeat==="one");$("#repeat").textContent=repeat==="one"?"1↻":"↻"};
$("#backBtn").onclick=()=>{pause();show("library")};
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>show(t.dataset.screen));

function refreshTrim(){
 let s=$("#trimTrack"),v=s.value,t=currentAlbum?.tracks.find(x=>x.id===v);if(!t)return;
 blobGet(t.id).then(b=>{let u=URL.createObjectURL(b),a=new Audio(u);a.onloadedmetadata=()=>{let dur=a.duration;s.max=dur;e=$("#trimEnd");e.max=dur;$("#trimStart").max=dur;$("#trimStart").value=t.start||0;$("#trimEnd").value=t.end||dur;$("#trimEndText").textContent=fmt(t.end||dur);$("#trimStartText").textContent=fmt(t.start||0)}});
}
$("#trimTrack").onchange=refreshTrim;
$("#trimStart").oninput=e=>{$("#trimStartText").textContent=fmt(+e.target.value);if(+e.target.value>=+$("#trimEnd").value)$("#trimStart").value=+$("#trimEnd").value-0.1}
$("#trimEnd").oninput=e=>{$("#trimEndText").textContent=fmt(+e.target.value);if(+e.target.value<=+$("#trimStart").value)$("#trimEnd").value=+$("#trimStart").value+0.1}
$("#saveTrim").onclick=()=>{let t=currentAlbum?.tracks.find(x=>x.id===$("#trimTrack").value);if(!t)return;t.start=+$("#trimStart").value;t.end=+$("#trimEnd").value;saveMeta();alert("구간이 저장됐어요.");if(t.id===currentAlbum.tracks[currentIndex].id)loadTrack()};
$("#pickVideo").onclick=()=>$("#videoFile").click();
$("#videoFile").onchange=async e=>{let f=e.target.files[0];if(!f)return;$("#convertStatus").textContent="오디오 추출 준비 중…";let a=document.createElement("audio");a.src=URL.createObjectURL(f);a.onloadedmetadata=()=>{$("#convertStatus").textContent=`선택됨: ${f.name} · 브라우저의 직접 변환은 환경에 따라 제한될 수 있어요.`}};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();window._install=e});

if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
