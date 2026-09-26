(() => {
"use strict";
const SUPABASE_URL="https://rnjmgtttujzfjonvnaae.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_RLUAXbbmn9y6p-OesKr8Ow_LEyBBgVo";
const supabaseClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
let cloudSession=null, cloudTimer=null, cloudBusy=false, cloudDirty=false;
const cloudEl=id=>document.getElementById(id);
function setCloudStatus(text,kind=""){const e=cloudEl("cloudStatus");if(!e)return;e.textContent=text;e.className=kind?`cloud-${kind}`:"";}
function meaningfulLocalData(){return Object.keys(state.done||{}).length||Object.keys(state.completionDates||{}).length||Object.keys(state.revision?.history||{}).length||state.todayTarget||state.backlog||state.custom?.added?.length||state.custom?.removed?.length;}
async function pushCloud(){if(!supabaseClient||!cloudSession){return} if(cloudBusy){cloudDirty=true;return} cloudBusy=true;cloudDirty=false;setCloudStatus("Cloud: syncing…");try{const {error}=await supabaseClient.from("user_tracker_data").upsert({user_id:cloudSession.user.id,data:state,schema_version:1,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)throw error;setCloudStatus("Cloud: synced","ok")}catch(e){console.error(e);setCloudStatus("Cloud: sync failed","error")}finally{cloudBusy=false;if(cloudDirty)queueCloudSync()}}
function queueCloudSync(){if(!cloudSession)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(pushCloud,700)}
async function pullCloud(){if(!cloudSession)return false;setCloudStatus("Cloud: loading…");const {data,error}=await supabaseClient.from("user_tracker_data").select("data,updated_at").eq("user_id",cloudSession.user.id).maybeSingle();if(error){setCloudStatus("Cloud: load failed","error");throw error}if(data?.data){localStorage.setItem(STORE,JSON.stringify(data.data));state={...defaults,...data.data,custom:{...defaults.custom,...(data.data.custom||{})},revision:{...defaults.revision,...(data.data.revision||{}),settings:{...defaults.revision.settings,...((data.data.revision||{}).settings||{})}}};return true}return false}
async function loadGlobalState(){
 if(!cloudSession)return;
 try{
  const {data:ms,error}=await supabaseClient.from("master_syllabus").select("syllabus,version").eq("id",1).single();
  if(error)throw error;
  isAdmin=!!(cloudSession.user.email&&cloudSession.user.email.toLowerCase()==="devansh0vaish@gmail.com");
  // Admin account can be adjusted by changing the app_admins table; client also gates UI.
  if(ms?.syllabus && Object.keys(ms.syllabus).length){BASE=ms.syllabus;refreshSubjects();}
  else if(isAdmin){await supabaseClient.from("master_syllabus").update({syllabus:window.MBBS_SYLLABUS,version:1,updated_by:cloudSession.user.email,updated_at:new Date().toISOString()}).eq("id",1);BASE=window.MBBS_SYLLABUS;refreshSubjects();}
  const {data:gs}=await supabaseClient.from("global_app_state").select("simulated_date,reset_version").eq("id",1).single();
  if(gs){
    const rv=Number(gs.reset_version||0); const last=Number(localStorage.getItem("MBBS_GLOBAL_RESET_VERSION")||0);
    if(rv>last && !isAdmin){state.done={};state.completionDates={};state.goalDate=realToday();state.targetSet=false;state.todayTarget=0;state.backlog=0;state.goalTotal=0;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];state.revision.history={};state.revision.manualQueue=[];localStorage.setItem("MBBS_GLOBAL_RESET_VERSION",String(rv));localStorage.setItem(STORE,JSON.stringify(state));state._skipCloudPullOnce=true;}
    state._globalResetVersion=rv; state._globalSimulatedDate=gs.simulated_date||null; state.simulatedDate=gs.simulated_date||null;
  }
  document.getElementById("adminNav").hidden=!isAdmin;
  renderAll();
 }catch(e){console.error(e)}
}
async function saveMaster(){
 if(!isAdmin)return;
 const {error}=await supabaseClient.from("master_syllabus").update({syllabus:BASE,version:Date.now(),updated_by:cloudSession.user.email,updated_at:new Date().toISOString()}).eq("id",1);
 if(error){alert("Could not save master syllabus: "+error.message);return false} return true;
}
function renderAdminSyllabus(){
 if(!isAdmin)return;
 const ss=$("adminSubject"), hs=$("adminHeader");
 ss.innerHTML=SUBJECTS.map(s=>`<option>${esc(s)}</option>`).join("");
 const s=ss.value||SUBJECTS[0]; hs.innerHTML=Object.keys(BASE[s]||{}).map(h=>`<option>${esc(h)}</option>`).join("");
 const h=hs.value; const list=$("adminSyllabusList"); if(!list)return; list.innerHTML="";
 const arr=BASE[s]?.[h]||[];
 arr.forEach((t,i)=>{const row=document.createElement("div");row.className="admin-topic";row.innerHTML=`<span><b>${i+1}.</b> ${esc(t.title)} <span class="muted">${esc(t.duration||"")}</span></span><div class="row"><button class="secondary small" data-edit="${i}">Edit</button><button class="danger small" data-remove="${i}">Remove</button></div>`;list.appendChild(row)});
 const add=document.createElement("div");add.className="card";add.innerHTML=`<label>Insert at S.No. (within this header)</label><input id="adminInsertNo" type="number" min="1" value="${arr.length+1}"><label>Topic</label><input id="adminNewTopic"><label>Duration</label><input id="adminNewDuration"><button id="adminInsertTopic" class="primary">Add topic</button>`;list.appendChild(add);
 list.querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{const i=+b.dataset.remove;if(!confirm("Remove this topic globally?"))return;BASE[s][h].splice(i,1);renumberHeader(s,h);if(await saveMaster())renderAll()});
 list.querySelectorAll("[data-edit]").forEach(b=>b.onclick=async()=>{const i=+b.dataset.edit,t=BASE[s][h][i];const name=prompt("Topic name",t.title);if(name===null)return;const dur=prompt("Duration",t.duration||"");t.title=name.trim()||t.title;t.duration=(dur||"").trim();if(await saveMaster())renderAll()});
 $("adminInsertTopic").onclick=async()=>{const i=Math.max(1,Math.min(arr.length+1,parseInt($("adminInsertNo").value||arr.length+1,10)))-1;const title=$("adminNewTopic").value.trim();if(!title)return alert("Enter a topic name.");arr.splice(i,0,{n:0,title,duration:$("adminNewDuration").value.trim()});renumberHeader(s,h);if(await saveMaster())renderAll()};
}
function renumberHeader(s,h){BASE[s][h].forEach((t,i)=>t.n=i+1)}
async function startCloudSession(session){cloudSession=session;document.getElementById("authOverlay")?.classList.add("hidden");setCloudStatus(`Cloud: ${session.user.email||"signed in"}`);const localSnapshot=JSON.stringify(state);await loadGlobalState(); const hasCloud=state._skipCloudPullOnce?false:await pullCloud(); state._skipCloudPullOnce=false;if(!hasCloud&&meaningfulLocalData()){await pushCloud()}else if(hasCloud){localStorage.setItem("MBBS_STUDY_TRACKER_PRE_CLOUD_BACKUP",localSnapshot);renderAll();setCloudStatus("Cloud: synced","ok")}else{renderAll();setCloudStatus("Cloud: synced","ok")} }
async function initCloud(){if(!supabaseClient){setCloudStatus("Cloud: unavailable","error");return}const {data:{session}}=await supabaseClient.auth.getSession();if(session)await startCloudSession(session);else setCloudStatus("Cloud: signed out");supabaseClient.auth.onAuthStateChange(async (_event,session)=>{if(session)await startCloudSession(session);else{cloudSession=null;document.getElementById("authOverlay")?.classList.remove("hidden");setCloudStatus("Cloud: signed out")}})}
async function authAction(mode){const email=cloudEl("authEmail").value.trim(),password=cloudEl("authPassword").value;if(!email||password.length<6){cloudEl("authMsg").textContent="Enter an email and a password of at least 6 characters.";return}cloudEl("authMsg").textContent="Working…";const result=mode==="signup"?await supabaseClient.auth.signUp({email,password}):await supabaseClient.auth.signInWithPassword({email,password});if(result.error){cloudEl("authMsg").textContent=result.error.message;return}cloudEl("authMsg").textContent=mode==="signup"?"Account created. Check your email if confirmation is required.":"Signed in."}
let BASE=window.MBBS_SYLLABUS;
if(!BASE){document.body.innerHTML="<main><h2>Syllabus failed to load.</h2></main>";return;}
let SUBJECTS=Object.keys(BASE), STORE="MBBS_STUDY_TRACKER_V9";
let isAdmin=false;
function refreshSubjects(){SUBJECTS=Object.keys(BASE)}
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const key=(s,h,t)=>`${s}||${h}||${t}`;
const iso=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`};
const shift=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return iso(x)};
const defaults={
 goalDate:null,targetSet:false,todayTarget:0,backlog:0,goalTotal:0,completedGoal:0,
 done:{},completionDates:{},custom:{added:[],removed:[]},
 revision:{history:{},eligibility:{},manualQueue:[],settings:{newPerDay:5,totalPerDay:15,difficultyIntervals:{forgot:[1,2,4],good:[3,7,14,30,60,120],easy:[7,14,30,60,120,180]},intervals:[1,3,7,14,30,60,120]}},
 selectionQuota:0,selectedTopics:[]
};
let state=structuredClone(defaults);
try{const s=JSON.parse(localStorage.getItem(STORE)||"null");if(s)state={...defaults,...s,custom:{...defaults.custom,...(s.custom||{})},revision:{...defaults.revision,...(s.revision||{}),settings:{...defaults.revision.settings,...((s.revision||{}).settings||{}),difficultyIntervals:{...defaults.revision.settings.difficultyIntervals,...(((s.revision||{}).settings||{}).difficultyIntervals||{})}}}}}catch(e){}
state.simulatedDate??=null;
state.done??={};state.completionDates??={};state.custom??={added:[],removed:[]};state.custom.added??=[];state.custom.removed??=[];
state.revision??=structuredClone(defaults.revision);state.revision.history??={};state.revision.eligibility??={};state.revision.manualQueue??=[];
state.revision.settings??={newPerDay:5,totalPerDay:15,intervals:[1,3,7,14,30,60,120]};
state.revision.settings.difficultyIntervals??={forgot:[1,2,4],good:[3,7,14,30,60,120],easy:[7,14,30,60,120,180]};
function save(){localStorage.setItem(STORE,JSON.stringify(state));queueCloudSync()}
function allTopics(){
 const a=[];
 SUBJECTS.forEach((s,si)=>Object.entries(BASE[s]||{}).forEach(([h,arr],hi)=>arr.forEach((t,ti)=>{const k=key(s,h,t.title);if(!state.custom.removed.includes(k))a.push({s,h,t,k,si,hi,ti})})));
 state.custom.added.forEach((x,i)=>{const k=key(x.s,x.h,x.t.title);if(!state.custom.removed.includes(k))a.push({s:x.s,h:x.h,t:x.t,k,si:SUBJECTS.indexOf(x.s),hi:9999+i,ti:i})});
 return a;
}
function find(k){return allTopics().find(x=>x.k===k)}
function completedCount(){return allTopics().filter(x=>state.done[x.k]).length}
function realToday(){return iso(new Date())}
function today(){return state.simulatedDate||realToday()}
function ensureToday(){
 const t=today();
 if(state.goalDate===t)return;
 if(state.goalDate!==null){
   const unfinished=Math.max(0,Number(state.todayTarget||0)-Number(state.completedGoal||0));
   state.backlog=Number(state.backlog||0)+unfinished;
 }
 state.goalDate=t;
 state.targetSet=false;
 state.todayTarget=0;
 state.goalTotal=Number(state.backlog||0);
 state.completedGoal=0;
 state.selectionQuota=0;
 state.selectedTopics=[];
 save();
}
function remainingProgress(){return Math.max(0,Number(state.goalTotal||0)-Number(state.completedGoal||0))}
function goalRender(){
 const total=Number(state.goalTotal||0),done=Number(state.completedGoal||0);
 $("goalInput").value=state.targetSet?state.todayTarget:"";$("goalInput").disabled=state.targetSet;$("saveGoal").disabled=state.targetSet;
 $("goalBig").textContent=`${done} / ${total}`;$("goalBar").style.width=(total?Math.min(100,done/total*100):0)+"%";
 $("goalBreakdown").innerHTML=`<div class="item"><span>Backlogged</span><b>${state.backlog||0}</b></div><div class="item"><span>Today's target</span><b>${state.todayTarget||0}</b></div><div class="item"><span>Remaining</span><b>${remainingProgress()}</b></div>`;
 $("goalText").textContent=total===0?"Set today's target to begin.":remainingProgress()===0?"Today's progress is complete.":`${remainingProgress()} topic${remainingProgress()===1?"":"s"} remaining.`;

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
          updateSelectionRows();
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

function updateSelectionRows(){
 const selected=new Set(state.selectedTopics);
 document.querySelectorAll("#subjectList .topic.selectable").forEach(row=>{
   const input=row.querySelector("input");
   if(!input)return;
   const topic=row.querySelector(".topic-name")?.textContent;
   const x=allTopics().find(t=>t.t.title===topic && !state.done[t.k]);
   if(!x)return;
   const on=selected.has(x.k);
   input.checked=on;
   row.classList.toggle("selected",on);
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
  if(!h.next){out.push({...x,cycle:0,due:completionDate(x.k)||today(),newItem:true,difficulty:"new"});return}
  out.push({...x,cycle:h.cycle||0,due:h.next,newItem:false,difficulty:h.difficulty||"good"});
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
 $("revisionPreview").innerHTML=revisionGroups(all.slice(0,5)).map(g=>groupHTML(g,true)).join("")||"<p class='muted'>No revision items yet.</p>";
}
function groupHTML(g,preview=false){
 const count=g.items.length;
 const diff=g.items[0]?.difficulty||"new";
 const topics=g.items.slice(0,5).map(x=>`<div class="revision-topic"><span class="revision-topic-name">${esc(x.t.title)}</span><span class="tag">${esc(x.difficulty||"new")}</span></div>`).join("");
 return `<div class="revision-group">
   <h4>${esc(g.h)} <span class="tag">${count} topic${count===1?"":"s"}</span></h4>
   <p>${esc(g.s)} · ${g.due} · Difficulty: ${esc(diff)}</p>
   <div class="revision-topics">${topics}</div>
   ${preview?"":`<div class="actions">
      <button class="secondary" data-group="${esc(g.items.map(x=>x.k).join("~~~"))}" data-action="forgot">Forgot</button>
      <button class="secondary" data-group="${esc(g.items.map(x=>x.k).join("~~~"))}" data-action="good">Good</button>
      <button class="secondary" data-group="${esc(g.items.map(x=>x.k).join("~~~"))}" data-action="easy">Easy</button>
   </div>`}
 </div>`;
}

document.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(!b)return;const ks=b.dataset.group.split("~~~"),action=b.dataset.action;ks.forEach(k=>{const h=state.revision.history[k]||{cycle:0,reviews:[]};h.reviews??=[];h.reviews.push({date:today(),rating:action});const intervals=(state.revision.settings.difficultyIntervals?.[action]||state.revision.settings.intervals).map(Number).filter(n=>n>0);let c=h.cycle||0;if(action==="forgot")c=0;else c=Math.min(c+1,intervals.length-1);h.cycle=c;h.difficulty=action;h.next=shift(today(),intervals[c]||1);state.revision.history[k]=h});save();renderAll()});

function populateAdmin(){
 if(!$("newPerDay"))return;
 $("newPerDay").value=state.revision.settings.newPerDay;$("totalPerDay").value=state.revision.settings.totalPerDay;$("intervals").value=state.revision.settings.intervals.join(",");
 $("forgotIntervals").value=(state.revision.settings.difficultyIntervals?.forgot||[1,2,4]).join(",");
 $("goodIntervals").value=(state.revision.settings.difficultyIntervals?.good||[3,7,14,30,60,120]).join(",");
 $("easyIntervals").value=(state.revision.settings.difficultyIntervals?.easy||[7,14,30,60,120,180]).join(",");
 const opts=SUBJECTS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
 ["bulkSubject","eligSubject"].forEach(id=>{if($(id))$(id).innerHTML=opts});
}
function renderRemove(){}
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

$("saveSettings").onclick=()=>{
 const np=Math.max(1,parseInt($("newPerDay").value||5,10));
 const tp=Math.max(np,parseInt($("totalPerDay").value||15,10));
 const parseIntervals=id=>$(id).value.split(",").map(x=>parseInt(x.trim(),10)).filter(x=>x>0);
 const ints=parseIntervals("intervals"),forgot=parseIntervals("forgotIntervals"),good=parseIntervals("goodIntervals"),easy=parseIntervals("easyIntervals");
 if(!ints.length||!forgot.length||!good.length||!easy.length){alert("Enter at least one interval for every difficulty.");return}
 state.revision.settings={...state.revision.settings,newPerDay:np,totalPerDay:tp,intervals:ints,difficultyIntervals:{forgot,good,easy}};
 save();renderAll();alert("Revision settings saved.")
};

$("exportData").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mbbs-study-tracker-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("importData").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||typeof x!=="object")throw Error();state={...defaults,...x,custom:{...defaults.custom,...(x.custom||{})},revision:{...defaults.revision,...(x.revision||{}),settings:{...defaults.revision.settings,...((x.revision||{}).settings||{})}}};save();renderAll();alert("Tracker data imported. Built-in syllabus was not replaced.")}catch(err){alert("Invalid backup file.")}e.target.value=""};

