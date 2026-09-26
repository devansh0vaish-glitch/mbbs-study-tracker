(() => {
const BASE = window.MBBS_SYLLABUS;
const SUBJECTS = Object.keys(BASE);
const STORE = "MBBS_STUDY_TRACKER_V9";
let state = {done:{},goal:0,plan:[],seconds:0,sessions:[],custom:{added:[],removed:[]}};
try { state = {...state,...JSON.parse(localStorage.getItem(STORE)||"{}")}; } catch(e) {}
state.custom={added:state.custom?.added||[],removed:state.custom?.removed||[]};
state.done=state.done||{}; state.plan=state.plan||[]; state.sessions=state.sessions||[]; state.seconds=state.seconds||0;

const key=(s,h,t)=>`${s}||${h}||${t}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function topics(){
 const a=[];
 SUBJECTS.forEach(s=>Object.entries(BASE[s]||{}).forEach(([h,ts])=>ts.forEach(t=>{
   if(!state.custom.removed.includes(key(s,h,t.title)))a.push({s,h,t,custom:false});
 })));
 state.custom.added.forEach(x=>a.push({s:x.s,h:x.h,t:x.t,custom:true}));
 return a;
}
function renderStats(){
 const ts=topics(),done=ts.filter(x=>state.done[key(x.s,x.h,x.t.title)]).length;
 overall.textContent=Math.round(done/Math.max(ts.length,1)*100)+"%";
 completed.textContent=done;
 const gd=state.plan.filter(k=>state.done[k]).length; goalStat.textContent=`${gd} / ${state.plan.length}`;
 timeStat.textContent=`${Math.floor(state.seconds/3600)}h ${Math.floor(state.seconds%3600/60)}m`;
}
function renderSubjects(){
 subjectList.innerHTML=""; const q=search.value.trim().toLowerCase();
 SUBJECTS.forEach(s=>{
   const ts=topics().filter(x=>x.s===s);
   const vis=q?ts.filter(x=>(x.s+" "+x.h+" "+x.t.title).toLowerCase().includes(q)):ts;
   if(q&&!vis.length)return;
   const d=document.createElement("details"); d.className="subject"; if(q)d.open=true;
   d.innerHTML=`<summary><span>${esc(s)}</span><span class="meta">${ts.length} topics ⌄</span></summary><div class="body"></div>`;
   const body=d.querySelector(".body"), groups={};
   vis.forEach(x=>(groups[x.h]??=[]).push(x));
   Object.entries(groups).forEach(([h,arr])=>{
     const sh=document.createElement("div");sh.className="section";sh.textContent=h;body.appendChild(sh);
     arr.forEach(x=>{
       const k=key(x.s,x.h,x.t.title),lab=document.createElement("label");lab.className="topic";
       lab.innerHTML=`<input type="checkbox" ${state.done[k]?"checked":""}><span class="topic-name">${esc(x.t.title)}</span><span class="duration">${esc(x.t.duration||"")}</span>`;
       lab.querySelector("input").onchange=e=>{state.done[k]=e.target.checked;save();renderStats();renderGoals();};
       lab.ondblclick=e=>{e.preventDefault();state.plan=state.plan.includes(k)?state.plan.filter(z=>z!==k):[...state.plan,k];save();renderGoals();renderStats();};
       body.appendChild(lab);
     });
   }); subjectList.appendChild(d);
 });
}
function renderGoals(){
 goalInput.value=state.goal||"";
 const done=state.plan.filter(k=>state.done[k]).length,total=state.plan.length;
 goalBig.textContent=`${done} / ${total}`;goalBar.style.width=(total?done/total*100:0)+"%";
 goalText.textContent=state.goal?`Target: ${state.goal} topics • Planned: ${total} • Completed: ${done}`:"Set a target, then double-tap topics to add them.";
 todayList.innerHTML=state.plan.length?"":"<p>No topics planned yet.</p>";
 state.plan.forEach(k=>{const x=topics().find(t=>key(t.s,t.h,t.t.title)===k);if(!x)return;
   const row=document.createElement("div");row.className="item";row.innerHTML=`<span>${esc(x.s)} → ${esc(x.t.title)}</span><button>Remove</button>`;
   row.querySelector("button").onclick=()=>{state.plan=state.plan.filter(z=>z!==k);save();renderGoals();renderStats()};todayList.appendChild(row);
 });
}
function fillSelects(){
 addSubject.innerHTML=SUBJECTS.map(s=>`<option>${esc(s)}</option>`).join("");
 removeSubject.innerHTML=addSubject.innerHTML;
 timerTopic.innerHTML=topics().map(x=>`<option value="${esc(key(x.s,x.h,x.t.title))}">${esc(x.s+" → "+x.t.title)}</option>`).join("");
 renderRemove();
}
function renderRemove(){
 const s=removeSubject.value,q=removeSearch.value.toLowerCase();removeList.innerHTML="";
 topics().filter(x=>x.s===s&&x.t.title.toLowerCase().includes(q)).slice(0,80).forEach(x=>{
  const row=document.createElement("div");row.className="item";row.innerHTML=`<span>${esc(x.h)} → ${esc(x.t.title)}</span><button class="danger">Remove</button>`;
  row.querySelector("button").onclick=()=>{const k=key(x.s,x.h,x.t.title);
    if(x.custom)state.custom.added=state.custom.added.filter(a=>key(a.s,a.h,a.t.title)!==k);
    else if(!state.custom.removed.includes(k))state.custom.removed.push(k);
    delete state.done[k];state.plan=state.plan.filter(z=>z!==k);save();fillSelects();renderSubjects();renderGoals();renderStats();
  };removeList.appendChild(row);
 });
}
function renderHistory(){
 historyList.innerHTML=state.sessions.length?state.sessions.slice().reverse().map(x=>`<div class="item"><span>${esc(x.date)} • ${esc(x.topic)}</span><b>${Math.floor(x.seconds/60)} min</b></div>`).join(""):"No sessions yet.";
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));document.getElementById(b.dataset.page).classList.add("active")});
search.oninput=renderSubjects;
saveGoal.onclick=()=>{state.goal=Math.max(0,parseInt(goalInput.value||0));save();renderGoals();renderStats()};
clearGoal.onclick=()=>{state.goal=0;state.plan=[];save();renderGoals();renderStats()};
addTopicBtn.onclick=()=>{
 const s=addSubject.value,h=addHeader.value.trim()||"Custom",title=addTopic.value.trim(),duration=addDuration.value.trim();
 if(!title)return alert("Enter a topic name.");
 if(topics().some(x=>key(x.s,x.h,x.t.title)===key(s,h,title)))return alert("That topic already exists.");
 state.custom.added.push({s,h,t:{n:"",title,duration}});save();addTopic.value="";addDuration.value="";fillSelects();renderSubjects();renderStats();renderGoals();alert("Topic added.");
};
removeSubject.onchange=renderRemove;removeSearch.oninput=renderRemove;
resetProgress.onclick=()=>{if(confirm("Reset all study progress, goals, timer and history? Topic edits will remain.")){state.done={};state.goal=0;state.plan=[];state.seconds=0;state.sessions=[];save();renderAll()}};
restoreSyllabus.onclick=()=>{if(confirm("Remove all added/removed topic changes and restore the original syllabus?")){state.custom={added:[],removed:[]};save();renderAll()}};
let timer=null,last=0,session=0;
start.onclick=()=>{if(timer)return;last=Date.now();timer=setInterval(()=>{const n=Date.now();session+=Math.floor((n-last)/1000);last=n;clock.textContent=new Date(session*1000).toISOString().slice(11,19)},500);timerStatus.textContent="Running…"};
pause.onclick=()=>{if(timer){clearInterval(timer);timer=null;timerStatus.textContent="Paused."}};
stop.onclick=()=>{if(timer){clearInterval(timer);timer=null}if(session){const k=timerTopic.value,x=topics().find(t=>key(t.s,t.h,t.t.title)===k);state.seconds+=session;state.sessions.push({date:new Date().toLocaleString(),topic:x?x.s+" → "+x.t.title:"Unknown",seconds:session});save()}session=0;clock.textContent="00:00:00";timerStatus.textContent="Session saved.";renderStats();renderHistory()};
function renderAll(){fillSelects();renderSubjects();renderStats();renderGoals();renderHistory()}
renderAll();
})();