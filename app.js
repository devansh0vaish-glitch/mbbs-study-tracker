(() => {
"use strict";
const BASE=window.MBBS_SYLLABUS;
if(!BASE){document.body.innerHTML="<main><h2>Syllabus failed to load.</h2></main>";return;}
const SUBJECTS=Object.keys(BASE), STORE="MBBS_STUDY_TRACKER_V9";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=(s,h,t)=>`${s}||${h}||${t}`;
const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const shift=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return iso(x)};
const defaults={
 goalDate:null,targetSet:false,todayTarget:0,backlog:0,goalTotal:0,completedGoal:0,
 done:{},completionDates:{},custom:{added:[],removed:[]},
 revision:{history:{},eligibility:{},manualQueue:[],settings:{newPerDay:5,totalPerDay:15,intervals:[1,3,7,14,30,60,120]}},
 selectionQuota:0,selectedTopics:[]
};
let state=structuredClone(defaults);
try{const s=JSON.parse(localStorage.getItem(STORE)||"null");if(s)state={...defaults,...s,custom:{...defaults.custom,...(s.custom||{})},revision:{...defaults.revision,...(s.revision||{}),settings:{...defaults.revision.settings,...((s.revision||{}).settings||{})}}}}catch(e){}
state.done??={};state.completionDates??={};state.custom??={added:[],removed:[]};state.custom.added??=[];state.custom.removed??=[];
state.revision??=structuredClone(defaults.revision);state.revision.history??={};state.revision.eligibility??={};state.revision.manualQueue??=[];
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function allTopics(){
 const a=[];
 SUBJECTS.forEach((s,si)=>Object.entries(BASE[s]||{}).forEach(([h,arr],hi)=>arr.forEach((t,ti)=>{const k=key(s,h,t.title);if(!state.custom.removed.includes(k))a.push({s,h,t,k,si,hi,ti})})));
 state.custom.added.forEach((x,i)=>{const k=key(x.s,x.h,x.t.title);if(!state.custom.removed.includes(k))a.push({s:x.s,h:x.h,t:x.t,k,si:SUBJECTS.indexOf(x.s),hi:9999+i,ti:i})});
 return a;
}
function find(k){return allTopics().find(x=>x.k===k)}
function completedCount(){return allTopics().filter(x=>state.done[x.k]).length}
function today(){return iso(new Date())}
function ensureToday(){
 const t=today(); if(state.goalDate===t)return;
 if(state.goalDate!==null){const u=Math.max(0,Number(state.goalTotal||0)-Number(state.completedGoal||0));state.backlog=Number(state.backlog||0)+u}
 state.goalDate=t;state.targetSet=false;state.todayTarget=0;state.goalTotal=Number(state.backlog||0);state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();
}
function remainingProgress(){return Math.max(0,Number(state.goalTotal||0)-Number(state.completedGoal||0))}
function goalRender(){
 const total=Number(state.goalTotal||0),done=Number(state.completedGoal||0);
 $("goalInput").value=state.targetSet?state.todayTarget:"";$("goalInput").disabled=state.targetSet;$("saveGoal").disabled=state.targetSet;
 $("goalBig").textContent=`${done} / ${total}`;$("goalBar").style.width=(total?Math.min(100,done/total*100):0)+"%";
 $("goalBreakdown").innerHTML=`<div class="item"><span>Backlogged</span><b>${state.backlog||0}</b></div><div class="item"><span>Today's target</span><b>${state.todayTarget||0}</b></div><div class="item"><span>Remaining</span><b>${remainingProgress()}</b></div>`;
 $("goalText").textContent=total===0?"Set today's target to begin.":remainingProgress()===0?"Today's progress is complete.":`${remainingProgress()} topic${remainingProgress()===1?"":"s"} remaining.`;
 $("todayList").innerHTML=`<div class="item"><span>Backlog</span><b>${state.backlog||0}</b></div><div class="item"><span>Today's target</span><b>${state.todayTarget||0}</b></div><div class="item"><span>Total progress</span><b>${done} / ${total}</b></div>`;
}
function renderStats(){
 const total=allTopics().length,done=completedCount(),due=revisionItems().filter(x=>x.due<=today()).length;
 $("overall").textContent=Math.round(done/Math.max(1,total)*100)+"%";$("completed").textContent=done;$("goalStat").textContent=`${state.completedGoal||0} / ${state.goalTotal||0}`;$("revisionStat").textContent=due;
}
function completeControls(){
 const r=remainingProgress(),active=!!state.selectionQuota;
 $("completeBtn").disabled=r<=0||active;$("completeCount").disabled=!active;
 if(!active){$("completeCount").innerHTML=`<option value="">Choose number of topics</option>`+Array.from({length:r},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");$("completeCount").value="";$("selectionStatus").textContent=r?"Tap Complete, then choose how many topics.":"Target complete."}
 else{$("completeCount").value=state.selectionQuota;const left=state.selectionQuota-state.selectedTopics.length;$("selectionStatus").textContent=`Select ${left} more topic${left===1?"":"s"} (${state.selectedTopics.length}/${state.selectionQuota}).`}
}
function renderSubjects(){
 const q=$("search").value.trim().toLowerCase();
 const active=!!state.selectionQuota;
 const selected=new Set(state.selectedTopics);
 const list=$("subjectList");
 list.innerHTML="";
 SUBJECTS.forEach(s=>{
  const items=allTopics().filter(x=>x.s===s);
  const vis=q?items.filter(x=>(x.s+" "+x.h+" "+x.t.title).toLowerCase().includes(q)):items;
  if(q&&!vis.length)return;
  const d=document.createElement("details");
  d.className="subject"; if(q)d.open=true;
  const sm=document.createElement("summary");
  sm.innerHTML=`<span>${esc(s)}</span><span class="meta">${items.length} topics ▾</span>`;
  d.appendChild(sm);
  const body=document.createElement("div"); body.className="body";
  const groups={};
  vis.forEach(x=>{(groups[x.h]??=[]).push(x)});
  Object.entries(groups).forEach(([h,arr])=>{
    const hd=document.createElement("div"); hd.className="section"; hd.textContent=h; body.appendChild(hd);
    arr.forEach(x=>{
      const done=!!state.done[x.k], pick=selected.has(x.k);
      const row=document.createElement("div");
      row.className="topic"+(done?" completed":"")+(pick?" selected":"");
      if(active&&!done){
        row.classList.add("selectable");
        row.innerHTML=`<input type="checkbox" ${pick?"checked":""}><span class="topic-name">${esc(x.t.title)}</span><span class="duration">${esc(x.t.duration||"")}</span>`;
        row.querySelector("input").onchange=e=>{
          if(e.target.checked){
            if(state.selectedTopics.length>=state.selectionQuota){e.target.checked=false;return}
            state.selectedTopics.push(x.k);
          }else{
            state.selectedTopics=state.selectedTopics.filter(k=>k!==x.k);
          }
          save();
          renderSubjects();
          completeControls();
          if(state.selectedTopics.length===state.selectionQuota)commitSelection();
        };
      }else{
        row.innerHTML=(done?'<span class="done-mark">✓</span>':'<span class="empty-mark"></span>')+
          `<span class="topic-name">${esc(x.t.title)}</span><span class="duration">${esc(x.t.duration||"")}</span>`;
      }
      body.appendChild(row);
    });
  });
  d.appendChild(body); list.appendChild(d);
 });
}

function commitSelection(){
 const q=Number(state.selectionQuota),chosen=[...state.selectedTopics];if(!q||chosen.length!==q)return;
 chosen.forEach(k=>{if(state.done[k])return;state.done[k]=true;state.completionDates[k]=today();state.completedGoal=(state.completedGoal||0)+1;if(state.backlog>0)state.backlog--;else if(state.todayTarget>0)state.todayTarget--;});
 state.selectionQuota=0;state.selectedTopics=[];save();renderAll();
}
$("completeBtn").onclick=()=>{$("completeCount").disabled=false;$("completeCount").focus();$("selectionStatus").textContent="Choose how many topics to complete."};
$("completeCount").onchange=()=>{const n=Number($("completeCount").value||0);if(!n||n>remainingProgress())return;state.selectionQuota=n;state.selectedTopics=[];save();renderSubjects();completeControls()};
$("search").oninput=renderSubjects;
$("saveGoal").onclick=()=>{ensureToday();if(state.targetSet)return;const n=Math.max(1,parseInt($("goalInput").value||"0",10));state.targetSet=true;state.todayTarget=n;state.goalTotal=Number(state.backlog||0)+n;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();renderAll()};

function eligibility(k){return state.revision.eligibility[k]||"automatic"}
function completionDate(k){return state.completionDates[k]||null}
function revisionItems(){
 const out=[];const intervals=state.revision.settings.intervals.map(Number).filter(n=>n>0);
 allTopics().forEach(x=>{
  if(!state.done[x.k]||eligibility(x.k)==="never")return;
  const h=state.revision.history[x.k]||{cycle:0,next:null,reviews:[]};
  if(!h.next){out.push({...x,cycle:0,due:completionDate(x.k)||today(),newItem:true});return}
  out.push({...x,cycle:h.cycle||0,due:h.next,newItem:false});
 });
 state.revision.manualQueue.forEach(k=>{const x=find(k);if(x&&!state.done[k]&&!out.some(y=>y.k===k))out.push({...x,cycle:0,due:today(),manual:true})});
 return out;
}
function orderedRevision(items){
 return [...items].sort((a,b)=>{
  if(a.due!==b.due)return a.due.localeCompare(b.due);
  if(a.h!==b.h)return a.h.localeCompare(b.h);
  if(a.si!==b.si)return a.si-b.si;
  if(a.hi!==b.hi)return a.hi-b.hi;
  return a.ti-b.ti;
 });
}
function revisionGroups(items){
 const sorted=orderedRevision(items),groups=[];
 sorted.forEach(x=>{
  const last=groups.at(-1);
  if(last&&last.due===x.due&&last.s===x.s&&last.h===x.h&&last.items.at(-1).ti+1===x.ti)last.items.push(x);
  else groups.push({due:x.due,s:x.s,h:x.h,items:[x]});
 });
 return groups;
}
function revisionRender(){
 const all=orderedRevision(revisionItems()),due=all.filter(x=>x.due<=today()),over=all.filter(x=>x.due<today());
 const maxNew=Number(state.revision.settings.newPerDay||5),maxTotal=Number(state.revision.settings.totalPerDay||15);
 const newOnes=due.filter(x=>x.newItem),scheduled=due.filter(x=>!x.newItem);
 const todayItems=orderedRevision([...scheduled,...newOnes].slice(0,maxTotal));
 $("revDue").textContent=due.length;$("revToday").textContent=todayItems.length;$("revNew").textContent=Math.min(maxNew,newOnes.length);$("revOverdue").textContent=over.length;
 const groups=revisionGroups(todayItems);$("revisionQueue").innerHTML=groups.length?groups.map(g=>groupHTML(g)).join(""):"<p class='muted'>Nothing due today.</p>";
 $("revisionPreview").innerHTML=revisionGroups(all.slice(0,30)).map(g=>groupHTML(g,true)).join("")||"<p class='muted'>No revision items yet.</p>";
}
function groupHTML(g,preview=false){
 const count=g.items.length;const cycle=Math.max(...g.items.map(x=>x.cycle||0));
 return `<div class="revision-group"><h4>${esc(g.h)} <span class="tag">${count} topic${count===1?"":"s"}</span></h4><p>${esc(g.s)} · ${g.due}${g.items.some(x=>x.newItem)?" · New":` · R${cycle}`}</p>${preview?"":`<div class="actions"><button class="secondary" data-group="${esc(g.items.map(x=>x.k).join("~~~"))}" data-action="forgot">Forgot</button><button class="secondary" data-group="${esc(g.items.map(x=>x.k).join("~~~"))}" data-action="good">Good</button><button class="primary" data-group="${esc(g.items.map(x=>x.k).join("~~~"))}" data-action="easy">Easy</button></div>`}</div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const ks=b.dataset.group.split("~~~"),action=b.dataset.action,intervals=state.revision.settings.intervals.map(Number).filter(n=>n>0);ks.forEach(k=>{const h=state.revision.history[k]||{cycle:0,reviews:[]};h.reviews??=[];h.reviews.push({date:today(),rating:action});let c=h.cycle||0;if(action==="forgot")c=Math.max(0,c-1);else if(action==="good")c=Math.min(c+1,intervals.length-1);else c=Math.min(c+2,intervals.length-1);h.cycle=c;h.next=shift(today(),intervals[c]||1);state.revision.history[k]=h});save();renderAll()});

function populateAdmin(){
 const opts=SUBJECTS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
 ["addSubject","removeSubject","bulkSubject","eligSubject"].forEach(id=>$(id).innerHTML=opts);
 $("removeSubject").insertAdjacentHTML("afterbegin",'<option value="">Select subject</option>');$("bulkSubject").insertAdjacentHTML("afterbegin",'<option value="">Select subject</option>');$("eligSubject").insertAdjacentHTML("afterbegin",'<option value="">Select subject</option>');
 $("newPerDay").value=state.revision.settings.newPerDay;$("totalPerDay").value=state.revision.settings.totalPerDay;$("intervals").value=state.revision.settings.intervals.join(",");
}
function renderRemove(){
 const s=$("removeSubject").value,q=$("removeSearch").value.trim().toLowerCase();$("removeList").innerHTML="";if(!s){$("removeList").innerHTML="<p class='muted'>Select a subject first.</p>";return}
 allTopics().filter(x=>x.s===s&&(!q||(x.h+" "+x.t.title).toLowerCase().includes(q))).forEach(x=>{const d=document.createElement("div");d.className="admin-topic";d.innerHTML=`<span>${esc(x.h)} — ${esc(x.t.title)}</span><button class="danger small">Remove</button>`;d.querySelector("button").onclick=()=>{if(!confirm("Remove this topic permanently?"))return;state.custom.removed.push(x.k);delete state.done[x.k];delete state.completionDates[x.k];save();renderAll()};$("removeList").appendChild(d)});
}
const bulkSelected=new Set();
function renderBulk(){
 const s=$("bulkSubject").value,q=$("bulkSearch").value.trim().toLowerCase(),box=$("bulkList");box.innerHTML="";if(!s){box.innerHTML="<p class='muted'>Select a subject first.</p>";$("bulkCount").textContent="0 selected";return}
 allTopics().filter(x=>x.s===s&&(!q||(x.h+" "+x.t.title).toLowerCase().includes(q))).forEach(x=>{const d=document.createElement("label");d.className="checkrow";d.innerHTML=`<input type="checkbox" ${bulkSelected.has(x.k)?"checked":""}><span>${esc(x.h)} — ${esc(x.t.title)}</span>`;d.querySelector("input").onchange=e=>{e.target.checked?bulkSelected.add(x.k):bulkSelected.delete(x.k);$("bulkCount").textContent=`${bulkSelected.size} selected`};box.appendChild(d)});
 $("bulkCount").textContent=`${bulkSelected.size} selected`;
}
$("bulkApply").onclick=()=>{
 const chosen=orderedSyllabus([...bulkSelected].map(k=>find(k)).filter(Boolean));if(!chosen.length){alert("Select topics first.");return}
 chosen.forEach((x,i)=>{const d=shift(today(),-Math.floor(i/5));state.done[x.k]=true;state.completionDates[x.k]=d});
 bulkSelected.clear();save();renderAll();alert("Historical completion dates added. Today's goal and backlog were not changed.");
};
function orderedSyllabus(items){return [...items].sort((a,b)=>a.si-b.si||a.hi-b.hi||a.ti-b.ti)}
$("bulkClear").onclick=()=>{bulkSelected.clear();renderBulk()};
$("bulkSubject").onchange=renderBulk;$("bulkSearch").oninput=renderBulk;

function renderEligibility(){
 const s=$("eligSubject").value,q=$("eligSearch").value.trim().toLowerCase(),box=$("eligList");box.innerHTML="";if(!s){box.innerHTML="<p class='muted'>Select a subject first.</p>";return}
 allTopics().filter(x=>x.s===s&&(!q||(x.h+" "+x.t.title).toLowerCase().includes(q))).forEach(x=>{const d=document.createElement("div");d.className="admin-topic";const e=eligibility(x.k);d.innerHTML=`<span>${esc(x.h)} — ${esc(x.t.title)} <span class="tag ${e==="never"?"never":e==="manual"?"manual":"auto"}">${e}</span></span><select><option value="automatic" ${e==="automatic"?"selected":""}>Automatic</option><option value="manual" ${e==="manual"?"selected":""}>Manual</option><option value="never" ${e==="never"?"selected":""}>Never</option></select>`;d.querySelector("select").onchange=z=>{state.revision.eligibility[x.k]=z.target.value;save();renderRevision()};box.appendChild(d)});
}
$("eligSubject").onchange=renderEligibility;$("eligSearch").oninput=renderEligibility;

$("addTopicBtn").onclick=()=>{const s=$("addSubject").value,h=$("addHeader").value.trim(),t=$("addTopic").value.trim(),duration=$("addDuration").value.trim();if(!s||!h||!t){alert("Enter subject, header and topic.");return}const k=key(s,h,t);if(find(k)){alert("Topic already exists.");return}state.custom.added.push({s,h,t:{title:t,duration}});save();$("addHeader").value=$("addTopic").value=$("addDuration").value="";renderAll()};
$("removeSubject").onchange=renderRemove;$("removeSearch").oninput=renderRemove;
$("saveSettings").onclick=()=>{const np=Math.max(1,parseInt($("newPerDay").value||5,10)),tp=Math.max(np,parseInt($("totalPerDay").value||15,10)),ints=$("intervals").value.split(",").map(x=>parseInt(x.trim(),10)).filter(x=>x>0);if(!ints.length){alert("Enter at least one interval.");return}state.revision.settings={newPerDay:np,totalPerDay:tp,intervals:ints};save();renderAll();alert("Revision settings saved.")};

$("exportData").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mbbs-study-tracker-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("importData").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=="object")throw Error();state={...defaults,...x,custom:{...defaults.custom,...(x.custom||{})},revision:{...defaults.revision,...(x.revision||{}),settings:{...defaults.revision.settings,...((x.revision||{}).settings||{})}}};save();renderAll();alert("Tracker data imported. Built-in syllabus was not replaced.")}catch(err){alert("Invalid backup file.")}e.target.value=""};

$("simulateDay").onclick=()=>{const unfinished=remainingProgress();state.backlog=Number(state.backlog||0)+unfinished;state.goalDate=shift(today(),1);state.targetSet=false;state.todayTarget=0;state.goalTotal=state.backlog;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();renderAll()};
$("resetProgress").onclick=()=>{if(!confirm("Reset study completion, daily target and backlog? Revision history and syllabus edits will stay."))return;state.done={};state.completionDates={};state.goalDate=today();state.targetSet=false;state.todayTarget=0;state.backlog=0;state.goalTotal=0;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();renderAll()};
$("restoreSyllabus").onclick=()=>{if(!confirm("Restore original syllabus and remove permanent topic edits? Study and revision data will remain."))return;state.custom={added:[],removed:[]};save();renderAll()};

$("nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{$("nav").querySelectorAll("button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.page).classList.add("active");if(b.dataset.page==="revision")renderRevision();});
function renderRevision(){revisionRender()}
function renderAll(){ensureToday();populateAdmin();renderStats();goalRender();renderSubjects();completeControls();renderRevision();renderRemove();renderBulk();renderEligibility()}
renderAll();
})();