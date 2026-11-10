/* MBBS Study Tracker V36 — integrated modules */
(() => {
  'use strict';
  const core = window.MBBS_V36_CORE;
  if (!core) { console.error('V36 core bridge missing'); return; }
  const $ = id => document.getElementById(id);
  const state = () => core.getState();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => core.today();
  const shift = (d,n) => core.shift(d,n);
  const topics = () => core.allTopics();
  const fmt = sec => `${Math.floor(sec/3600)}:${String(Math.floor(sec%3600/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  const durationMinutes = s => { const m=String(s||'').match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)/i); if(m)return Math.max(5,Math.round(Number(m[1])*60)); const n=String(s||'').match(/\d+(?:\.\d+)?/); return n?Math.max(5,Math.round(Number(n[0]))):30; };
  const niceDate = d => new Date(d+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
  const pageDefs = [
    ['overview','⌂','Overview'],['planner','🗓️','Planner'],['focus','⏱️','Focus'],['topichub','📖','Topic Hub'],['analytics','📊','Analytics'],['examinations','🎓','Exams'],['assessments','📝','Tests'],['assistant','✦','Assistant']
  ];
  const nav = $('nav');
  pageDefs.forEach(([id,icon,label]) => {
    if (!$(`nav-${id}`)) { const b=document.createElement('button'); b.id=`nav-${id}`; b.dataset.page=id; b.innerHTML=`<i>${icon}</i>${label}`; nav.appendChild(b); }
  });
  const pages = {
    overview: `<div class="v36-pagehead"><div><p class="eyebrow">YOUR ACADEMIC COMMAND CENTRE</p><h2>Overview</h2><p class="muted">A clear view of what needs attention today and what is coming next.</p></div><span class="v36-pill" id="overviewDate"></span></div>
      <div class="v36-grid v36-grid-4" id="overviewMetrics"></div>
      <div class="v36-actions"><button class="v36-btn primary" data-overview-go="planner">Plan my day</button><button class="v36-btn secondary" data-overview-go="focus">Start focus session</button><button class="v36-btn ghost" data-overview-go="revision">Review due topics</button></div>
      <div class="v36-grid"><div class="v36-card"><div class="v36-cardhead"><h3>Today's study plan</h3><button class="v36-mini" data-overview-go="planner">Open planner</button></div><div id="overviewPlan"></div></div><div class="v36-card"><h3>Revision to prioritise</h3><div id="overviewRevision"></div></div></div>
      <div class="v36-grid"><div class="v36-card"><h3>Upcoming examinations</h3><div id="overviewExams"></div></div><div class="v36-card"><h3>Weekly momentum</h3><div id="overviewWeekly"></div></div></div>`,
    planner: `<div class="v36-pagehead"><div><p class="eyebrow">PLAN YOUR WORK</p><h2>Study Planner</h2><p class="muted">Build a realistic plan around your available time, backlog and due revisions.</p></div><span class="v36-pill" id="plannerStatus">Not generated</span></div>
      <div class="v36-grid v36-grid-3"><div class="v36-kpi"><span>Available today</span><b id="plannerAvailLabel">4h</b><small>Daily planning capacity</small></div><div class="v36-kpi"><span>Unfinished topics</span><b id="plannerPending">—</b><small>Remaining syllabus</small></div><div class="v36-kpi"><span>Revision due</span><b id="plannerDue">—</b><small>Current revision queue</small></div></div>
      <div class="v36-card"><h3>Plan settings</h3><div class="v36-formgrid"><label>Available study minutes<input id="plannerMinutes" type="number" min="30" max="960" step="15" value="240"></label><label>New topics per day<input id="plannerNewLimit" type="number" min="1" max="30" value="5"></label><label>Priority subject<select id="plannerSubject"><option value="">Balanced across subjects</option></select></label></div><div class="v36-actions"><button class="v36-btn primary" id="generateToday">Generate today's plan</button><button class="v36-btn secondary" id="generateWeek">Generate 7-day plan</button><button class="v36-btn ghost" id="clearPlan">Clear plan</button></div><p class="muted">Generated plans are suggestions. They never mark syllabus topics complete or change your locked daily target.</p></div>
      <div class="v36-card"><div class="v36-cardhead"><h3>Next seven days</h3><span class="muted">Select a day to view its plan</span></div><div id="plannerWeek" class="v36-weekdays"></div></div>
      <div class="v36-card"><div class="v36-cardhead"><h3 id="plannerPlanTitle">Today's plan</h3><span class="muted" id="plannerPlanMeta"></span></div><div id="plannerPlan"></div></div>
      <div class="v36-card"><div class="v36-cardhead"><h3>Quick inbox</h3><span class="muted">Captured tasks and reminders</span></div><div id="quickInbox"></div></div>` ,
    focus: `<div class="v36-pagehead"><div><p class="eyebrow">DEEP WORK</p><h2>Focus Timer</h2><p class="muted">Record focused study time and optionally link sessions to a topic.</p></div><span class="v36-pill" id="focusStatus">Ready</span></div>
      <div class="v36-card v36-timer-card"><div class="v36-segment" id="timerModes"><button data-mode="pomodoro" class="active">Pomodoro</button><button data-mode="stopwatch">Stopwatch</button><button data-mode="custom">Custom</button></div><div class="v36-timer" id="timerDisplay">25:00</div><p class="muted" id="timerHint">25 minutes focus · 5 minute break</p><div class="v36-actions center"><button class="v36-btn primary" id="timerStart">Start focus</button><button class="v36-btn secondary" id="timerPause" disabled>Pause</button><button class="v36-btn ghost" id="timerReset">Stop &amp; save</button></div></div>
      <div class="v36-card"><h3>Session details</h3><div class="v36-formgrid"><label>Link subject<select id="focusSubject"><option value="">No subject</option></select></label><label>Link topic<select id="focusTopic"><option value="">No topic</option></select></label><label>Custom duration (minutes)<input id="focusCustomMinutes" type="number" min="1" max="240" value="45"></label></div><p class="muted">A timer session records time only; it does not complete syllabus topics.</p></div>
      <div class="v36-card"><div class="v36-cardhead"><h3>Recent sessions</h3><b id="focusTotalToday">0 min today</b></div><div id="focusSessions"></div></div>`,
    topichub: `<div class="v36-pagehead"><div><p class="eyebrow">PERSONAL KNOWLEDGE LIBRARY</p><h2>Topic Hub</h2><p class="muted">Keep notes, important points and personal reminders attached to syllabus topics.</p></div></div>
      <div class="v36-card"><label>Find a topic<select id="hubTopic"><option value="">Choose a topic</option></select></label><div id="hubTopicMeta" class="muted">Select a topic to open its hub.</div><label>Personal notes<textarea id="hubNotes" rows="9" placeholder="Write your notes, high-yield points, clinical correlations or reminders..."></textarea></label><div class="v36-formgrid"><label>Importance<select id="hubImportance"><option value="normal">Normal</option><option value="high">High-yield</option><option value="weak">Difficult / weak</option></select></label><label>Resource link<input id="hubLink" type="url" placeholder="https://..."></label></div><div class="v36-actions"><button class="v36-btn primary" id="hubSave">Save topic notes</button><button class="v36-btn secondary" id="hubFavourite">☆ Favourite</button></div><p class="muted" id="hubSaved"></p></div>
      <div class="v36-card"><h3>Saved topic notes</h3><input id="hubSearch" placeholder="Search saved notes..."><div id="hubSavedList"></div></div>`,
    analytics: `<div class="v36-pagehead"><div><p class="eyebrow">MEASURE WHAT MATTERS</p><h2>Analytics</h2><p class="muted">Your academic activity, consistency and syllabus progress.</p></div><span class="v36-pill">Personal insights</span></div>
      <div class="v36-grid v36-grid-4" id="analyticsKpis"></div>
      <div class="v36-card"><div class="v36-cardhead"><h3>Study activity heatmap</h3><select id="heatMetric"><option value="minutes">Study minutes</option><option value="topics">Topics completed</option><option value="sessions">Focus sessions</option></select></div><div id="studyHeatmap" class="v36-heatmap"></div><p class="muted">Last 26 weeks. Each cell represents one day; darker cells indicate more activity.</p></div>
      <div class="v36-grid"><div class="v36-card"><h3>Subject completion</h3><div id="subjectAnalytics"></div></div><div class="v36-card"><h3>Weekly study time</h3><div id="weeklyAnalytics"></div></div></div>
      <div class="v36-card"><h3>Planning accuracy</h3><div id="planAnalytics"></div></div><div class="v36-card"><h3>Weekly review</h3><div id="weeklyReview"></div></div>`,
    examinations: `<div class="v36-pagehead"><div><p class="eyebrow">WORK BACKWARDS FROM YOUR EXAMS</p><h2>Examinations</h2><p class="muted">Track exam dates, scoped syllabus and estimated preparation readiness.</p></div></div>
      <div class="v36-card"><h3>Add examination</h3><div class="v36-formgrid"><label>Examination name<input id="examName" placeholder="e.g. Final Professional MBBS"></label><label>Exam date<input id="examDateV36" type="date"></label><label>Subjects<select id="examSubjects" multiple size="4"></select></label></div><p class="muted">Leave subjects unselected to include the full syllabus. Use Ctrl/Command to select multiple subjects on desktop.</p><button class="v36-btn primary" id="addExam">Add examination</button></div>
      <div id="examCards"></div>`,
    assessments: `<div class="v36-pagehead"><div><p class="eyebrow">TEST · LEARN · IMPROVE</p><h2>Mock Tests & Assessments</h2><p class="muted">Record scores, analyse trends and convert mistakes into revision tasks.</p></div></div>
      <div class="v36-card"><h3>Record a test</h3><div class="v36-formgrid"><label>Test name<input id="testName" placeholder="e.g. Marrow GT 01"></label><label>Date<input id="testDate" type="date"></label><label>Subject<select id="testSubject"></select></label><label>Marks obtained<input id="testScore" type="number" min="0" step="any"></label><label>Total marks<input id="testTotal" type="number" min="1" step="any"></label></div><label>Mistake category<select id="testMistakeType"><option value="knowledge">Knowledge gap</option><option value="conceptual">Conceptual error</option><option value="memory">Memory error</option><option value="misinterpretation">Misinterpretation</option><option value="careless">Careless / silly mistake</option></select></label><label>Test notes / mistakes<textarea id="testMistakes" rows="3" placeholder="What went wrong? Which concepts need work?"></textarea></label><label>Link a syllabus topic<select id="testTopic"><option value="">No linked topic</option></select></label><button class="v36-btn primary" id="saveTest">Save assessment</button></div>
      <div class="v36-grid"><div class="v36-card"><h3>Performance summary</h3><div id="testSummary"></div></div><div class="v36-card"><h3>Score trend</h3><div id="testTrend"></div></div></div>
      <div class="v36-card"><h3>Assessment history</h3><div id="testHistory"></div></div>`,
    assistant: `<div class="v36-pagehead"><div><p class="eyebrow">YOUR STUDY COPILOT</p><h2>Study Assistant</h2><p class="muted">A separate, persistent conversation space for your study workflow.</p></div><span class="v36-pill" id="assistantMode">Gemini ready</span></div>
      <div class="v36-chat-shell">
        <aside class="v36-chat-sidebar">
          <button type="button" class="v36-btn primary v36-new-chat" id="assistantNewChat">＋ New chat</button>
          <div class="v36-chat-list" id="assistantChatList" aria-label="Chat history"></div>
          <p class="v36-chat-privacy">Chats are saved with your tracker account. Only the active conversation is sent as chat history to Gemini.</p>
        </aside>
        <section class="v36-chat-main">
          <div class="v36-chat-toolbar"><strong id="assistantChatTitle">New conversation</strong><button type="button" class="v36-mini" id="assistantRenameChat">Rename</button></div>
          <div class="v36-chat-messages" id="assistantMessages" aria-live="polite"></div>
          <div class="v36-chat-composer">
            <div class="v36-suggestions"><button data-prompt="I have 3 hours today. What should I study?">Plan 3 hours</button><button data-prompt="Which subjects are weakest?">Weak subjects</button><button data-prompt="What revisions are overdue?">Overdue revision</button><button data-prompt="Analyse my progress this week">Weekly progress</button></div>
            <textarea id="assistantPrompt" rows="3" placeholder="Ask about your study plan, syllabus, revisions or progress…"></textarea>
            <div class="v36-chat-compose-footer"><small>Enter to send · Shift + Enter for a new line</small><button class="v36-btn primary" id="assistantAsk">Send message ↑</button></div>
          </div>
        </section>
      </div>`
  };
  Object.entries(pages).forEach(([id,html])=>{ if(!$(`${id}`)){const s=document.createElement('section');s.id=id;s.className='page v36-page';s.innerHTML=html;document.querySelector('main').appendChild(s);} });

  // The legacy daily summary belongs to Overview only, not to every tracker page.
  const overview = $('overview');
  if (overview) {
    let summary = $('overviewSummary');
    if (!summary) {
      summary = document.createElement('div'); summary.id = 'overviewSummary'; summary.className = 'v36-overview-summary';
      const todayCard = $('todayCard'), stats = document.querySelector('main > .stats:not(.smallstats)'), cloudbar = document.querySelector('main > .cloudbar');
      if (todayCard) summary.appendChild(todayCard);
      if (stats) summary.appendChild(stats);
      if (cloudbar) summary.appendChild(cloudbar);
      overview.prepend(summary);
    }
  }

  const st = state();
  st.planner = {availableMinutes:240,newLimit:5,days:{},completed:{},generatedAt:null,prioritySubject:'',...(st.planner||{}),days:{...(st.planner?.days||{})},completed:{...(st.planner?.completed||{})}};
  st.sessions = Array.isArray(st.sessions) ? st.sessions : [];
  st.topicNotes = st.topicNotes && typeof st.topicNotes==='object' ? st.topicNotes : {};
  st.exams = Array.isArray(st.exams) ? st.exams : [];
  st.assessments = Array.isArray(st.assessments) ? st.assessments : [];
  st.mistakes = Array.isArray(st.mistakes) ? st.mistakes : [];
  st.favourites = st.favourites && typeof st.favourites==='object' ? st.favourites : {};
  st.userGoals = {weeklyMinutes:1200,weeklyTopics:35,...(st.userGoals||{})};
  st.focus = {mode:'pomodoro',duration:1500,elapsed:0,startedAt:null,sessionStartedAt:null,paused:true,break:false,subject:'',topicKey:'',...(st.focus||{})};
  st.preferences = {theme:'system',...(st.preferences||{})};
  st.assistantHistory = Array.isArray(st.assistantHistory) ? st.assistantHistory : [];
  st.assistantChats = Array.isArray(st.assistantChats) ? st.assistantChats : [];
  st.assistantActiveChatId = st.assistantActiveChatId || null;
  if (!st.assistantChats.length && st.assistantHistory.length) {
    const legacy = st.assistantHistory.slice(-30).flatMap(x => [
      { role: 'user', content: String(x.prompt || ''), createdAt: x.date || new Date().toISOString() },
      { role: 'assistant', content: String(x.reply || ''), model: x.model || '', createdAt: x.date || new Date().toISOString(), actions: [] }
    ]).filter(x => x.content);
    if (legacy.length) {
      const id = 'chat-' + Date.now().toString(36);
      st.assistantChats.push({ id, title: 'Previous assistant history', createdAt: legacy[0].createdAt, updatedAt: legacy.at(-1).createdAt, messages: legacy });
      st.assistantActiveChatId = id;
    }
  }

  st.quickItems = Array.isArray(st.quickItems) ? st.quickItems : [];
  core.save();

  function navigate(id){
    if(!pages[id] && !document.getElementById(id)) return;
    try{localStorage.setItem('MBBS_V36_LAST_PAGE',id)}catch{}
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id));
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
    if(id==='overview')renderOverview(); if(id==='planner')renderPlanner(); if(id==='focus')renderFocus(); if(id==='topichub')renderHub(); if(id==='analytics')renderAnalytics(); if(id==='examinations')renderExams(); if(id==='assessments')renderTests(); if(id==='assistant')renderAssistant();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  nav.addEventListener('click',e=>{const b=e.target.closest('button[data-page]');if(!b||!pages[b.dataset.page])return;e.preventDefault();e.stopImmediatePropagation();navigate(b.dataset.page);});
  // Existing pages receive the same polished navigation behaviour on click.
  nav.querySelectorAll('button[data-page]').forEach(b=>{if(pages[b.dataset.page])return; b.addEventListener('click',()=>{try{localStorage.setItem('MBBS_V36_LAST_PAGE',b.dataset.page)}catch{};document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('#nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.page)?.classList.add('active');});});

  const subjectOptions = () => core.subjects().map(s=>`<option value="${esc(s)}">${esc(core.subjectLabel(s))}</option>`).join('');
  const topicOptions = () => topics().map(x=>`<option value="${esc(x.k)}">${esc(core.subjectLabel(x.s))} · ${esc(x.h)} · ${esc(x.t.title)}</option>`).join('');
  function fillSelect(id,allLabel='Select subject'){const el=$(id);if(el)el.innerHTML=`<option value="">${esc(allLabel)}</option>`+subjectOptions();}
  fillSelect('plannerSubject','Balanced across subjects'); fillSelect('focusSubject','No subject'); fillSelect('testSubject','Select subject');
  ['hubTopic','focusTopic','testTopic'].forEach(id=>{const el=$(id);if(el)el.innerHTML='<option value="">Choose a topic</option>'+topicOptions();});
  const examSub=$('examSubjects'); if(examSub)examSub.innerHTML=subjectOptions();
  const planMap = () => state().planner.days ||= {};
  const parseMinutes = v => Math.max(30,Math.min(960,parseInt(v||240,10)||240));
  const dueRevisions = () => (core.revisionItems()||[]).filter(x=>x.due<=today()).sort((a,b)=>a.due.localeCompare(b.due));
  let plannerViewDate=today();
  function generatePlan(day,minutes,newLimit,subject=''){
    const s=state(), all=topics();
    const earlier=Object.values(planMap()).filter(p=>p.date>=today()&&p.date<day);
    const assignedTopics=new Set(earlier.flatMap(p=>p.tasks.filter(t=>t.type==='study').map(t=>t.topicKey)));
    const assignedRevision=new Set(earlier.flatMap(p=>p.tasks.filter(t=>t.type==='revision').map(t=>t.topicKey)));
    const rev=(core.revisionItems()||[]).filter(x=>x.due<=day&&!assignedRevision.has(x.k)).sort((a,b)=>a.due.localeCompare(b.due));
    const tasks=[]; let remaining=minutes;
    const revCap=Math.min(Math.floor(minutes*.3),rev.length*15);
    let usedRev=0;
    rev.slice(0,Math.min(rev.length,Math.floor(revCap/15))).forEach(x=>{const m=15;if(remaining>=m){tasks.push({id:'rev-'+x.k,date:day,type:'revision',topicKey:x.k,title:`Revise: ${x.t.title}`,subject:x.s,minutes:m,createdAt:Date.now()});remaining-=m;usedRev+=m;}});
    const pending=all.filter(x=>!s.done[x.k]&&!assignedTopics.has(x.k));
    const nextExam=(s.exams||[]).filter(ex=>ex.date>=day).sort((a,b)=>a.date.localeCompare(b.date))[0];
    const examPriority=new Set(nextExam&&nextExam.date<=shift(day,30)?(nextExam.subjects||[]):[]);
    const weakTopics=new Set((s.mistakes||[]).filter(m=>!m.resolved).map(m=>m.topicKey));
    const byPriority=pending.sort((a,b)=>{
      const ap=subject&&a.s===subject?0:examPriority.has(a.s)?1:2,bp=subject&&b.s===subject?0:examPriority.has(b.s)?1:2;
      if(ap!==bp)return ap-bp;
      const aw=weakTopics.has(a.k)?0:1,bw=weakTopics.has(b.k)?0:1;if(aw!==bw)return aw-bw;
      return a.si-b.si||a.hi-b.hi||a.ti-b.ti;
    });
    let count=0;
    for(const x of byPriority){if(count>=newLimit||remaining<5)break;const m=durationMinutes(x.t.duration);if(m>remaining)continue;tasks.push({id:'study-'+x.k,date:day,type:'study',topicKey:x.k,title:x.t.title,subject:x.s,header:x.h,minutes:m,createdAt:Date.now()});remaining-=m;count++;}
    const plan={date:day,minutes,createdAt:Date.now(),tasks,bufferMinutes:Math.max(0,remaining),revisionMinutes:usedRev};
    planMap()[day]=plan; s.planner.generatedAt=Date.now(); s.planner.availableMinutes=minutes;s.planner.newLimit=newLimit; core.save(); return plan;
  }
  function renderOverview(){
    const s=state(),all=topics(),done=all.filter(x=>s.done[x.k]).length,percent=Math.round(done/Math.max(1,all.length)*100),due=dueRevisions(),todayPlan=planMap()[today()],todaySessions=s.sessions.filter(x=>x.date===today()),focusMin=Math.round(todaySessions.reduce((a,x)=>a+x.seconds,0)/60),upcoming=s.exams.filter(x=>x.date>=today()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3),week=shift(today(),-6),weekMinutes=Math.round(minsWeek(s)),weekTopics=Object.values(s.completionDates||{}).filter(d=>d>=week&&d<=today()).length;
    $('overviewDate').textContent=niceDate(today());
    $('overviewMetrics').innerHTML=`<div class="v36-kpi"><span>Syllabus complete</span><b>${percent}%</b><small>${done} of ${all.length} topics</small></div><div class="v36-kpi"><span>Backlog</span><b>${s.backlog||0}</b><small>Unfinished target topics</small></div><div class="v36-kpi"><span>Revision due</span><b>${due.length}</b><small>Due or overdue items</small></div><div class="v36-kpi"><span>Focus today</span><b>${focusMin} min</b><small>${todaySessions.length} recorded sessions</small></div>`;
    $('overviewPlan').innerHTML=todayPlan?.tasks?.length?todayPlan.tasks.slice(0,6).map(t=>`<div class="v36-listrow"><span><b>${esc(t.title)}</b><small>${esc(core.subjectLabel(t.subject||''))} · ${t.minutes} min · ${t.type==='revision'?'Revision':'Study'}</small></span><small>${t.type==='study'?(s.done[t.topicKey]?'Done':'Planned'):(s.planner.completed?.[t.id]?'Rated':'Due')}</small></div>`).join(''):'<p class="muted">No plan for today yet. Generate one in the Study Planner.</p>';
    $('overviewRevision').innerHTML=due.slice(0,5).map(x=>`<div class="v36-listrow"><span><b>${esc(x.t.title)}</b><small>${esc(core.subjectLabel(x.s))} · ${esc(x.due)}</small></span><small>${esc(x.difficulty||'new')}</small></div>`).join('')||'<p class="muted">Nothing is due right now.</p>';
    $('overviewExams').innerHTML=upcoming.map(x=>{const days=Math.ceil((new Date(x.date+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000);return `<div class="v36-listrow"><span><b>${esc(x.name)}</b><small>${niceDate(x.date)}</small></span><strong>${days} days</strong></div>`}).join('')||'<p class="muted">Add your next examination to see its countdown here.</p>';
    $('overviewWeekly').innerHTML=`<div class="v36-grid v36-grid-3"><div><b class="v36-number">${weekTopics}</b><small>Topics this week</small></div><div><b class="v36-number">${(weekMinutes/60).toFixed(1)}h</b><small>Focus time</small></div><div><b class="v36-number">${computeStreak()}</b><small>Day streak</small></div></div><p class="muted">Weekly goals: ${weekTopics}/${s.userGoals.weeklyTopics||35} topics · ${weekMinutes}/${s.userGoals.weeklyMinutes||1200} study minutes.</p>`;
  }
  function renderPlanner(){
    const s=state(); $('plannerMinutes').value=s.planner.availableMinutes||240; $('plannerNewLimit').value=s.planner.newLimit||5; $('plannerAvailLabel').textContent=`${Math.round((s.planner.availableMinutes||240)/60*10)/10}h`;
    $('plannerPending').textContent=topics().filter(x=>!s.done[x.k]).length; $('plannerDue').textContent=dueRevisions().length;
    $('plannerSubject').value=s.planner.prioritySubject||'';
    const week=Array.from({length:7},(_,i)=>shift(today(),i));
    $('plannerWeek').innerHTML=week.map(d=>{const p=planMap()[d],dayName=new Date(d+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'});return `<button class="v36-day ${plannerViewDate===d?'active':''}" data-plan-date="${d}"><small>${dayName}</small><b>${d.slice(8,10)}</b><span>${p?p.tasks.length+' tasks':'—'}</span></button>`}).join('');
    const selectedPlan=planMap()[plannerViewDate]; $('plannerStatus').textContent=week.filter(d=>planMap()[d]).length?`${week.filter(d=>planMap()[d]).length}/7 days planned`:'Not generated';
    $('plannerPlanTitle').textContent=(plannerViewDate===today()?'Today':new Date(plannerViewDate+'T12:00:00').toLocaleDateString(undefined,{weekday:'long'}))+' · '+niceDate(plannerViewDate);
    $('plannerPlanMeta').textContent=selectedPlan?`${selectedPlan.tasks.length} tasks · ${selectedPlan.tasks.reduce((a,x)=>a+x.minutes,0)} min planned`:'No plan for this day';
    $('plannerPlan').innerHTML = selectedPlan?.tasks.length ? selectedPlan.tasks.map((t, i) => {
      const done = t.type === 'study' ? !!s.done[t.topicKey] : !!s.planner.completed?.[t.id];
      const actions = t.type === 'study'
        ? `<button class="v36-mini" data-goto-topic="${esc(t.topicKey)}">Open topic</button><button class="v36-mini" data-plan-done="${esc(t.id)}" data-plan-date="${plannerViewDate}">${done ? 'Undo' : 'Mark plan task'}</button>`
        : `<button class="v36-mini" data-open-revision>Open revision</button>${done ? '<span class="v36-footnote">Rated</span>' : `<button class="v36-mini" data-plan-rating="forgot" data-plan-topic="${esc(t.topicKey)}">Forgot</button><button class="v36-mini" data-plan-rating="good" data-plan-topic="${esc(t.topicKey)}">Good</button><button class="v36-mini" data-plan-rating="easy" data-plan-topic="${esc(t.topicKey)}">Easy</button>`}`;
      return `<div class="v36-task ${done ? 'is-done' : ''}"><div class="v36-taskmark">${done ? '✓' : i + 1}</div><div class="v36-taskbody"><b>${esc(t.title)}</b><small>${esc(core.subjectLabel(t.subject || ''))} · ${t.minutes} min · ${t.type === 'revision' ? 'Revision' : 'Study'}</small></div><div class="v36-taskactions">${actions}</div></div>`;
    }).join('') + `<div class="v36-footnote">Buffer available: ${selectedPlan.bufferMinutes} min</div>` : "<div class=\"v36-empty\">No plan generated for this day. Generate today's or the seven-day plan above.</div>";
    renderQuickInbox();
  }
  $('overview').addEventListener('click',e=>{const b=e.target.closest('[data-overview-go]');if(b)navigate(b.dataset.overviewGo);});
  $('generateToday').onclick=()=>{const min=parseMinutes($('plannerMinutes').value),limit=Math.max(1,Math.min(30,parseInt($('plannerNewLimit').value||5,10))),subject=$('plannerSubject').value;state().planner.prioritySubject=subject;delete planMap()[today()];plannerViewDate=today();generatePlan(today(),min,limit,subject);renderPlanner();};
  $('generateWeek').onclick=()=>{const min=parseMinutes($('plannerMinutes').value),limit=Math.max(1,Math.min(30,parseInt($('plannerNewLimit').value||5,10))),subject=$('plannerSubject').value;state().planner.prioritySubject=subject;for(let i=0;i<7;i++)delete planMap()[shift(today(),i)];for(let i=0;i<7;i++)generatePlan(shift(today(),i),min,limit,subject);plannerViewDate=today();renderPlanner();};
  $('clearPlan').onclick=()=>{if(!confirm('Clear generated plans for the next seven days?'))return;for(let i=0;i<7;i++)delete planMap()[shift(today(),i)];core.save();renderPlanner();};
  $('plannerWeek').addEventListener('click',e=>{const b=e.target.closest('[data-plan-date]');if(b){plannerViewDate=b.dataset.planDate;renderPlanner();}});
  function applyRevisionRating(topicKey,rating){const x=topics().find(t=>t.k===topicKey);if(!x)return;const h=state().revision.history[topicKey]||{cycle:0,reviews:[]};h.reviews||=[];h.reviews.push({date:today(),rating});const intervals=(state().revision.settings.difficultyIntervals?.[rating]||state().revision.settings.intervals).map(Number).filter(n=>n>0);let i;if(rating==='forgot'){i=Math.min(h.fs||0,intervals.length-1);h.fs=(h.fs||0)+1;h.cycle=0;}else{i=Math.min(h.cycle||0,intervals.length-1);h.cycle=(h.cycle||0)+1;h.fs=0;}h.difficulty=rating;h.next=shift(today(),intervals[i]||1);state().revision.history[topicKey]=h;if(!state().done[topicKey])state().revision.manualQueue=state().revision.manualQueue.filter(k=>k!==topicKey);state().revision.added||={};state().revision.added[topicKey]=true;state().planner.completed||={};state().planner.completed['rev-'+topicKey]=true;state().activity||={};state().activity[today()]=(state().activity[today()]||0)+1;core.save();}
  $('plannerPlan').addEventListener('click',e=>{const rating=e.target.closest('[data-plan-rating]');if(rating){applyRevisionRating(rating.dataset.planTopic,rating.dataset.planRating);renderPlanner();return;}const d=e.target.closest('[data-plan-done]');if(d){const id=d.dataset.planDone;const t=planMap()[d.dataset.planDate||plannerViewDate]?.tasks.find(x=>x.id===id);if(!t)return;if(t.type==='study'&&state().done[t.topicKey])return alert('This topic is completed in the syllabus.');state().planner.completed||={};state().planner.completed[id]=!state().planner.completed[id];core.save();renderPlanner();}const go=e.target.closest('[data-goto-topic]');if(go){navigate('subjects');$('search').value=topics().find(x=>x.k===go.dataset.gotoTopic)?.t.title||'';$('search').dispatchEvent(new Event('input'));}if(e.target.closest('[data-open-revision]'))navigate('revision');});
  function renderQuickInbox(){const items=state().quickItems.filter(x=>!x.done).sort((a,b)=>(a.date||'').localeCompare(b.date||''));$('quickInbox').innerHTML=items.slice(0,20).map(x=>`<div class="v36-listrow"><span><b>${esc(x.title)}</b><small>${esc(x.type)} · ${x.date?niceDate(x.date):'No date'}${x.topicTitle?' · '+esc(x.topicTitle):''}</small></span><button class="v36-mini" data-quick-done="${esc(x.id)}">Done</button></div>`).join('')||'<p class="muted">Your quick inbox is clear.</p>';}
  $('quickInbox').addEventListener('click',e=>{const b=e.target.closest('[data-quick-done]');if(!b)return;const item=state().quickItems.find(x=>x.id===b.dataset.quickDone);if(item)item.done=true;core.save();renderQuickInbox();});

  // Focus timer
  let timerHandle=null;
  function timerElapsed(){const f=state().focus;return f.elapsed+(f.startedAt&&!f.paused?Math.max(0,Math.floor((Date.now()-f.startedAt)/1000)):0);}
  function timerRemaining(){const f=state().focus;return Math.max(0,(f.mode==='stopwatch'?0:f.duration)-timerElapsed());}
  function renderFocus(){const f=state().focus;const elapsed=timerElapsed();$('timerDisplay').textContent=fmt(f.mode==='stopwatch'?elapsed:timerRemaining());$('focusStatus').textContent=f.paused?'Paused / Ready':(f.break?'Break':'Focusing');$('timerStart').disabled=!f.paused;$('timerPause').disabled=f.paused;$('timerStart').textContent=elapsed?'Resume':(f.break?'Start break':'Start focus');$('timerHint').textContent=f.mode==='pomodoro'?(f.break?'5-minute break · next is a 25-minute focus':'25-minute focus · 5-minute break'):f.mode==='stopwatch'?'Stopwatch · pause or stop to save a session':'Custom focus session';$('timerModes').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===f.mode));$('focusSubject').value=f.subject||'';populateFocusTopics();$('focusTopic').value=f.topicKey||'';$('focusSessions').innerHTML=state().sessions.slice().reverse().slice(0,12).map(x=>`<div class="v36-listrow"><span><b>${esc(x.topicTitle||x.subject||'Study session')}</b><small>${niceDate(x.date)} · ${Math.round(x.seconds/60)} min</small></span><strong>${fmt(x.seconds)}</strong></div>`).join('')||'<p class="muted">No sessions recorded yet.</p>';
    const mins=state().sessions.filter(x=>x.date===today()).reduce((a,x)=>a+x.seconds,0)+Math.min(elapsed,86400);$('focusTotalToday').textContent=`${Math.round(mins/60)} min today`;}
  function populateFocusTopics(){const s=$('focusSubject').value;const sel=$('focusTopic');const arr=topics().filter(x=>!s||x.s===s);const old=sel.value;sel.innerHTML='<option value="">No topic</option>'+arr.map(x=>`<option value="${esc(x.k)}">${esc(x.t.title)}</option>`).join('');if(arr.some(x=>x.k===old))sel.value=old;}
  $('focusSubject').onchange=()=>{state().focus.subject=$('focusSubject').value;populateFocusTopics();core.save();};$('focusTopic').onchange=()=>{state().focus.topicKey=$('focusTopic').value;core.save();};
  $('timerModes').onclick=e=>{const b=e.target.closest('button[data-mode]');if(!b)return;if(!state().focus.paused){if(!confirm('Switching timer mode will discard the current unsaved timer. Continue?'))return;}const f=state().focus;f.mode=b.dataset.mode;f.elapsed=0;f.startedAt=null;f.sessionStartedAt=null;f.paused=true;f.duration=f.mode==='pomodoro'?1500:f.mode==='custom'?Math.max(60,Number($('focusCustomMinutes').value||45)*60):0;f.break=false;core.save();renderFocus();};
  $('focusCustomMinutes').onchange=()=>{if(state().focus.mode==='custom'&&state().focus.paused){state().focus.duration=Math.max(60,Math.min(14400,Number($('focusCustomMinutes').value||45)*60));core.save();renderFocus();}};
  $('timerStart').onclick=()=>{const f=state().focus;if(f.mode==='custom'&&f.paused&&f.elapsed===0)f.duration=Math.max(60,Math.min(14400,Number($('focusCustomMinutes').value||45)*60));if(!f.elapsed)f.sessionStartedAt=new Date().toISOString();f.startedAt=Date.now();f.paused=false;core.save();renderFocus();};
  $('timerPause').onclick=()=>{const f=state().focus;f.elapsed=timerElapsed();f.startedAt=null;f.paused=true;core.save();renderFocus();};
  function stopTimer(completed=false){const f=state().focus;const wasBreak=!!f.break;const seconds=timerElapsed();if(seconds>=15&&!wasBreak){const tp=topics().find(x=>x.k===f.topicKey);state().sessions.push({id:'s'+Date.now(),date:today(),startedAt:f.sessionStartedAt||new Date(Date.now()-seconds*1000).toISOString(),seconds,mode:f.mode,subject:f.subject||tp?.s||'',topicKey:f.topicKey||'',topicTitle:tp?.t.title||''});state().activity||={};state().activity[today()]=(state().activity[today()]||0)+Math.max(1,Math.round(seconds/60));}
    f.elapsed=0;f.startedAt=null;f.sessionStartedAt=null;f.paused=true;if(f.mode==='pomodoro'&&completed){f.break=!wasBreak;f.duration=f.break?300:1500;}else{f.duration=f.mode==='pomodoro'?1500:f.mode==='custom'?Math.max(60,Number($('focusCustomMinutes').value||45)*60):0;f.break=false;}core.save();renderFocus();}
  $('timerReset').onclick=()=>{if(!state().focus.paused&&!confirm('Stop and save this timer session?'))return;stopTimer(false);};
  function timerTick(){const f=state().focus;if(!f.paused){if(f.mode!=='stopwatch'&&timerRemaining()<=0){const wasBreak=!!f.break;stopTimer(true);alert(f.mode==='pomodoro'?(wasBreak?'Break complete. Back to focus!':'Focus session complete. Take a break!'):'Custom focus complete.');}else renderFocus();}}
  timerHandle=setInterval(timerTick,1000); document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderFocus();});
  window.addEventListener('beforeunload',()=>{const f=state().focus;if(!f.paused){f.elapsed=timerElapsed();f.startedAt=null;f.paused=true;core.save();}});

  // Topic Hub
  function renderHub(){const sel=$('hubTopic');if(!sel.options.length||sel.options.length<topics().length)sel.innerHTML='<option value="">Choose a topic</option>'+topicOptions();renderHubList();loadHubTopic();}
  function loadHubTopic(){const k=$('hubTopic').value, x=topics().find(t=>t.k===k), n=state().topicNotes[k]||{};$('hubNotes').value=n.notes||'';$('hubImportance').value=n.importance||'normal';$('hubLink').value=n.link||'';$('hubTopicMeta').textContent=x?`${core.subjectLabel(x.s)} · ${x.h} · ${x.t.duration||'Duration not set'} · ${state().done[k]?'Completed':'Not completed'}`:'Select a topic to open its hub.';$('hubFavourite').textContent=state().favourites[k]?'★ Favourite':'☆ Favourite';let link='';try{const u=new URL(n.link);if(['http:','https:'].includes(u.protocol))link=`<a href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">Open saved resource ↗</a>`;}catch{}$('hubSaved').innerHTML=link;}
  $('hubTopic').onchange=loadHubTopic;
  $('hubSave').onclick=()=>{const k=$('hubTopic').value;if(!k)return alert('Choose a topic first.');state().topicNotes[k]={notes:$('hubNotes').value,importance:$('hubImportance').value,link:$('hubLink').value.trim(),updatedAt:new Date().toISOString()};core.save();$('hubSaved').textContent='Saved on this device; cloud sync will follow when online.';renderHubList();};
  $('hubFavourite').onclick=()=>{const k=$('hubTopic').value;if(!k)return alert('Choose a topic first.');state().favourites[k]=!state().favourites[k];core.save();loadHubTopic();};
  $('hubSearch').oninput=renderHubList;
  function renderHubList(){const q=$('hubSearch').value.trim().toLowerCase();const rows=Object.entries(state().topicNotes).filter(([k,n])=>{const x=topics().find(t=>t.k===k);return x&&(q=== ''||(x.t.title+' '+x.s+' '+n.notes).toLowerCase().includes(q));}).sort((a,b)=>(b[1].updatedAt||'').localeCompare(a[1].updatedAt||''));$('hubSavedList').innerHTML=rows.slice(0,100).map(([k,n])=>{const x=topics().find(t=>t.k===k);return `<button class="v36-note-row" data-note-key="${esc(k)}"><span><b>${esc(x.t.title)}</b><small>${esc(core.subjectLabel(x.s))} · ${esc(n.importance||'normal')} · Updated ${niceDate((n.updatedAt||today()).slice(0,10))}</small></span><span>${state().favourites[k]?'★':'→'}</span></button>`}).join('')||'<p class="muted">No saved notes yet.</p>';}
  $('hubSavedList').onclick=e=>{const b=e.target.closest('[data-note-key]');if(b){$('hubTopic').value=b.dataset.noteKey;loadHubTopic();$('hubNotes').focus();}};

  // Analytics
  function minsWeek(s){const start=shift(today(),-6);return s.sessions.filter(x=>x.date>=start&&x.date<=today()).reduce((a,x)=>a+x.seconds,0)/60;}
  function renderAnalytics(){const s=state(),all=topics(),done=all.filter(x=>s.done[x.k]),rev=core.revisionItems(),totalMin=s.sessions.reduce((a,x)=>a+x.seconds,0)/60,streakDays=computeStreak();
    $('analyticsKpis').innerHTML=[[`${Math.round(done.length/Math.max(1,all.length)*100)}%`,'Syllabus completed'],[`${Math.round(totalMin/60*10)/10}h`,'Total focus time'],[rev.filter(x=>x.due<=today()).length,'Revisions due'],[`${streakDays} days`,'Current streak']].map(([v,l])=>`<div class="v36-kpi"><span>${l}</span><b>${v}</b></div>`).join('');
    renderHeatmap();$('subjectAnalytics').innerHTML=core.subjects().map(sub=>{const xs=all.filter(x=>x.s===sub),n=xs.filter(x=>s.done[x.k]).length,p=Math.round(n/Math.max(1,xs.length)*100);return `<div class="v36-barrow"><span>${esc(core.subjectLabel(sub))}</span><div class="v36-bar"><i style="width:${p}%"></i></div><b>${p}%</b></div>`}).join('');
    const week=[];for(let i=6;i>=0;i--){const d=shift(today(),-i);const m=s.sessions.filter(x=>x.date===d).reduce((a,x)=>a+x.seconds,0)/60;week.push({d,m});}const max=Math.max(30,...week.map(x=>x.m));$('weeklyAnalytics').innerHTML=`<div class="v36-weekbars">${week.map(x=>`<div><i style="height:${Math.max(3,x.m/max*100)}%" title="${Math.round(x.m)} min"></i><small>${new Date(x.d+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'})}</small><b>${Math.round(x.m)}</b></div>`).join('')}</div>`;
    const dayPlans=Object.values(s.planner.days||{}).filter(p=>p.date>=shift(today(),-6)&&p.date<=today());const planned=dayPlans.reduce((a,p)=>a+p.tasks.length,0);const completed=dayPlans.reduce((a,p)=>a+p.tasks.filter(t=>t.type==='study'?!!s.done[t.topicKey]:!!s.planner.completed?.[t.id]).length,0);$('planAnalytics').innerHTML=`<div class="v36-grid v36-grid-3"><div><b class="v36-number">${planned}</b><small>Tasks planned</small></div><div><b class="v36-number">${completed}</b><small>Tasks completed</small></div><div><b class="v36-number">${planned?Math.round(completed/planned*100):0}%</b><small>Plan completion</small></div></div>`;
    const weeklyTopics=Object.values(s.completionDates||{}).filter(d=>d>=shift(today(),-6)&&d<=today()).length;const weeklyTarget=s.userGoals?.weeklyTopics||35;const weeklyMinutesTarget=s.userGoals?.weeklyMinutes||1200;const insights=[];if(weeklyTopics<weeklyTarget)insights.push(`You completed ${weeklyTopics}/${weeklyTarget} topic goal this week.`);else insights.push('You met your weekly topic goal.');if(minsWeek(s)<weeklyMinutesTarget)insights.push(`Study time: ${Math.round(minsWeek(s))}/${weeklyMinutesTarget} minutes. Consider scheduling one additional focused block.`);if(dueRevisions().length)insights.push(`${dueRevisions().length} revisions are due or overdue; clear these before adding too many new topics.`);$('weeklyReview').innerHTML=`<div class="v36-grid v36-grid-3"><div><b class="v36-number">${weeklyTopics}</b><small>Topics completed (7 days)</small></div><div><b class="v36-number">${Math.round(minsWeek(s))}</b><small>Focus minutes (7 days)</small></div><div><b class="v36-number">${dueRevisions().length}</b><small>Revisions due</small></div></div><p class="muted">${insights.map(esc).join('<br>')}</p>`;
  }
  function computeStreak(){const active=new Set([...Object.keys(state().activity||{}),...state().sessions.map(x=>x.date)]);let d=today(),n=0;if(!active.has(d))d=shift(d,-1);for(let i=0;i<400&&active.has(d);i++,d=shift(d,-1))n++;return n;}
  function renderHeatmap(){const metric=$('heatMetric').value,days=182,wrap=$('studyHeatmap');const vals=[];for(let i=days-1;i>=0;i--){const d=shift(today(),-i),s=state();let v=0;if(metric==='minutes')v=Math.round(s.sessions.filter(x=>x.date===d).reduce((a,x)=>a+x.seconds,0)/60);else if(metric==='sessions')v=s.sessions.filter(x=>x.date===d).length;else v=Object.values(s.completionDates||{}).filter(x=>x===d).length;vals.push({d,v});}const max=Math.max(1,...vals.map(x=>x.v));wrap.innerHTML=`<div class="v36-heatgrid">${vals.map(x=>`<span title="${x.d}: ${x.v} ${metric}" class="heat-${x.v===0?0:x.v/max<.25?1:x.v/max<.5?2:x.v/max<.75?3:4}"></span>`).join('')}</div><div class="v36-heatlegend"><span>Less</span>${[0,1,2,3,4].map(n=>`<i class="heat-${n}"></i>`).join('')}<span>More</span></div>`;}
  $('heatMetric').onchange=renderHeatmap;

  // Examinations
  $('examDateV36').min=today();
  $('addExam').onclick=()=>{const name=$('examName').value.trim(),date=$('examDateV36').value;if(!name||!date)return alert('Enter an examination name and date.');const subjects=[...$('examSubjects').selectedOptions].map(o=>o.value);state().exams.push({id:'e'+Date.now(),name,date,subjects,createdAt:new Date().toISOString()});core.save();$('examName').value='';$('examDateV36').value='';[...$('examSubjects').options].forEach(o=>o.selected=false);renderExams();};
  function examStats(ex){const xs=topics().filter(x=>!ex.subjects.length||ex.subjects.includes(x.s)),s=state(),n=xs.filter(x=>s.done[x.k]).length,completion=n/Math.max(1,xs.length),reviewed=xs.filter(x=>s.revision.history[x.k]?.reviews?.length).length/Math.max(1,xs.length);const tests=s.assessments.filter(t=>!ex.subjects.length||!t.subject||ex.subjects.includes(t.subject)),avg=tests.length?tests.reduce((a,t)=>a+t.score/Math.max(1,t.total),0)/tests.length:0.5;const mastery=xs.length?xs.filter(x=>['good','easy'].includes(s.revision.history[x.k]?.difficulty)).length/Math.max(1,xs.length):0;const days=Math.ceil((new Date(ex.date+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000);const readiness=Math.round((completion*.4+reviewed*.3+mastery*.2+avg*.1)*100);return {xs,n,completion,reviewed,days,readiness};}
  function renderExams(){const wrap=$('examCards');wrap.innerHTML=state().exams.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(ex=>{const z=examStats(ex);return `<div class="v36-card v36-exam"><div class="v36-cardhead"><div><p class="eyebrow">${z.days>=0?`${z.days} DAYS LEFT`:'EXAM DATE PASSED'}</p><h3>${esc(ex.name)}</h3><small>${niceDate(ex.date)} · ${ex.subjects.length?ex.subjects.map(core.subjectLabel).join(', '):'All subjects'}</small></div><button class="v36-mini danger" data-delete-exam="${ex.id}">Remove</button></div><div class="v36-grid v36-grid-3"><div><b class="v36-number">${Math.round(z.completion*100)}%</b><small>Syllabus coverage</small></div><div><b class="v36-number">${Math.round(z.reviewed*100)}%</b><small>Topics revised</small></div><div><b class="v36-number">${z.readiness}%</b><small>Estimated readiness</small></div></div><div class="v36-bar"><i style="width:${z.readiness}%"></i></div><p class="muted">Readiness estimate: syllabus 40%, revision coverage 30%, mastery ratings 20%, assessment average 10%. Missing assessment data uses a neutral baseline; this is a planning indicator, not a prediction of exam results.</p></div>`}).join('')||'<div class="v36-empty">No examinations added yet.</div>';}
  $('examCards').onclick=e=>{const b=e.target.closest('[data-delete-exam]');if(b&&confirm('Remove this examination?')){state().exams=state().exams.filter(x=>x.id!==b.dataset.deleteExam);core.save();renderExams();}};

  // Mock tests & assessments
  $('testDate').value=today();
  $('testHistory').addEventListener('click',e=>{const b=e.target.closest('[data-mistake-revision]');if(!b)return;const m=state().mistakes.find(x=>x.id===b.dataset.mistakeRevision);if(!m)return;const k=m.topicKey;if(state().done[k]){state().revision.added||={};state().revision.added[k]=true;state().revision.history[k]||={cycle:0,reviews:[]};state().revision.history[k].next=today();}else{state().revision.manualQueue||=[];if(!state().revision.manualQueue.includes(k))state().revision.manualQueue.push(k);}m.resolved=true;core.save();renderTests();alert('Topic added to your revision workflow.');});
  $('saveTest').onclick=()=>{const name=$('testName').value.trim(),score=Number($('testScore').value),total=Number($('testTotal').value),date=$('testDate').value;if(!name||!date||!(total>0)||score<0||score>total)return alert('Enter a test name, date, valid score and total marks.');const subject=$('testSubject').value||'',topicKey=$('testTopic').value||'',note=$('testMistakes').value.trim();const rec={id:'t'+Date.now(),name,date,subject,score,total,topicKey,note,createdAt:new Date().toISOString()};state().assessments.push(rec);if(topicKey&&note){state().mistakes||=[];state().mistakes.push({id:'m'+Date.now(),assessmentId:rec.id,topicKey,note,type:$('testMistakeType').value,date,due:today(),resolved:false});}core.save();$('testName').value='';$('testScore').value='';$('testTotal').value='';$('testMistakes').value='';renderTests();};
  function renderTests(){const a=state().assessments.slice().sort((x,y)=>y.date.localeCompare(x.date)),n=a.length,avg=n?a.reduce((x,y)=>x+y.score/Math.max(1,y.total),0)/n*100:0; $('testSummary').innerHTML=`<div class="v36-grid v36-grid-3"><div><b class="v36-number">${n}</b><small>Tests recorded</small></div><div><b class="v36-number">${n?avg.toFixed(1):'—'}%</b><small>Average score</small></div><div><b class="v36-number">${n?Math.max(...a.map(x=>x.score/x.total*100)).toFixed(1):'—'}%</b><small>Best score</small></div></div>`;
    $('testTrend').innerHTML=a.slice(0,8).reverse().map(x=>`<div class="v36-barrow"><span>${esc(x.name)}</span><div class="v36-bar"><i style="width:${x.score/x.total*100}%"></i></div><b>${(x.score/x.total*100).toFixed(0)}%</b></div>`).join('')||'<p class="muted">Add tests to see your score trend.</p>';
    $('testHistory').innerHTML=a.map(x=>`<div class="v36-listrow"><span><b>${esc(x.name)}</b><small>${niceDate(x.date)} · ${esc(x.subject?core.subjectLabel(x.subject):'Combined')} · ${x.topicKey?'Topic linked':''}</small>${x.note?`<small>${esc(x.note)}</small>`:''}</span><strong>${x.score}/${x.total}<small>${(x.score/x.total*100).toFixed(1)}%</small></strong></div>`).join('')||'<p class="muted">No assessments recorded.</p>';
    const mistakes=(state().mistakes||[]).filter(x=>!x.resolved);$('testHistory').innerHTML+=`<h3 class="v36-subheading">Mistakes to revisit</h3>`+(mistakes.map(m=>{const t=topics().find(x=>x.k===m.topicKey);return `<div class="v36-listrow"><span><b>${esc(t?.t.title||'Removed topic')}</b><small>${esc(m.type)} · ${esc(m.note)}</small></span><button class="v36-mini" data-mistake-revision="${esc(m.id)}">Add to revision</button></div>`}).join('')||'<p class="muted">No linked mistakes.</p>');
  }

  // Built-in local intelligence: deterministic, private, and refreshed from current tracker state.
  function buildLocalInsights(){
    const s=state(),all=topics(),done=all.filter(x=>s.done[x.k]),pending=all.filter(x=>!s.done[x.k]),due=dueRevisions();
    const weekStart=shift(today(),-6),recentSessions=s.sessions.filter(x=>x.date>=weekStart&&x.date<=today());
    const recentMinutes=Math.round(recentSessions.reduce((a,x)=>a+x.seconds,0)/60);
    const completedThisWeek=Object.values(s.completionDates||{}).filter(d=>d>=weekStart&&d<=today()).length;
    const subjects=core.subjects().map(sub=>{const xs=all.filter(x=>x.s===sub),finished=xs.filter(x=>s.done[x.k]).length;return {sub,total:xs.length,done:finished,pct:finished/Math.max(1,xs.length),pending:xs.filter(x=>!s.done[x.k])};}).sort((a,b)=>a.pct-b.pct);
    const exams=(s.exams||[]).map(ex=>({...ex,days:Math.ceil((new Date(ex.date+'T12:00:00')-new Date(today()+'T12:00:00'))/86400000)})).filter(x=>x.days>=0).sort((a,b)=>a.days-b.days);
    const openMistakes=(s.mistakes||[]).filter(x=>!x.resolved);
    const goalMinutes=Number(s.userGoals?.weeklyMinutes||1200),goalTopics=Number(s.userGoals?.weeklyTopics||35);
    const weekday=(new Date(today()+'T12:00:00').getDay()+6)%7+1,expectedMinutes=goalMinutes*weekday/7,expectedTopics=goalTopics*weekday/7;
    const rec=[];
    if(due.length)rec.push({score:100+Math.min(30,due.length),tag:'REVISION',title:`${due.length} revision topic${due.length===1?' is':'s are'} due`,body:`Clear ${Math.min(due.length,Math.max(1,Math.floor((s.planner?.availableMinutes||240)*.25/15)))} first. Prioritise overdue topics before adding more new work.`,action:'Open revision',page:'revision'});
    if(exams.length){const ex=exams[0],exTopics=all.filter(x=>!ex.subjects?.length||ex.subjects.includes(x.s)),exDone=exTopics.filter(x=>s.done[x.k]).length,pct=Math.round(exDone/Math.max(1,exTopics.length)*100);if(ex.days<=30)rec.push({score:95+Math.max(0,30-ex.days),tag:'EXAM',title:`${ex.name} is ${ex.days===0?'today':`in ${ex.days} day${ex.days===1?'':'s'}`}`,body:`${pct}% of its scoped syllabus is complete. Focus on remaining topics and revision coverage.`,action:'View exam',page:'examinations'});}
    const weakest=subjects.find(x=>x.pending.length);if(weakest)rec.push({score:70+(1-weakest.pct)*20,tag:'SYLLABUS',title:`Prioritise ${core.subjectLabel(weakest.sub)}`,body:`${weakest.done}/${weakest.total} topics completed (${Math.round(weakest.pct*100)}%). Start with one manageable pending topic.`,action:'Open planner',page:'planner'});
    if(openMistakes.length)rec.push({score:88,tag:'TEST REVIEW',title:`${openMistakes.length} unresolved test mistake${openMistakes.length===1?'':'s'}`,body:'Convert mistakes into targeted revision instead of only reviewing the overall score.',action:'Review tests',page:'assessments'});
    if(recentMinutes<expectedMinutes*.7)rec.push({score:recentSessions.length?58:76,tag:'CONSISTENCY',title:recentSessions.length?'Study time is below your weekly pace':'No focus sessions logged this week',body:`You have logged ${recentMinutes} minutes; your pace target by today is about ${Math.round(expectedMinutes)} of ${goalMinutes} weekly minutes.`,action:'Start focus',page:'focus'});
    if(completedThisWeek<expectedTopics*.7)rec.push({score:45,tag:'WEEKLY GOAL',title:`${completedThisWeek}/${goalTopics} weekly topics completed`,body:`Your pace target by today is about ${Math.ceil(expectedTopics)} topics. Use a realistic daily target and protect time for due revision.`,action:'View analytics',page:'analytics'});
    if(!rec.length)rec.push({score:10,tag:'ON TRACK',title:'No urgent study risks detected',body:'Keep following your plan. Revisit this panel after logging study sessions or completing topics.',action:'Open planner',page:'planner'});
    return {rec:rec.sort((a,b)=>b.score-a.score).slice(0,4),all,done,pending,due,subjects,recentMinutes,completedThisWeek,recentSessions,exams,openMistakes,goalMinutes,goalTopics};
  }
  function assistantAnswer(prompt){
    const p=prompt.toLowerCase(),z=buildLocalInsights(),s=state();
    if(/weak|neglect|behind/.test(p))return `Your least-complete subjects right now:\n${z.subjects.slice(0,6).map(x=>`• ${core.subjectLabel(x.sub)}: ${x.done}/${x.total} (${Math.round(x.pct*100)}%)`).join('\n')}\n\nStart with one topic from the weakest subject, then reassess after a few sessions.`;
    if(/revision|overdue|revise/.test(p))return `There are ${z.due.length} revision items due or overdue.\n${z.due.slice(0,15).map(x=>`• ${x.t.title} — ${core.subjectLabel(x.s)} (due ${x.due})`).join('\n')||'No revisions are currently due.'}\n\nClear overdue items before adding too many new topics.`;
    if(/week|progress|month|analyse|analyze|performance/.test(p))return `Your last 7 days:\n• Focus time: ${z.recentMinutes} minutes (${(z.recentMinutes/60).toFixed(1)} hours)\n• Topics completed: ${z.completedThisWeek}\n• Focus sessions: ${z.recentSessions.length}\n• Revisions due now: ${z.due.length}\n• Syllabus completion: ${Math.round(z.done.length/Math.max(1,z.all.length)*100)}%\n• Weekly study-time goal: ${z.goalMinutes} minutes\n• Weekly topic goal: ${z.goalTopics}\n\nNext priority: ${z.rec[0].title}.`;
    if(/mistake|wrong|test|assessment/.test(p))return `You have ${z.openMistakes.length} unresolved mistake-linked revision item(s).\n${z.openMistakes.slice(0,12).map(m=>{const t=z.all.find(x=>x.k===m.topicKey);return `• ${t?.t.title||'Topic'} — ${m.type||'Review'}: ${m.note||'Revisit the linked concept'}`}).join('\n')||'No unresolved mistakes are recorded.'}\n\nUse the Tests page to convert each mistake into a revision task.`;
    const match=p.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/),mins=match?Math.max(30,Math.round(Number(match[1])*60)):Number(s.planner.availableMinutes||180),revMinutes=Math.min(z.due.length*15,Math.floor(mins*.3/15)*15),remaining=Math.max(0,mins-revMinutes),limit=Math.min(8,Math.max(1,Math.floor(remaining/30)));
    const prioritized=z.pending.slice().sort((a,b)=>{const ai=z.subjects.findIndex(x=>x.sub===a.s),bi=z.subjects.findIndex(x=>x.sub===b.s);return ai-bi;}).slice(0,limit);
    return `Suggested ${Math.round(mins/60*10)/10}-hour study block based on your latest tracker data:\n\n${revMinutes?`1. Revise due topics — ${revMinutes} minutes\n`:''}${prioritized.map((x,i)=>`${i+(revMinutes?2:1)}. ${core.subjectLabel(x.s)} · ${x.t.title} — approx. ${durationMinutes(x.t.duration)} min`).join('\n')||'Use this time for active recall and consolidation.'}\n\nYour highest-priority alert: ${z.rec[0].title}. Keep a 10–15 minute buffer. Generate a formal plan in Planner to save and track tasks.`;
  }
  function buildAssistantContext(){const z=buildLocalInsights(),s=state();return {today:today(),syllabus:{completed:z.done.length,pending:z.pending.length,total:z.all.length},backlog:s.backlog||0,subjects:z.subjects.map(x=>({subject:core.subjectLabel(x.sub),completed:x.done,total:x.total})),revisionDue:z.due.length,unresolvedMistakes:z.openMistakes.length,recentStudyMinutes:z.recentMinutes,recentTopicsCompleted:z.completedThisWeek,weeklyGoals:{minutes:z.goalMinutes,topics:z.goalTopics},upcomingExams:z.exams.slice(0,3).map(x=>({name:x.name,date:x.date,daysRemaining:x.days,subjects:x.subjects})),availableMinutes:s.planner.availableMinutes||240,topLocalRecommendations:z.rec.map(x=>({title:x.title,reason:x.body}))};}
  // Persistent multi-chat Assistant. Conversation data lives in the existing synced state JSON.
  const newChatId = () => 'chat-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  const activeChat = () => state().assistantChats.find(c => c.id === state().assistantActiveChatId) || null;
  function ensureAssistantChat() {
    const s = state();
    s.assistantChats = Array.isArray(s.assistantChats) ? s.assistantChats : [];
    let chat = activeChat();
    if (!chat) {
      chat = { id:newChatId(), title:'New conversation', createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), messages:[] };
      s.assistantChats.unshift(chat); s.assistantActiveChatId = chat.id; core.save();
    }
    return chat;
  }
  function createAssistantChat() {
    const s=state(), chat={id:newChatId(),title:'New conversation',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),messages:[]};
    s.assistantChats.unshift(chat); s.assistantActiveChatId=chat.id; core.save(); renderAssistant();
    $('assistantPrompt')?.focus();
  }
  function renderAssistantMarkdown(value) {
    let html=esc(value ?? '');
    html=html.replace(/^### (.+)$/gm,'<h4>$1</h4>').replace(/^## (.+)$/gm,'<h3>$1</h3>').replace(/^# (.+)$/gm,'<h3>$1</h3>');
    html=html.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>');
    html=html.replace(/^\s*[-•] (.+)$/gm,'<li>$1</li>');
    html=html.replace(/(?:<li>.*<\/li>\n?)+/g,m=>'<ul>'+m+'</ul>');
    html=html.replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');
    return '<p>'+html+'</p>';
  }
  function renderAssistant() {
    const chat=ensureAssistantChat(), list=$('assistantChatList'), messages=$('assistantMessages');
    $('assistantChatTitle').textContent=chat.title || 'New conversation';
    $('assistantMode').textContent=navigator.onLine?'Gemini · connected when signed in':'Offline · local fallback';
    list.innerHTML=state().assistantChats.map(c=>`<div class="v36-chat-row ${c.id===chat.id?'active':''}"><button class="v36-chat-select" type="button" data-chat-open="${esc(c.id)}"><b>${esc(c.title||'New conversation')}</b><small>${esc((c.messages||[]).filter(m=>m.role==='user').at(-1)?.content?.slice(0,58)||'No messages yet')}</small></button><div class="v36-chat-actions"><button type="button" class="v36-mini" title="Rename chat" data-chat-rename="${esc(c.id)}">✎</button><button type="button" class="v36-mini danger" title="Delete chat" data-chat-delete="${esc(c.id)}">×</button></div></div>`).join('') || '<p class="v36-empty">Your conversations will appear here.</p>';
    messages.innerHTML=(chat.messages||[]).map((m,i)=>{
      const role=m.role==='user'?'user':'assistant';
      const actions=Array.isArray(m.actions)&&m.actions.length?`<div class="v36-ai-actions"><b>Suggested tracker changes</b>${m.actions.map((a,j)=>`<div class="v36-ai-action"><span>${esc(describeAssistantAction(a))}</span><button type="button" class="v36-mini primary" data-assistant-apply="${i}:${j}" ${a.applied?'disabled':''}>${a.applied?'Applied':'Review & apply'}</button></div>`).join('')}</div>`:'';
      return `<article class="v36-message ${role}"><div class="v36-message-label">${role==='user'?'You':'Study Assistant'}</div><div class="v36-message-content">${renderAssistantMarkdown(m.content||'')}</div>${actions}<small class="v36-message-time">${m.createdAt?new Date(m.createdAt).toLocaleString():''}${m.model?' · '+esc(m.model):''}</small></article>`;
    }).join('') || '<div class="v36-chat-empty"><div class="v36-chat-empty-icon">✦</div><h3>What would you like to work on?</h3><p>Ask for a study plan, review your progress, or ask me to prepare changes to your tracker.</p></div>';
    messages.scrollTop=messages.scrollHeight;
    list.querySelectorAll('[data-chat-open]').forEach(b=>b.onclick=()=>{state().assistantActiveChatId=b.dataset.chatOpen;core.save();renderAssistant();});
    list.querySelectorAll('[data-chat-rename]').forEach(b=>b.onclick=()=>renameAssistantChat(b.dataset.chatRename));
    list.querySelectorAll('[data-chat-delete]').forEach(b=>b.onclick=()=>deleteAssistantChat(b.dataset.chatDelete));
    messages.querySelectorAll('[data-assistant-apply]').forEach(b=>b.onclick=()=>applyAssistantProposal(b.dataset.assistantApply));
  }
  function renameAssistantChat(id) {
    const c=state().assistantChats.find(x=>x.id===id); if(!c)return;
    const name=prompt('Rename conversation',c.title||'New conversation');
    if(name===null)return;
    c.title=name.trim().slice(0,70)||'New conversation'; c.updatedAt=new Date().toISOString(); core.save(); renderAssistant();
  }
  function deleteAssistantChat(id) {
    const c=state().assistantChats.find(x=>x.id===id); if(!c)return;
    if(!confirm(`Delete "${c.title||'New conversation'}" and its messages? This cannot be undone.`))return;
    const s=state(); s.assistantChats=s.assistantChats.filter(x=>x.id!==id);
    if(s.assistantActiveChatId===id)s.assistantActiveChatId=s.assistantChats[0]?.id||null;
    core.save(); renderAssistant();
  }
  function describeAssistantAction(a) {
    if(a.type==='complete_topics')return `Mark ${a.topicKeys?.length||0} topic(s) completed`;
    if(a.type==='set_topic_completion')return `${a.completed?'Complete':'Reopen'} topic: ${topics().find(x=>x.k===a.topicKey)?.t.title||a.topicKey}`;
    if(a.type==='set_daily_goal')return `Set today's target to ${a.target} new topic(s)`;
    if(a.type==='update_user_goals')return `Update weekly goals${a.weeklyMinutes!==undefined?' · '+a.weeklyMinutes+' study minutes':''}${a.weeklyTopics!==undefined?' · '+a.weeklyTopics+' topics':''}`;
    if(a.type==='remove_planner_tasks')return `Remove ${a.taskIds?.length||0} planner task(s)`;
    if(a.type==='add_planner_tasks')return `Add ${a.tasks?.length||0} task(s) to the planner`;
    if(a.type==='update_planner_settings')return `Update planner settings${a.availableMinutes?` · ${a.availableMinutes} min/day`:''}`;
    return 'Unrecognised tracker action';
  }
  function validateAssistantAction(a) {
    if(!a||typeof a!=='object')return false;
    const all=topics(), validKeys=new Set(all.map(x=>x.k));
    if(a.type==='complete_topics')return Array.isArray(a.topicKeys)&&a.topicKeys.length>0&&a.topicKeys.length<=30&&a.topicKeys.every(k=>validKeys.has(k));
    if(a.type==='add_planner_tasks')return Array.isArray(a.tasks)&&a.tasks.length>0&&a.tasks.length<=14&&a.tasks.every(t=>{const d=Date.parse(t.date+'T12:00:00');return validKeys.has(t.topicKey)&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)&&Number.isFinite(d)&&t.date>=today()&&['study','revision'].includes(t.type)&&Number.isFinite(Number(t.minutes))&&Number(t.minutes)>=5&&Number(t.minutes)<=240;});
    if(a.type==='update_planner_settings')return (a.availableMinutes===undefined||(Number.isInteger(a.availableMinutes)&&a.availableMinutes>=30&&a.availableMinutes<=960))&&(a.newLimit===undefined||(Number.isInteger(a.newLimit)&&a.newLimit>=1&&a.newLimit<=30))&&(a.prioritySubject===undefined||a.prioritySubject===''||core.subjects().includes(a.prioritySubject));
    if(a.type==='set_topic_completion')return validKeys.has(a.topicKey)&&typeof a.completed==='boolean';
    if(a.type==='set_daily_goal')return Number.isInteger(a.target)&&a.target>=1&&a.target<=100;
    if(a.type==='update_user_goals')return (a.weeklyMinutes!==undefined||a.weeklyTopics!==undefined)&&(a.weeklyMinutes===undefined||(Number.isInteger(a.weeklyMinutes)&&a.weeklyMinutes>=60&&a.weeklyMinutes<=10080))&&(a.weeklyTopics===undefined||(Number.isInteger(a.weeklyTopics)&&a.weeklyTopics>=1&&a.weeklyTopics<=300));
    if(a.type==='remove_planner_tasks'){const ids=new Set(Object.values(state().planner?.days||{}).flatMap(p=>(p?.tasks||[]).map(t=>t.id)));return Array.isArray(a.taskIds)&&a.taskIds.length>0&&a.taskIds.length<=30&&a.taskIds.every(id=>ids.has(id));}
    return false;
  }
  function applyAssistantProposal(token) {
    const [mi,ai]=token.split(':').map(Number), chat=activeChat(), msg=chat?.messages?.[mi], action=msg?.actions?.[ai];
    if(!action||action.applied||!validateAssistantAction(action))return alert('This suggested change is invalid or no longer matches your tracker.');
    const summary=describeAssistantAction(action);
    if(!confirm(`Apply this change to your tracker?\n\n${summary}\n\nYour tracker data will be saved and synced when online.`))return;
    const s=state();
    try {
      if(action.type==='complete_topics') action.topicKeys.forEach(k=>core.setTopicCompletion(k,true));
      else if(action.type==='set_topic_completion') core.setTopicCompletion(action.topicKey,action.completed);
      else if(action.type==='set_daily_goal') core.setDailyGoal(action.target);
      else if(action.type==='update_user_goals'){s.userGoals||={};if(action.weeklyMinutes!==undefined)s.userGoals.weeklyMinutes=action.weeklyMinutes;if(action.weeklyTopics!==undefined)s.userGoals.weeklyTopics=action.weeklyTopics;}
      else if(action.type==='add_planner_tasks') {
        s.planner ||= {availableMinutes:240,newLimit:5,days:{},completed:{}}; s.planner.days ||= {};
        for(const t of action.tasks){const topic=topics().find(x=>x.k===t.topicKey);const plan=s.planner.days[t.date] ||= {date:t.date,minutes:Number(s.planner.availableMinutes||240),createdAt:Date.now(),tasks:[],bufferMinutes:0,revisionMinutes:0};plan.tasks ||= [];plan.tasks.push({id:'ai-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),date:t.date,type:t.type,topicKey:t.topicKey,title:t.type==='revision'?'Revise: '+topic.t.title:topic.t.title,subject:topic.s,header:topic.h,minutes:Number(t.minutes),createdAt:Date.now(),source:'assistant'});}
        s.planner.generatedAt=Date.now();
      } else if(action.type==='remove_planner_tasks') {
        for(const plan of Object.values(s.planner?.days||{})){plan.tasks=(plan.tasks||[]).filter(t=>!action.taskIds.includes(t.id));}
      } else if(action.type==='update_planner_settings') {
        s.planner ||= {}; if(action.availableMinutes!==undefined)s.planner.availableMinutes=action.availableMinutes;if(action.newLimit!==undefined)s.planner.newLimit=action.newLimit;if(action.prioritySubject!==undefined)s.planner.prioritySubject=action.prioritySubject;
      }
      action.applied=true;action.appliedAt=new Date().toISOString();core.save();window.MBBS_V36_REFRESH?.();renderAssistant();alert('Tracker updated successfully.');
    } catch(err){console.error('Assistant action failed',err);alert('The tracker could not apply this change: '+(err.message||'Unknown error'));}
  }
  function buildAssistantContext() {
    const base=buildLocalInsights(), s=state();
    // Keep exact topic keys for safe actions, but omit duplicate metadata to keep requests small.
    const catalog=topics().map(x=>[x.k,core.subjectLabel(x.s),String(x.t.title||''),!!s.done[x.k]]);
    const days=Object.entries(s.planner?.days||{}).slice(-21).map(([date,p])=>({date,tasks:(p?.tasks||[]).map(t=>({id:t.id,title:t.title,type:t.type,topicKey:t.topicKey,minutes:t.minutes,done:!!s.planner?.completed?.[t.id]}))}));
    return {...buildContextBase(base,s),topicCatalog:catalog,planner:{availableMinutes:s.planner?.availableMinutes||240,newLimit:s.planner?.newLimit||5,prioritySubject:s.planner?.prioritySubject||'',days},dailyGoal:{date:s.goalDate,targetSet:!!s.targetSet,todayTarget:s.todayTarget||0,goalTotal:s.goalTotal||0,completedGoal:s.completedGoal||0,backlog:s.backlog||0},userGoals:{...(s.userGoals||{})}};
  }
  function buildContextBase(z,s) {
    return {today:today(),syllabus:{completed:z.done.length,pending:z.pending.length,total:z.all.length},backlog:s.backlog||0,subjects:z.subjects.map(x=>({subject:core.subjectLabel(x.sub),completed:x.done,total:x.total})),revisionDue:z.due.length,unresolvedMistakes:z.openMistakes.length,recentStudyMinutes:z.recentMinutes,recentTopicsCompleted:z.completedThisWeek,weeklyGoals:{minutes:z.goalMinutes,topics:z.goalTopics},upcomingExams:z.exams.slice(0,3).map(x=>({name:x.name,date:x.date,daysRemaining:x.days,subjects:x.subjects})),availableMinutes:s.planner?.availableMinutes||240,topLocalRecommendations:z.rec.map(x=>({title:x.title,reason:x.body}))};
  }
  async function sendAssistantMessage() {
    const input=$('assistantPrompt'), promptText=input.value.trim(); if(!promptText)return;
    const chat=ensureAssistantChat(), now=new Date().toISOString();
    chat.messages.push({role:'user',content:promptText,createdAt:now});chat.updatedAt=now;
    if(chat.title==='New conversation')chat.title=promptText.slice(0,48)+(promptText.length>48?'…':'');
    input.value='';core.save();renderAssistant();$('assistantAsk').disabled=true;$('assistantMode').textContent='Thinking…';
    const pending={role:'assistant',content:'Checking your recent conversation and study data…',createdAt:new Date().toISOString(),pending:true};chat.messages.push(pending);renderAssistant();
    try {
      const trackerContext=buildAssistantContext();
      // Preserve the full transcript locally; send a compact recent window to avoid huge, slow requests.
      const conversation=chat.messages.filter(m=>!m.pending).slice(-14).map(m=>({role:m.role,content:String(m.content||'').slice(0,3500),createdAt:m.createdAt||null}));
      const result=await core.askAI(promptText,{conversation,tracker:trackerContext});
      pending.pending=false;pending.model=result.model||result.provider||'AI';pending.content=result.reply||'I could not generate a response.';
      pending.actions=Array.isArray(result.actions)?result.actions.filter(validateAssistantAction).slice(0,8):[];
      $('assistantMode').textContent=result.provider||result.model||'AI connected';
    } catch(err) {
      pending.pending=false;pending.model='Local fallback';pending.content=assistantAnswer(promptText)+'\n\n_AI provider unavailable: '+(err.message||'request failed')+'. This response is based on locally available tracker data; no AI action was applied._';pending.actions=[];$('assistantMode').textContent='Local fallback';
    } finally {
      chat.updatedAt=new Date().toISOString();core.save();renderAssistant();$('assistantAsk').disabled=false;
    }
  }
  $('assistantAsk').onclick=sendAssistantMessage;
  $('assistantPrompt').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAssistantMessage();}});
  $('assistantNewChat').onclick=createAssistantChat;
  $('assistantRenameChat').onclick=()=>renameAssistantChat(state().assistantActiveChatId);
  document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{$('assistantPrompt').value=b.dataset.prompt;sendAssistantMessage();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('assistant')?.classList.contains('active'))renderAssistant();});
  window.addEventListener('pageshow',()=>{if($('assistant')?.classList.contains('active'))renderAssistant();});

  // Universal quick capture inbox
  const quickLaunch=document.createElement('button');quickLaunch.id='quickCaptureLaunch';quickLaunch.className='v36-quick-launch';quickLaunch.textContent='+ Quick capture';quickLaunch.type='button';document.body.appendChild(quickLaunch);
  const quickModal=document.createElement('div');quickModal.id='quickCaptureModal';quickModal.className='v36-modal-backdrop';quickModal.hidden=true;quickModal.innerHTML=`<div class="v36-modal" role="dialog" aria-modal="true" aria-labelledby="quickTitle"><div class="v36-cardhead"><h3 id="quickTitle">Quick capture</h3><button type="button" class="v36-mini" id="quickClose">Close</button></div><label>What do you need to remember?<input id="quickTitleInput" maxlength="180" placeholder="e.g. Revise nephrotic syndrome"></label><div class="v36-formgrid"><label>Type<select id="quickType"><option value="task">Study task</option><option value="reminder">Reminder</option><option value="note">Quick note</option></select></label><label>Date<input id="quickDate" type="date"></label></div><label>Link to topic (optional)<select id="quickTopic"><option value="">No linked topic</option>${topicOptions()}</select></label><div class="v36-actions"><button class="v36-btn primary" id="quickSave">Save to inbox</button></div></div>`;document.body.appendChild(quickModal);
  quickLaunch.onclick=()=>{quickModal.hidden=false;$('quickTitleInput').focus();};$('quickClose').onclick=()=>quickModal.hidden=true;quickModal.addEventListener('click',e=>{if(e.target===quickModal)quickModal.hidden=true;});$('quickDate').value=today();$('quickSave').onclick=()=>{const title=$('quickTitleInput').value.trim();if(!title)return alert('Enter a task or reminder.');const k=$('quickTopic').value,x=topics().find(t=>t.k===k);state().quickItems.push({id:'q'+Date.now(),title,type:$('quickType').value,date:$('quickDate').value||'',topicKey:k,topicTitle:x?.t.title||'',done:false,createdAt:new Date().toISOString()});core.save();$('quickTitleInput').value='';quickModal.hidden=true;renderQuickInbox();};
  // Theme, installability and data quality utilities.
  const settingsCard=document.querySelector('#settings .hero');
  if(settingsCard){const box=document.createElement('div');box.className='v36-card';box.innerHTML=`<h3>Appearance & app installation</h3><div class="v36-formgrid"><label>Theme<select id="v36Theme"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System default</option></select></label><label>Offline status<div id="offlineState" class="v36-inline-status">Checking…</div></label></div><div class="v36-formgrid"><label>Weekly topic goal<input id="weeklyTopicGoal" type="number" min="1" max="500" value="35"></label><label>Weekly study-time goal (minutes)<input id="weeklyMinuteGoal" type="number" min="60" max="10080" step="30" value="1200"></label></div><div class="v36-actions"><button class="v36-btn secondary" id="saveWeeklyGoals">Save weekly goals</button><button class="v36-btn secondary" id="installPwa">Install / Add to Home Screen</button><button class="v36-btn ghost" id="exportV36">Export complete V36 data</button></div><p class="muted">The tracker saves changes locally first. Cloud synchronisation resumes when the connection returns and your Supabase session is available.</p>`;settingsCard.after(box);}
  const themeSaved=state().preferences?.theme||localStorage.getItem('MBBS_V36_THEME')||'system';
  function setTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem('MBBS_V36_THEME',t);state().preferences||={};state().preferences.theme=t;core.save();}
  if($('v36Theme')){$('v36Theme').value=themeSaved;setTheme(themeSaved);$('v36Theme').onchange=e=>setTheme(e.target.value);}
  if($('weeklyTopicGoal')){$('weeklyTopicGoal').value=state().userGoals.weeklyTopics||35;$('weeklyMinuteGoal').value=state().userGoals.weeklyMinutes||1200;$('saveWeeklyGoals').onclick=()=>{state().userGoals={weeklyTopics:Math.max(1,Math.min(500,Number($('weeklyTopicGoal').value||35))),weeklyMinutes:Math.max(60,Math.min(10080,Number($('weeklyMinuteGoal').value||1200)))};core.save();renderAnalytics();alert('Weekly goals saved.');};}
  let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;if($('installPwa'))$('installPwa').disabled=false;});
  $('installPwa')?.addEventListener('click',async()=>{if(!installPrompt)return alert('Use your browser menu → Add to Home Screen / Install App.');installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installPwa').disabled=true;});
  $('exportV36')?.addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mbbs-study-tracker-v36-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);});
  function onlineStatus(){const el=$('offlineState');if(el)el.textContent=navigator.onLine?'Online · local-first saving enabled':'Offline · changes remain on this device';}
  window.addEventListener('online',()=>{onlineStatus();core.reconnect?.();});window.addEventListener('offline',onlineStatus);onlineStatus();
  $('heatMetric').onchange=renderHeatmap;
  // Keep all new state fields available to the existing JSON backup/export/import pipeline.
  const originalExport=$('exportData')?.onclick;
  $('exportData')?.addEventListener('click',()=>{ /* existing export already serialises the full state */ });
  // Make feature pages refresh when returning to them.
  window.addEventListener('focus',()=>{const active=document.querySelector('.page.active')?.id;if(active&&pages[active]){({overview:renderOverview,planner:renderPlanner,focus:renderFocus,topichub:renderHub,analytics:renderAnalytics,examinations:renderExams,assessments:renderTests,assistant:renderAssistant}[active]||(()=>{}))();}});
  window.MBBS_V36_REFRESH=()=>{renderOverview();renderPlanner();renderFocus();renderHub();renderAnalytics();renderExams();renderTests();renderAssistant();};
  window.MBBS_V36_ACTIVATE_OVERVIEW=()=>{let id='overview';try{id=localStorage.getItem('MBBS_V36_LAST_PAGE')||'overview'}catch{};if(!document.getElementById(id))id='overview';navigate(id)};
  // Restore the last page; do not reset users to Overview on every load.
  let initialPage='overview';try{initialPage=localStorage.getItem('MBBS_V36_LAST_PAGE')||'overview'}catch{};if(!document.getElementById(initialPage))initialPage='overview';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('#nav button').forEach(b=>b.classList.remove('active'));$(initialPage).classList.add('active');$(`nav-${initialPage}`)?.classList.add('active');
  renderOverview();renderPlanner();renderFocus();renderHub();renderAnalytics();renderExams();renderTests();renderAssistant();
  console.info('MBBS Study Tracker V36 modules loaded');
})();
