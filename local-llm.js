/* Cross-device on-device AI runtime for MBBS Study Tracker.
 * WebLLM inference stays in the browser. Model catalogue is read from the
 * pinned WebLLM build; the app never invents model IDs.
 */
(() => {
  'use strict';
  const CDN = 'https://esm.run/@mlc-ai/web-llm@0.2.87';
  const KEY = 'MBBS_LOCAL_LLM_MODEL';
  const INPUT_BUDGET = 2700; // conservative budget inside the model's 4K window
  const OUTPUT_BUDGET = 900;
  const state = { module: null, engine: null, modelId: '', loading: false, activeRequests: 0, progress: '', supported: null, modelInfo: null };
  const listeners = new Set();
  const SYSTEM = `You are the AI study assistant embedded in an MBBS study tracker. Answer academic and study-workflow questions clearly and accurately. Use only supplied tracker facts; never invent topic keys, dates, subject names, completion states or task IDs. You may propose tracker changes using the action schema below. The app validates every action and requires explicit user confirmation before writing. Never claim a change is already applied. Return ONLY a valid JSON object: {"reply":"Markdown response","actions":[]}. Allowed actions: {"type":"complete_topics","topicKeys":["exact topicKey"]}; {"type":"set_topic_completion","topicKey":"exact topicKey","completed":true|false}; {"type":"set_daily_goal","target":integer 1-100}; {"type":"update_user_goals","weeklyMinutes":number,"weeklyTopics":number}; {"type":"add_planner_tasks","tasks":[{"date":"YYYY-MM-DD","topicKey":"exact topicKey","type":"study|revision","minutes":30}]}; {"type":"remove_planner_tasks","taskIds":["exact id"]}; {"type":"update_planner_settings","availableMinutes":240,"newLimit":5,"prioritySubject":"exact subject"}. Only propose actions when the user clearly requests a data change. For advice, explanations and recommendations, actions must be []. If unclear, ask one concise question and return actions []. Dates must be today or later. Do not exceed 30 topic completions, 14 planner tasks or 30 deletions. Weekly minutes 60-10080 and weekly topics 1-300. A set_daily_goal changes the target, not topic completion. You are an academic study assistant, not a patient-care decision tool; do not provide patient-specific diagnosis or treatment advice.`;
  const MODEL_META = [
    { id: 'Qwen3.5-0.8B-q4f16_1-MLC', label: 'Qwen3.5 0.8B · lightweight', tier: 'small', note: 'Best compatibility for phones and lower-memory devices' },
    { id: 'Qwen3.5-2B-q4f16_1-MLC', label: 'Qwen3.5 2B · balanced', tier: 'balanced', note: 'Recommended starting point for capable tablets and laptops' },
    { id: 'Qwen3.5-4B-q4f16_1-MLC', label: 'Qwen3.5 4B · advanced', tier: 'large', note: 'Higher memory use; may fail on mobile Safari' },
    { id: 'gemma-4-E2B-it-q4f16_1-MLC', label: 'Gemma 4 E2B · alternative', tier: 'large', note: 'Requires WebGPU shader-f16 support' },
    { id: 'Phi-4-mini-instruct-q4f16_1-MLC', label: 'Phi-4 Mini · alternative', tier: 'large', note: 'Higher memory use; test on your device' },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B · compatibility fallback', tier: 'small', note: 'Small fallback for supported WebGPU devices' }
  ];
  function emit(){ const detail={...state}; listeners.forEach(fn=>{try{fn(detail)}catch{}}); window.dispatchEvent(new CustomEvent('mbbs-local-ai-status',{detail})); }
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  async function getModule(){
    if(!state.module){ state.progress='Loading the WebLLM runtime…';emit(); state.module=await import(CDN); }
    return state.module;
  }
  async function check(){
    const secure=!!window.isSecureContext, webgpu=!!navigator.gpu;
    let adapter=null, features=[];
    if(webgpu){try{adapter=await navigator.gpu.requestAdapter();features=adapter?[...adapter.features]:[];}catch{}}
    const supported=!!(secure&&webgpu&&adapter);
    state.supported=supported;emit();
    return {supported,secure,webgpu:!!adapter,features,browser:navigator.userAgent,platform:navigator.platform||''};
  }
  async function models(){
    const mod=await getModule();
    const list=mod.prebuiltAppConfig?.model_list||[];
    if(!list.length)throw new Error('The WebLLM runtime loaded but its model catalogue was empty.');
    const available=MODEL_META.map(meta=>{
      const record=list.find(x=>x.model_id===meta.id);
      return record?{...meta,id:meta.id,vramMB:Number(record.vram_required_MB||0),lowResource:!!record.low_resource_required,requiredFeatures:record.required_features||[],contextWindow:Number(record.overrides?.context_window_size||4096)}:null;
    }).filter(Boolean);
    if(!available.length)throw new Error('This WebLLM version does not contain any of the supported recommended model builds.');
    const mobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    return available.map(x=>({...x,recommended:mobile?x.tier==='balanced'||x.tier==='small':x.tier==='large'||x.tier==='balanced'}));
  }
  function estimateTokens(value){return Math.ceil(String(value||'').length/3.5);}
  function buildMessages({message,context}){
    const tracker={...(context?.tracker||{})};
    if(Array.isArray(tracker.topicCatalog))tracker.topicCatalog=tracker.topicCatalog.slice(0,45);
    const conversation=(Array.isArray(context?.conversation)?context.conversation:[])
      .filter(m=>(m.role==='user'||m.role==='assistant')&&typeof m.content==='string')
      .slice(-6).map(m=>({role:m.role,content:m.content.slice(-900)}));
    if(!conversation.length||conversation[conversation.length-1]?.content!==message)conversation.push({role:'user',content:String(message||'').slice(-1800)});
    const digest=String(context?.conversationSummary||'').slice(0,900);
    const systemContent=SYSTEM+(digest?'\n\nEarlier conversation notes (extracts; use only as context):\n'+digest:'')+'\n\nTRACKER STATE (compact JSON):\n'+JSON.stringify(tracker);
    const messages=[{role:'system',content:systemContent},...conversation];
    const count=()=>messages.reduce((n,m)=>n+estimateTokens(m.content)+8,0);
    while(count()>INPUT_BUDGET&&messages.length>2)messages.splice(1,1);
    if(count()>INPUT_BUDGET&&Array.isArray(tracker.topicCatalog)){
      tracker.topicCatalog=tracker.topicCatalog.slice(0,12);
      messages[0].content=SYSTEM+'\n\nTRACKER STATE (compact JSON):\n'+JSON.stringify(tracker);
    }
    if(count()>INPUT_BUDGET){
      const minimal={today:tracker.today,syllabus:tracker.syllabus,subjects:tracker.subjects,revisionDue:tracker.revisionDue,weeklyGoals:tracker.weeklyGoals,dailyGoal:tracker.dailyGoal};
      messages[0].content=SYSTEM+'\n\nTRACKER SUMMARY:\n'+JSON.stringify(minimal);
    }
    if(count()>INPUT_BUDGET)throw new Error('This question and its recent context still exceed the local model budget. Start a new chat or shorten the pasted text.');
    return messages;
  }
  async function load(modelId,onProgress){
    if(state.loading)throw new Error('A model operation is already running. Please wait for it to finish.');
    if(state.activeRequests>0)throw new Error('The local model is answering a question. Wait for the response before changing or reloading the model.');
    state.loading=true;
    let compatibility;
    try{
      compatibility=await check();
      if(!compatibility.secure)throw new Error('Local AI requires HTTPS. Open the tracker from its GitHub Pages address.');
      if(!compatibility.webgpu)throw new Error('This browser/device does not expose a usable WebGPU adapter. Choose cloud AI or try a supported browser/device.');
      state.progress='Preparing local model…';emit();
      const mod=await getModule();
      const available=await models();
      const selected=modelId||localStorage.getItem(KEY)||available.find(x=>x.recommended)?.id||available[0]?.id;
      const meta=available.find(x=>x.id===selected);
      if(!meta)throw new Error('The selected model is not present in this WebLLM build. Refresh the model list.');
      const unsupported=meta.requiredFeatures.filter(f=>!compatibility.features.includes(f));
      if(unsupported.length)throw new Error('This device is missing required WebGPU features: '+unsupported.join(', '));
      if(state.engine&&state.modelId!==selected){try{await state.engine.unload();}catch{}state.engine=null;state.modelId='';}
      if(!state.engine){
        state.progress='Downloading model weights and initializing WebGPU…';emit();
        state.engine=await mod.CreateMLCEngine(selected,{initProgressCallback:p=>{
          state.progress=p?.text||'Downloading model…';emit();onProgress?.(p);
        }});
        state.modelId=selected;state.modelInfo=meta;
      }
      localStorage.setItem(KEY,selected);state.progress='Model ready on this device';emit();
      return {model:selected,contextWindow:meta.contextWindow};
    }catch(error){state.progress='Model load failed: '+(error?.message||String(error));emit();throw error;}
    finally{state.loading=false;emit();}
  }
  function parseOutput(text){
    const cleaned=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    try{const obj=JSON.parse(cleaned);return {reply:typeof obj.reply==='string'?obj.reply:cleaned,actions:Array.isArray(obj.actions)?obj.actions:[],model:state.modelId,provider:'On-device AI · WebLLM'}}
    catch{return {reply:cleaned,actions:[],model:state.modelId,provider:'On-device AI · WebLLM'};}
  }
  async function complete({message,context}){
    if(state.loading)throw new Error('The local model is still loading. Wait until it says Model ready, then retry.');
    if(!state.engine)throw new Error('No active local model is loaded. Open AI settings and load the model again.');
    if(state.activeRequests>0)throw new Error('The local model is already processing a request. Wait for it to finish.');
    const engine=state.engine, modelAtStart=state.modelId;
    const messages=buildMessages({message,context});
    state.activeRequests++;state.progress='Generating a response…';emit();
    try{
      const result=await engine.chat.completions.create({messages,temperature:0.2,max_tokens:OUTPUT_BUDGET});
      if(engine!==state.engine||modelAtStart!==state.modelId)throw new Error('The local model changed during generation. Reload it and try again.');
      return parseOutput(result.choices?.[0]?.message?.content||'');
    }catch(error){
      const detail=String(error?.message||error);
      if(/disposed|dispose|worker.*terminated|device.*lost/i.test(detail)){
        if(state.engine===engine){state.engine=null;state.modelId='';state.modelInfo=null;}
        state.progress='The WebLLM engine was disposed. Reload the model before asking another question.';emit();
        throw new Error('The local AI engine was disposed by the browser/runtime. Open AI settings, reload the model, and try again. Your tracker data was not changed.');
      }
      throw error;
    }finally{state.activeRequests=Math.max(0,state.activeRequests-1);emit();}
  }
  async function unload(){
    if(state.loading)throw new Error('The model is currently loading. Wait until loading finishes before unloading it.');
    if(state.activeRequests>0)throw new Error('The model is answering a question. Wait for the response before unloading it.');
    const engine=state.engine;state.engine=null;state.modelId='';state.modelInfo=null;
    if(engine){try{await engine.unload();}catch(error){state.progress='The model was already released by the browser/runtime.';emit();}}
    state.progress='Model unloaded from memory. Cached model weights are retained by the browser.';emit();
  }
  window.MBBS_LOCAL_LLM={check,models,load,complete,unload,subscribe,get status(){return {...state,engine:!!state.engine,module:!!state.module}}};
})();
