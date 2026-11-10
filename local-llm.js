/* Local on-device LLM runtime for MBBS Study Tracker.
 * Uses WebLLM/WebGPU: model weights are downloaded once and cached by the browser.
 * Prompts and tracker context are never sent to an AI server by this adapter.
 */
(() => {
  'use strict';
  const CDN = 'https://esm.run/@mlc-ai/web-llm@0.2.87';
  const KEY = 'MBBS_LOCAL_LLM_MODEL';
  const state = { module: null, engine: null, modelId: '', loading: false, progress: '', supported: null };
  const listeners = new Set();
  const SYSTEM = `You are the AI study assistant embedded in an MBBS study tracker. Use the supplied tracker state and complete conversation history. Never invent tracker facts, topic keys, dates, subject names, completion states, or task IDs. You may propose tracker changes using the action schema below. The app validates every action and requires explicit user confirmation before writing. Never claim a change is already applied. Return ONLY a valid JSON object: {"reply":"Markdown response","actions":[]}. Allowed actions: {"type":"complete_topics","topicKeys":["exact topicKey"]}; {"type":"set_topic_completion","topicKey":"exact topicKey","completed":true|false}; {"type":"set_daily_goal","target":integer 1-100}; {"type":"update_user_goals","weeklyMinutes":number,"weeklyTopics":number}; {"type":"add_planner_tasks","tasks":[{"date":"YYYY-MM-DD","topicKey":"exact topicKey","type":"study|revision","minutes":30}]}; {"type":"remove_planner_tasks","taskIds":["exact id"]}; {"type":"update_planner_settings","availableMinutes":240,"newLimit":5,"prioritySubject":"exact subject"}. Only propose actions when the user clearly requests a data change. For advice, explanations and recommendations, actions must be []. If unclear, ask one concise question and return actions []. Dates must be today or later. Do not exceed 30 topic completions, 14 planner tasks or 30 deletions. Weekly minutes 60-10080 and weekly topics 1-300. A set_daily_goal changes the target, not topic completion. You are an academic study assistant, not a patient-care decision tool; do not provide patient-specific diagnosis or treatment advice.`;
  function emit(){ const detail={...state}; listeners.forEach(fn=>{try{fn(detail)}catch{}}); window.dispatchEvent(new CustomEvent('mbbs-local-ai-status',{detail})); }
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  async function getModule(){ if(!state.module) state.module=await import(CDN); return state.module; }
  async function check(){
    const supported=!!(navigator.gpu && window.isSecureContext);
    state.supported=supported; emit();
    return {supported,secure:!!window.isSecureContext,webgpu:!!navigator.gpu,browser:navigator.userAgent};
  }
  async function models(){
    const mod=await getModule();
    const list=mod.prebuiltAppConfig?.model_list||[];
    const find=(rx)=>list.find(x=>rx.test(x.model_id||''));
    const picks=[find(/Qwen2.*0\.5B.*q4f16_1/i),find(/Qwen2.*1\.5B.*q4f16_1/i),find(/Phi-3.*mini.*q4f16_1/i)].filter(Boolean);
    return picks.map(x=>({id:x.model_id,size:x.model_id.match(/0\.5B/i)?'Small · suitable for many phones/tablets':x.model_id.match(/1\.5B/i)?'Larger · needs more memory':'Larger · needs more memory'}));
  }
  async function load(modelId, onProgress){
    if(state.loading) throw new Error('A model operation is already running.');
    if(!navigator.gpu) throw new Error('This browser/device does not expose WebGPU. Try an updated Safari, Chrome or Edge browser on a supported device.');
    if(!window.isSecureContext) throw new Error('Local AI requires a secure HTTPS connection.');
    state.loading=true; state.progress='Preparing local model…'; emit();
    try{
      const mod=await getModule();
      const available=await models();
      const selected=modelId||localStorage.getItem(KEY)||available[0]?.id;
      if(!selected||!available.some(x=>x.id===selected)) throw new Error('No compatible small model was found in this WebLLM build.');
      if(state.engine && state.modelId!==selected){try{await state.engine.unload()}catch{} state.engine=null;}
      if(!state.engine){
        state.engine=await mod.CreateMLCEngine(selected,{initProgressCallback:(p)=>{state.progress=p?.text||'Downloading model…';emit();onProgress?.(p);}});
        state.modelId=selected;
      }
      localStorage.setItem(KEY,selected); state.progress='Model ready on this device'; emit();
      return {model:selected};
    } finally {state.loading=false;emit();}
  }
  function parseOutput(text){
    const cleaned=String(text||'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
    try{const obj=JSON.parse(cleaned);return {reply:typeof obj.reply==='string'?obj.reply:cleaned,actions:Array.isArray(obj.actions)?obj.actions:[],model:state.modelId,provider:'On-device AI · WebLLM'}}catch{return {reply:cleaned,actions:[],model:state.modelId,provider:'On-device AI · WebLLM'}}
  }
  async function complete({message,context}){
    if(!state.engine) throw new Error("Download and load a model in the On-device AI panel before sending a message.");
    const conversation=Array.isArray(context?.conversation)?context.conversation:[];
    const tracker=context?.tracker||{};
    const messages=[{role:'system',content:SYSTEM+'\n\nTRACKER STATE (JSON):\n'+JSON.stringify(tracker)}];
    conversation.slice(-12).forEach(m=>{if((m.role==='user'||m.role==='assistant')&&typeof m.content==='string')messages.push({role:m.role,content:m.content.slice(0,3000)});});
    if(!conversation.length||conversation[conversation.length-1]?.content!==message)messages.push({role:'user',content:message});
    const result=await state.engine.chat.completions.create({messages,temperature:0.2,max_tokens:1400});
    return parseOutput(result.choices?.[0]?.message?.content||'');
  }
  async function unload(){if(state.engine){await state.engine.unload();state.engine=null;}state.progress='Model unloaded from memory. Downloaded weights remain cached on this device.';emit();}
  window.MBBS_LOCAL_LLM={check,models,load,complete,unload,subscribe,get status(){return {...state,engine:!!state.engine,module:!!state.module}}};
})();