$("simulateDay").onclick=async()=>{if(!isAdmin)return;const current=today();const unfinished=Math.max(0,Number(state.todayTarget||0)-Number(state.completedGoal||0));state.backlog=Number(state.backlog||0)+unfinished;const next=shift(current,1);state.simulatedDate=next;state.goalDate=next;state.targetSet=false;state.todayTarget=0;state.goalTotal=Number(state.backlog||0);state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();await supabaseClient.from("global_app_state").update({simulated_date:next,updated_at:new Date().toISOString(),updated_by:cloudSession.user.email}).eq("id",1);renderAll()};
$("exitSimulation").onclick=async()=>{if(!isAdmin)return;state.simulatedDate=null;save();await supabaseClient.from("global_app_state").update({simulated_date:null,updated_at:new Date().toISOString(),updated_by:cloudSession.user.email}).eq("id",1);renderAll()};
$("resetProgress").onclick=async()=>{if(!isAdmin)return;if(!confirm("Reset study progress, daily goals, backlog and revision history for all users? The master syllabus will remain unchanged."))return;state.done={};state.completionDates={};state.simulatedDate=null;state.goalDate=realToday();state.targetSet=false;state.todayTarget=0;state.backlog=0;state.goalTotal=0;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];state.revision.history={};state.revision.manualQueue=[];save();await supabaseClient.from("global_app_state").update({simulated_date:null,reset_version:Date.now(),updated_at:new Date().toISOString(),updated_by:cloudSession.user.email}).eq("id",1);renderAll()};

