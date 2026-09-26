(() => {
  const BASE = window.MBBS_SYLLABUS || {};
  const SUBJECTS = Object.keys(BASE);
  const STORE = 'MBBS_STUDY_TRACKER_V10';

  const defaults = {
    done: {}, goalDate: null, todayTarget: 0, todayTargetInitial: 0,
    targetSet: false, backlog: 0, backlogInitial: 0, goalTotal: 0,
    completedGoal: 0, selectionQuota: 0, selectedTopics: [],
    custom: {added: [], removed: []}
  };
  let state = {...defaults};
  try { state = {...defaults, ...(JSON.parse(localStorage.getItem(STORE) || '{}'))}; } catch(e) {}
  state.done = state.done || {};
  state.custom = {added: state.custom?.added || [], removed: state.custom?.removed || []};
  state.selectedTopics = state.selectedTopics || [];

  const $ = id => document.getElementById(id);
  const key = (s,h,t) => `${s}||${h}||${t}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save = () => localStorage.setItem(STORE, JSON.stringify(state));

  function topics(){
    const out=[];
    SUBJECTS.forEach(s => Object.entries(BASE[s] || {}).forEach(([h, arr]) => arr.forEach(t => {
      const k=key(s,h,t.title);
      if(!state.custom.removed.includes(k)) out.push({s,h,t,custom:false});
    })));
    state.custom.added.forEach(x => out.push({s:x.s,h:x.h,t:x.t,custom:true}));
    return out;
  }

  function ensureToday(){
    const today = new Date().toISOString().slice(0,10);
    if(state.goalDate === today) return;
    if(state.goalDate){
      // Any unfinished part of today's target becomes backlog tomorrow.
      state.backlog = Number(state.backlog||0) + Number(state.todayTarget||0);
    }
    state.goalDate=today;
    state.todayTarget=0;
    state.todayTargetInitial=0;
    state.targetSet=false;
    state.backlogInitial=Number(state.backlog||0);
    state.goalTotal=Number(state.backlog||0);
    state.completedGoal=0;
    state.selectionQuota=0;
    state.selectedTopics=[];
    save();
  }

  function completedCount(){
    return topics().filter(x => !!state.done[key(x.s,x.h,x.t.title)]).length;
  }

  function remainingGoal(){
    return Math.max(0, Number(state.goalTotal||0) - Number(state.completedGoal||0));
  }

  function renderStats(){
    const total=topics().length, done=completedCount();
    $('overall').textContent=Math.round(done/Math.max(1,total)*100)+'%';
    $('completed').textContent=done;
    $('goalStat').textContent=`${state.completedGoal||0} / ${state.goalTotal||0}`;
  }

  function renderSubjects(){
    const root=$('subjectList'); root.innerHTML='';
    const q=$('search').value.trim().toLowerCase();
    const active=Number(state.selectionQuota||0)>0;
    const selected=new Set(state.selectedTopics||[]);
    SUBJECTS.forEach(s=>{
      const all=topics().filter(x=>x.s===s);
      const visible=q ? all.filter(x=>(`${x.s} ${x.h} ${x.t.title}`).toLowerCase().includes(q)) : all;
      if(q && !visible.length) return;
      const d=document.createElement('details'); d.className='subject'; if(q)d.open=true;
      d.innerHTML=`<summary><span>${esc(s)}</span><span class="meta">${all.length} topics ⌄</span></summary><div class="body"></div>`;
      const body=d.querySelector('.body'), groups={};
      visible.forEach(x=>(groups[x.h] ||= []).push(x));
      Object.entries(groups).forEach(([h,arr])=>{
        const hd=document.createElement('div'); hd.className='section'; hd.textContent=h; body.appendChild(hd);
        arr.forEach(x=>{
          const k=key(x.s,x.h,x.t.title), done=!!state.done[k], isSel=selected.has(k);
          const lab=document.createElement('label');
          lab.className='topic'+(done?' completed':'')+(isSel?' selected':'')+(!active && !done?' locked':'');
          const disable = done || (!active && !isSel) || (!isSel && selected.size >= Number(state.selectionQuota||0));
          lab.innerHTML=`<input type="checkbox" ${done||isSel?'checked':''} ${disable?'disabled':''}>`+
            `<span class="topic-name">${esc(x.t.title)}</span><span class="duration">${esc(x.t.duration||'')}</span>`;
          const cb=lab.querySelector('input');
          if(!done && active){
            cb.disabled=false;
            cb.onchange=e=>{
              if(e.target.checked){
                if(selected.size >= Number(state.selectionQuota||0)){e.target.checked=false;return;}
                state.selectedTopics=[...(state.selectedTopics||[]),k];
              }else{
                state.selectedTopics=(state.selectedTopics||[]).filter(z=>z!==k);
              }
              if((state.selectedTopics||[]).length === Number(state.selectionQuota||0)) finalizeSelection();
              else {save(); updateCompleteUI(); renderSubjects();}
            };
          }
          body.appendChild(lab);
        });
      });
      root.appendChild(d);
    });
  }

  function renderGoals(){
    const b=Number(state.backlog||0), t=Number(state.todayTarget||0), total=Number(state.goalTotal||0), done=Number(state.completedGoal||0);
    $('goalInput').value=state.targetSet ? state.todayTargetInitial : '';
    $('goalInput').disabled=state.targetSet;
    $('saveGoal').disabled=state.targetSet;
    $('clearGoal').style.display='none';
    $('goalBig').textContent=`${done} / ${total}`;
    $('goalBar').style.width=(total ? Math.min(100,done/total*100) : 0)+'%';
    $('goalBreakdown').innerHTML=
      `<div class="item"><span>Backlogged remaining</span><b>${b}</b></div>`+
      `<div class="item"><span>Today’s target remaining</span><b>${t}</b></div>`+
      `<div class="item"><span>Completed</span><b>${done}</b></div>`;
    if(!state.targetSet) $('goalText').textContent='Set today’s target once. It will be locked for the rest of today.';
    else if(total===done) $('goalText').textContent='Daily goal completed. Complete is now disabled.';
    else $('goalText').textContent=`${remainingGoal()} topic${remainingGoal()===1?'':'s'} remaining. Use Complete to choose how many to mark done.`;
    $('todayList').innerHTML=
      `<div class="item"><span>Backlogged remaining</span><b>${b}</b></div>`+
      `<div class="item"><span>Today’s target remaining</span><b>${t}</b></div>`+
      `<div class="item"><span>Total remaining</span><b>${remainingGoal()}</b></div>`;
  }

  function updateCompleteUI(){
    const remaining=remainingGoal(), active=Number(state.selectionQuota||0)>0;
    const btn=$('completeBtn'), sel=$('completeCount'), status=$('selectionStatus');
    btn.disabled = remaining<=0 || active;
    sel.disabled = !active;
    sel.innerHTML='<option value="">Select number of topics</option>'+
      Array.from({length:remaining},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('');
    if(active){
      const n=(state.selectedTopics||[]).length;
      status.textContent=`Select ${Number(state.selectionQuota)-n} more topic${Number(state.selectionQuota)-n===1?'':'s'} (${n}/${state.selectionQuota}).`;
    } else if(remaining>0){
      status.textContent='Tap Complete, then choose how many topics to mark done.';
    } else {
      status.textContent='Daily goal completed.';
    }
  }

  function finalizeSelection(){
    const chosen=state.selectedTopics||[];
    if(!state.selectionQuota || chosen.length !== Number(state.selectionQuota)) return;
    chosen.forEach(k=>{
      if(state.done[k]) return;
      state.done[k]=true;
      state.completedGoal=(state.completedGoal||0)+1;
      // Backlog is consumed before today's target.
      if(state.backlog>0) state.backlog--;
      else if(state.todayTarget>0) state.todayTarget--;
    });
    state.selectionQuota=0;
    state.selectedTopics=[];
    save();
    renderAll();
  }

  function fillAdmin(){
    $('addSubject').innerHTML=SUBJECTS.map(s=>`<option>${esc(s)}</option>`).join('');
    $('removeSubject').innerHTML=$('addSubject').innerHTML;
    renderRemove();
  }
  function renderRemove(){
    const s=$('removeSubject').value, q=$('removeSearch').value.toLowerCase();
    $('removeList').innerHTML='';
    topics().filter(x=>x.s===s && x.t.title.toLowerCase().includes(q)).slice(0,80).forEach(x=>{
      const row=document.createElement('div'); row.className='item';
      row.innerHTML=`<span>${esc(x.h)} → ${esc(x.t.title)}</span><button class="danger">Remove</button>`;
      row.querySelector('button').onclick=()=>{
        const k=key(x.s,x.h,x.t.title);
        if(x.custom) state.custom.added=state.custom.added.filter(a=>key(a.s,a.h,a.t.title)!==k);
        else if(!state.custom.removed.includes(k)) state.custom.removed.push(k);
        delete state.done[k]; state.selectedTopics=(state.selectedTopics||[]).filter(z=>z!==k);
        save(); renderAll(); fillAdmin();
      };
      $('removeList').appendChild(row);
    });
  }

  $('search').oninput=renderSubjects;
  $('completeBtn').onclick=()=>{
    const remaining=remainingGoal(); if(!remaining)return;
    $('completeCount').disabled=false;
    $('completeBtn').disabled=true;
    $('selectionStatus').textContent='Choose how many topics you want to complete.';
  };
  $('completeCount').onchange=()=>{
    const n=Number($('completeCount').value||0); if(!n)return;
    state.selectionQuota=n; state.selectedTopics=[]; save(); updateCompleteUI(); renderSubjects();
  };

  $('saveGoal').onclick=()=>{
    ensureToday();
    if(state.targetSet)return;
    const n=Math.max(0,parseInt($('goalInput').value||'0',10));
    state.todayTarget=n;
    state.todayTargetInitial=n;
    state.targetSet=true;
    state.backlogInitial=Number(state.backlog||0);
    state.goalTotal=Number(state.backlog||0)+n;
    state.completedGoal=0;
    state.selectionQuota=0; state.selectedTopics=[];
    save(); renderAll();
  };

  $('addTopicBtn').onclick=()=>{
    const s=$('addSubject').value,h=$('addHeader').value.trim()||'Custom',title=$('addTopic').value.trim(),duration=$('addDuration').value.trim();
    if(!title)return alert('Enter a topic name.');
    if(topics().some(x=>key(x.s,x.h,x.t.title)===key(s,h,title)))return alert('That topic already exists.');
    state.custom.added.push({s,h,t:{n:'',title,duration}}); save();
    $('addTopic').value=''; $('addDuration').value=''; renderAll(); fillAdmin(); alert('Topic added.');
  };
  $('removeSubject').onchange=renderRemove;
  $('removeSearch').oninput=renderRemove;
  $('resetProgress').onclick=()=>{
    if(!confirm('Reset all study progress and daily-goal data? Topic edits will remain.'))return;
    state.done={}; state.todayTarget=0; state.todayTargetInitial=0; state.targetSet=false;
    state.backlog=0; state.backlogInitial=0; state.goalTotal=0; state.completedGoal=0;
    state.selectionQuota=0; state.selectedTopics=[]; save(); renderAll();
  };
  $('restoreSyllabus').onclick=()=>{
    if(!confirm('Remove all added/removed topic changes and restore the original syllabus?'))return;
    state.custom={added:[],removed:[]}; save(); renderAll(); fillAdmin();
  };

  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active')); b.classList.add('active');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); $(b.dataset.page).classList.add('active');
  });

  function renderAll(){
    ensureToday();
    renderStats(); renderSubjects(); renderGoals(); updateCompleteUI();
  }
  fillAdmin(); renderAll();
})();
