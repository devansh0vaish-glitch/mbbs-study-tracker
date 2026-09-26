(() => {
const BASE = window.MBBS_SYLLABUS;
const SUBJECTS = Object.keys(BASE);
const STORE = "MBBS_STUDY_TRACKER_V9";
let state = {done:{},goalDate:null,todayTarget:null,backlog:0,plan:[],custom:{added:[],removed:[]}};
try { state = {...state,...JSON.parse(localStorage.getItem(STORE)||"{}")}; } catch(e) {}
state.custom={added:state.custom?.added||[],removed:state.custom?.removed||[]};
state.done=state.done||{}; state.plan=state.plan||[]; state.backlog=Number.isFinite(state.backlog)?state.backlog:0; state.selectionQuota=state.selectionQuota||0; state.selectedTopics=state.selectedTopics||[];
state.todayTarget=state.todayTarget===null||state.todayTarget===undefined?null:Number(state.todayTarget);


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
function todayRemaining(){
  return state.todayTarget===null ? 0 : Math.max(0, state.todayTarget - completedToday);
}
function rolloverDay(){
  const today=new Date().toISOString().slice(0,10);
  if(state.goalDate===today)return;
  if(state.goalDate && state.todayTarget!==null){
    const unfinished = Math.max(0, Number(state.todayTarget||0) - Number(state.batchCompleted||0));
    state.backlog += unfinished;
  }
  state.goalDate=today;
  state.todayTarget=null;
  state.batchCompleted=0;
  state.lastCompletedFrom=null;
  state.selectionQuota=0; state.selectedTopics=[];
  state.dayCompleted=0;
  state.plan=[];
  save();
}
function totalRemaining(){
  const b=Math.max(0,Number(state.backlog)||0);
  const t=state.todayTarget===null?0:Math.max(0,Number(state.todayTarget)||0);
  return b+t;
}
function finalizeSelectedTopics(){
 const chosen=state.selectedTopics||[];
 if(!state.selectionQuota || chosen.length!==Number(state.selectionQuota))return false;
 chosen.forEach(k=>{
   if(state.done[k])return;
   state.done[k]=true;
   state.batchCompleted=(state.batchCompleted||0)+1;
   if(state.backlog>0)state.backlog--; else if(state.todayTarget>0)state.todayTarget--;
 });
 state.selectionQuota=0;
 state.selectedTopics=[];
 save();return true;
}
function renderStats(){
 const total=topics().length,done=topics().filter(x=>state.done[key(x.s,x.h,x.t.title)]).length;
 overall.textContent=Math.round(done/Math.max(total,1)*100)+"%";
 completed.textContent=done;
 const quota=Number(state.backlog||0)+Number(state.todayTarget||0);
 const batchDone=Math.min(Number(state.batchCompleted||0),quota);
 goalStat.textContent=`${batchDone} / ${quota}`;
}
function renderSubjects(){
 subjectList.innerHTML="";
 const q=search.value.trim().toLowerCase();
 const selecting=Number(state.selectionQuota||0)>0;
 const selected=new Set(state.selectedTopics||[]);
 SUBJECTS.forEach(s=>{
   const ts=topics().filter(x=>x.s===s);
   const vis=q?ts.filter(x=>(x.s+" "+x.h+" "+x.t.title).toLowerCase().includes(q)):ts;
   if(q&&!vis.length)return;
   const d=document.createElement("details"); d.className="subject"; if(q)d.open=true;
   d.innerHTML=`<summary><span>${esc(s)}</span><span class="meta">${ts.length} topics ⌄</span></summary><div class="body"></div>`;
   const body=d.querySelector(".body"),groups={};
   vis.forEach(x=>(groups[x.h]??=[]).push(x));
   Object.entries(groups).forEach(([h,arr])=>{
     const sh=document.createElement("div");sh.className="section";sh.textContent=h;body.appendChild(sh);
     arr.forEach(x=>{
       const k=key(x.s,x.h,x.t.title);
       const done=!!state.done[k];
       const isSelected=selected.has(k);
       const lab=document.createElement("label");
       lab.className="topic"+(done?" completed":"")+(isSelected?" selected":"");
       const disabled=done || (!selecting) || (!isSelected && selected.size>=Number(state.selectionQuota||0));
       lab.innerHTML=`<input type="checkbox" ${done||isSelected?"checked":""} ${disabled?"disabled":""}>
         <span class="topic-name">${esc(x.t.title)}</span><span class="duration">${esc(x.t.duration||"")}</span>`;
       const cb=lab.querySelector("input");
       if(!done && selecting){
         cb.disabled=false;
         cb.onchange=e=>{
           if(e.target.checked){
             if(selected.size>=Number(state.selectionQuota||0)){e.target.checked=false;return}
             state.selectedTopics=[...(state.selectedTopics||[]),k];
             if(state.selectedTopics.length===Number(state.selectionQuota||0)){
               finalizeSelectedTopics();
             }
           }else{
             state.selectedTopics=(state.selectedTopics||[]).filter(z=>z!==k);
           }
           save();updateSelectionUI();renderSubjects();
         };
       }
       body.appendChild(lab);
     });
   }); subjectList.appendChild(d);
 });
}

function updateSelectionUI(){
 const remainingTarget=Math.max(0,(Number(state.backlog||0)+Number(state.todayTarget||0))-(Number(state.batchCompleted||0)));
 const available=Math.max(0,remainingTarget);
 completeBtn.disabled=available<=0 || Number(state.selectionQuota||0)>0;
 completeCount.disabled=Number(state.selectionQuota||0)<=0 || available<=0;
 completeCount.innerHTML='<option value="">Select number of topics</option>'+
   Array.from({length:available},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
 if(Number(state.selectionQuota||0)>0){
   const n=(state.selectedTopics||[]).length;
   selectionStatus.textContent=`Select ${Number(state.selectionQuota)-n} more topic${Number(state.selectionQuota)-n===1?"":"s"} (${n}/${state.selectionQuota}).`;
 }else{
   selectionStatus.textContent=available>0?"Tap Complete to choose how many topics to mark complete.":"Current target completed.";
 }
}
completeBtn.onclick=()=>{
 const remaining=Math.max(0,(Number(state.backlog||0)+Number(state.todayTarget||0))-(Number(state.batchCompleted||0)));
 if(remaining<=0)return;
 completeCount.disabled=false;
 completeCount.innerHTML='<option value="">Select number of topics</option>'+
   Array.from({length:remaining},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
 completeBtn.disabled=true;
 selectionStatus.textContent="Choose how many topics you want to complete.";
};
completeCount.onchange=()=>{
 const n=Number(completeCount.value||0);
 if(!n)return;
 state.selectionQuota=n;
 state.selectedTopics=[];
 save();updateSelectionUI();renderSubjects();
};

function renderGoals(){
 rolloverDay();
 const backlog=Math.max(0,Number(state.backlog||0));
 const target=Math.max(0,Number(state.todayTarget||0));
 const completed=Number(state.batchCompleted||0);
 const totalQuota=backlog+target;
 goalInput.value=target>0?target:"";
 goalInput.disabled=target>0;
 saveGoal.disabled=target>0;
 goalBig.textContent=`${completed} / ${totalQuota}`;
 goalBar.style.width=(totalQuota?Math.min(100,completed/totalQuota*100):0)+"%";
 goalBreakdown.innerHTML=
   `<div class="item"><span>Backlogged</span><b>${backlog}</b></div>`+
   `<div class="item"><span>Today’s target</span><b>${target}</b></div>`+
   `<div class="item"><span>Completed</span><b>${completed}</b></div>`;
 if(target>0){
   goalText.textContent = completed>=totalQuota
     ? "Target completed. Set the next target to unlock more topics."
     : `You can select ${totalQuota-completed} more topic${totalQuota-completed===1?"":"s"}.`;
 } else if(backlog>0){
   goalText.textContent = `You have ${backlog} backlogged topic${backlog===1?"":"s"}. Set today’s target to continue.`;
 } else {
   goalText.textContent = "Set today’s target to unlock topics.";
 }
 todayList.innerHTML=
   `<div class="item"><span>Backlog remaining</span><b>${backlog}</b></div>`+
   `<div class="item"><span>Today’s target remaining</span><b>${target}</b></div>`+
   `<div class="item"><span>Total remaining</span><b>${Math.max(0,totalQuota-completed)}</b></div>`;
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
saveGoal.onclick=()=>{
  rolloverDay();
  if(Number(state.todayTarget||0)>0)return;
  const n=Math.max(0,parseInt(goalInput.value||"0",10));
  if(n<1){alert("Set a target of at least 1 topic.");return;}
  state.todayTarget=n;
  state.batchCompleted=0;
  state.selectionQuota=0; state.selectedTopics=[];
  state.lastCompletedFrom=null;
  save();renderGoals();renderStats();renderSubjects();
};
  if(state.todayTarget!==null && Number(state.todayTarget||0)>0)return;
  state.todayTarget=1;
  state.batchCompleted=0;
  state.lastCompletedFrom=null;
  state.selectionQuota=0; state.selectedTopics=[];
  save();renderGoals();renderStats();renderSubjects();
};
  if(state.todayTarget!==null)return;
  const n=Math.max(0,parseInt(goalInput.value||"0",10));
  state.todayTarget=n;
  state.startingBacklog=state.backlog||0;
  state.startingGoalTotal=(state.backlog||0)+n;
  state.dayCompleted=0;
  save();renderGoals();renderStats();
};
addTopicBtn.onclick=()=>{
 const s=addSubject.value,h=addHeader.value.trim()||"Custom",title=addTopic.value.trim(),duration=addDuration.value.trim();
 if(!title)return alert("Enter a topic name.");
 if(topics().some(x=>key(x.s,x.h,x.t.title)===key(s,h,title)))return alert("That topic already exists.");
 state.custom.added.push({s,h,t:{n:"",title,duration}});save();addTopic.value="";addDuration.value="";fillSelects();renderSubjects();renderStats();renderGoals();alert("Topic added.");
};
removeSubject.onchange=renderRemove;removeSearch.oninput=renderRemove;
resetProgress.onclick=()=>{if(confirm("Reset all study progress, goals, timer and history? Topic edits will remain.")){state.done={};state.plan=[];state.backlog=0;state.todayTarget=null;state.batchCompleted=0;state.selectionQuota=0;state.selectedTopics=[];state.lastCompletedFrom=null;state.goalDate=new Date().toISOString().slice(0,10);state.dayCompleted=0;save();renderAll()}};
restoreSyllabus.onclick=()=>{if(confirm("Remove all added/removed topic changes and restore the original syllabus?")){state.custom={added:[],removed:[]};save();renderAll()}};
function renderAll(){rolloverDay();fillSelects();renderSubjects();renderStats();renderGoals()}
renderAll();
})();