$("nav").querySelectorAll("button").forEach(b=>b.onclick=()=>{$("nav").querySelectorAll("button").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.page).classList.add("active");if(b.dataset.page==="revision")renderRevision();});
function renderRevision(){revisionRender()}
function renderAll(){ensureToday();if(isAdmin)renderAdminSyllabus();populateAdmin();renderStats();goalRender();renderSubjects();completeControls();renderRevision();renderRemove?.();renderBulk?.();renderEligibility?.()}
$("adminSubject")?.addEventListener("change",renderAdminSyllabus);$("adminHeader")?.addEventListener("change",renderAdminSyllabus);$("adminAddSubject")?.addEventListener("click",async()=>{const n=prompt("New subject name");if(!n)return;BASE[n.trim()]={};if(await saveMaster())renderAll()});$("adminRenameSubject")?.addEventListener("click",async()=>{const old=$("adminSubject").value,n=prompt("New subject name",old);if(!n||n===old)return;BASE[n.trim()]=BASE[old];delete BASE[old];if(await saveMaster())renderAll()});$("adminAddHeader")?.addEventListener("click",async()=>{const s=$("adminSubject").value,n=prompt("New header name");if(!n)return;BASE[s][n.trim()]=[];if(await saveMaster())renderAll()});
$("syncNow").onclick=async()=>{await loadGlobalState();const skip=state._skipCloudPullOnce;state._skipCloudPullOnce=false;if(!skip)await pullCloud();else await pushCloud();renderAll();setCloudStatus("Cloud: synced","ok")};
cloudEl("signInBtn").onclick=()=>authAction("signin");
cloudEl("signUpBtn").onclick=()=>authAction("signup");
cloudEl("signOutBtn").onclick=async()=>{await supabaseClient?.auth.signOut()};
renderAll();
initCloud();
})();