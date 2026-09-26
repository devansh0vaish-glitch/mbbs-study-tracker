(() => {
  'use strict';
  const BASE = window.MBBS_SYLLABUS;
  if (!BASE || typeof BASE !== 'object') { document.body.innerHTML='<main><h2>Syllabus failed to load</h2><p>Make sure syllabus.js is in the same folder as index.html.</p></main>'; return; }
  const SUBJECTS = Object.keys(BASE);
  const STORE='MBBS_STUDY_TRACKER_V7';
  const defaults={goalDate:null,targetSet:false,todayTarget:0,backlog:0,goalTotal:0,completedGoal:0,done:{},selectionQuota:0,selectedTopics:[],custom:{added:[],removed:[]}};
  let state={...defaults};
  try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(saved)state={...defaults,...saved};}catch(e){}
  state.done=state.done&&typeof state.done==='object'?state.done:{};
  state.selectedTopics=Array.isArray(state.selectedTopics)?state.selectedTopics:[];
  state.custom=state.custom||{added:[],removed:[]};
  state.custom.added=Array.isArray(state.custom.added)?state.custom.added:[];
  state.custom.removed=Array.isArray(state.custom.removed)?state.custom.removed:[];
  const $=id=>document.getElementById(id);
  const key=(s,h,t)=>`${s}||${h}||${t}`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save=()=>localStorage.setItem(STORE,JSON.stringify(state));

  function allTopics(){
    const out=[];
    SUBJECTS.forEach(s=>Object.entries(BASE[s]||{}).forEach(([h,arr])=>arr.forEach(t=>{const k=key(s,h,t.title);if(!state.custom.removed.includes(k))out.push({s,h,t});})));
    state.custom.added.forEach(x=>out.push({s:x.s,h:x.h,t:x.t}));
    return out;
  }
  function completedCount(){return allTopics().reduce((n,x)=>n+(state.done[key(x.s,x.h,x.t.title)]?1:0),0);}
  function remaining(){return Math.max(0,Number(state.goalTotal||0)-Number(state.completedGoal||0));}

  function ensureToday(){
    const today=new Date();
    const date=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if(state.goalDate===date)return;
    if(state.goalDate!==null){state.backlog=Number(state.backlog||0)+Number(state.todayTarget||0);}
    state.goalDate=date;state.targetSet=false;state.todayTarget=0;state.goalTotal=Number(state.backlog||0);state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();
  }

  function renderStats(){
    const total=allTopics().length,done=completedCount();
    $('overall').textContent=Math.round(done/Math.max(1,total)*100)+'%';
    $('completed').textContent=done;
    $('goalStat').textContent=`${state.completedGoal||0} / ${state.goalTotal||0}`;
    $('backlogStat').textContent=state.backlog||0;
  }

  function renderSubjects(){
    const root=$('subjectList');root.innerHTML='';
    const q=$('search').value.trim().toLowerCase();
    const active=Number(state.selectionQuota)>0;
    const selected=new Set(state.selectedTopics);
    SUBJECTS.forEach(s=>{
      const all=allTopics().filter(x=>x.s===s);
      const visible=q?all.filter(x=>`${x.s} ${x.h} ${x.t.title}`.toLowerCase().includes(q)):all;
      if(q&&!visible.length)return;
      const d=document.createElement('details');d.className='subject';d.open=!!q;
      d.innerHTML=`<summary><span>${esc(s)}</span><span class="meta">${all.length} topics ▾</span></summary><div class="body"></div>`;
      const body=d.querySelector('.body'),groups={};
      visible.forEach(x=>(groups[x.h]??=[]).push(x));
      Object.entries(groups).forEach(([h,arr])=>{
        const hd=document.createElement('div');hd.className='section';hd.textContent=h;body.appendChild(hd);
        arr.forEach(x=>{
          const k=key(x.s,x.h,x.t.title),done=!!state.done[k],sel=selected.has(k);
          const lab=document.createElement('label');lab.className='topic'+(done?' completed':'')+(sel?' selected':'')+(!active&&!done?' locked':'');
          const disable=done||!active||(!sel&&selected.size>=Number(state.selectionQuota));
          lab.innerHTML=`<input type="checkbox" ${done||sel?'checked':''} ${disable?'disabled':''}><span class="topic-name">${esc(x.t.title)}</span><span class="duration">${esc(x.t.duration||'')}</span>`;
          const cb=lab.querySelector('input');
          if(!done&&active){cb.disabled=false;cb.onchange=()=>{
            if(cb.checked){if(selected.size>=Number(state.selectionQuota)){cb.checked=false;return;}state.selectedTopics=[...state.selectedTopics,k];}
            else state.selectedTopics=state.selectedTopics.filter(z=>z!==k);
            save();renderSubjects();updateCompleteUI();
          };}
          body.appendChild(lab);
        });
      });
      root.appendChild(d);
    });
  }

  function renderGoals(){
    const b=Number(state.backlog||0),t=Number(state.todayTarget||0),total=Number(state.goalTotal||0),done=Number(state.completedGoal||0);
    $('goalInput').value=state.targetSet?String(t):'';$('goalInput').disabled=state.targetSet;$('saveGoal').disabled=state.targetSet;
    $('goalBig').textContent=`${done} / ${total}`;$('goalBar').style.width=(total?Math.min(100,done/total*100):0)+'%';
    $('goalBreakdown').innerHTML=`<div class="item"><span>Backlogged remaining</span><b>${b}</b></div><div class="item"><span>Today's target remaining</span><b>${t}</b></div><div class="item"><span>Completed</span><b>${done}</b></div>`;
    $('goalText').textContent=!state.targetSet?'Set today’s target once. It will lock for today.':(remaining()===0?'Daily goal completed.':'Use Complete to choose how many topics to complete.');
    $('todayList').innerHTML=`<div class="item"><span>Backlog</span><b>${b}</b></div><div class="item"><span>Today's target remaining</span><b>${t}</b></div><div class="item"><span>Total progress remaining</span><b>${remaining()}</b></div>`;
  }

  function updateCompleteUI(){
    const rem=remaining(),active=Number(state.selectionQuota)>0,btn=$('completeBtn'),sel=$('completeCount');
    btn.disabled=rem<=0||active;sel.disabled=!active;
    sel.innerHTML='<option value="">Choose number of topics</option>'+Array.from({length:rem},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    if(active){const n=state.selectedTopics.length; $('selectionStatus').textContent=`Select ${state.selectionQuota-n} more topic${state.selectionQuota-n===1?'':'s'} (${n}/${state.selectionQuota}).`;}
    else $('selectionStatus').textContent=rem>0?'Tap Complete and choose how many topics you want to mark complete.':'Daily goal completed.';
  }

  function finishSelection(){
    if(!state.selectionQuota||state.selectedTopics.length!==Number(state.selectionQuota))return;
    state.selectedTopics.forEach(k=>{if(state.done[k])return;state.done[k]=true;state.completedGoal++;if(state.backlog>0)state.backlog--;else if(state.todayTarget>0)state.todayTarget--;});
    state.selectionQuota=0;state.selectedTopics=[];save();renderAll();
  }

  function fillAdmin(){
    const opts=SUBJECTS.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');$('addSubject').innerHTML=opts;$('removeSubject').innerHTML=opts;renderRemove();
  }
  function renderRemove(){
    const s=$('removeSubject').value,q=$('removeSearch').value.toLowerCase();$('removeList').innerHTML='';
    allTopics().filter(x=>x.s===s&&x.t.title.toLowerCase().includes(q)).slice(0,80).forEach(x=>{const k=key(x.s,x.h,x.t.title),row=document.createElement('div');row.className='remove-row';row.innerHTML=`<span>${esc(x.h)} → ${esc(x.t.title)}</span><button>Remove</button>`;row.querySelector('button').onclick=()=>{if(state.custom.added.some(a=>key(a.s,a.h,a.t.title)===k))state.custom.added=state.custom.added.filter(a=>key(a.s,a.h,a.t.title)!==k);else if(!state.custom.removed.includes(k))state.custom.removed.push(k);delete state.done[k];save();renderAll();renderRemove();};$('removeList').appendChild(row);});
  }

  $('search').oninput=renderSubjects;
  $('completeBtn').onclick=()=>{$('completeBtn').disabled=true;$('completeCount').disabled=false;$('selectionStatus').textContent='Choose the number of topics to complete.';};
  $('completeCount').onchange=()=>{const n=Number($('completeCount').value);if(!n)return;state.selectionQuota=n;state.selectedTopics=[];save();renderSubjects();updateCompleteUI();};
  $('saveGoal').onclick=()=>{ensureToday();if(state.targetSet)return;const n=Math.max(0,parseInt($('goalInput').value||'0',10));state.targetSet=true;state.todayTarget=n;state.goalTotal=Number(state.backlog||0)+n;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();renderAll();};
  $('addTopicBtn').onclick=()=>{const s=$('addSubject').value,h=$('addHeader').value.trim()||'Custom',title=$('addTopic').value.trim(),duration=$('addDuration').value.trim();if(!title)return alert('Enter a topic name.');if(allTopics().some(x=>key(x.s,x.h,x.t.title)===key(s,h,title)))return alert('That topic already exists.');state.custom.added.push({s,h,t:{n:0,title,duration}});save();$('addTopic').value='';$('addDuration').value='';renderAll();renderRemove();};
  $('removeSubject').onchange=renderRemove;$('removeSearch').oninput=renderRemove;
  $('resetProgress').onclick=()=>{if(!confirm('Reset progress and daily goal? Your syllabus edits will remain.'))return;state.done={};state.targetSet=false;state.todayTarget=0;state.backlog=0;state.goalTotal=0;state.completedGoal=0;state.selectionQuota=0;state.selectedTopics=[];save();renderAll();};
  $('restoreSyllabus').onclick=()=>{if(!confirm('Restore the original 19-subject syllabus? This removes custom topic edits.'))return;state.custom={added:[],removed:[]};save();renderAll();renderRemove();};
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(b.dataset.page).classList.add('active');});
  function renderAll(){ensureToday();renderStats();renderSubjects();renderGoals();updateCompleteUI();}
  fillAdmin();renderAll();
})();
