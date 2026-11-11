/* Provider-independent AI routing. Cloud use requires an explicit user opt-in. */
(() => {
  'use strict';
  const MODE_KEY='MBBS_AI_PROVIDER_MODE';
  const CONSENT_KEY='MBBS_AI_CLOUD_CONSENT';
  const MODEL_KEY='MBBS_CLOUD_AI_MODEL';
  const MODEL_MODE_KEY='MBBS_CLOUD_AI_MODEL_MODE';
  const config=window.MBBS_AI_CONFIG=window.MBBS_AI_CONFIG||{};
  const savedMode=localStorage.getItem(MODE_KEY);
  // Cloudflare is the requested primary provider. Migrate the old default-local setting once.
  config.mode=!savedMode||savedMode==='local'?'cloud':savedMode;
  if(config.mode!==savedMode)localStorage.setItem(MODE_KEY,config.mode);
  // The user explicitly selected relevant tracker-context sharing for Cloud AI in setup.
  // Preserve any explicit in-app opt-out.
  const savedConsent=localStorage.getItem(CONSENT_KEY);
  config.cloudConsent=savedConsent==='no'?false:true;
  if(savedConsent===null)localStorage.setItem(CONSENT_KEY,'yes');
  const adapters=new Map();
  function setMode(mode){if(!['local','cloud','hybrid'].includes(mode))throw new Error('Unknown AI provider mode.');config.mode=mode;localStorage.setItem(MODE_KEY,mode);}
  function setCloudConsent(allowed){config.cloudConsent=!!allowed;localStorage.setItem(CONSENT_KEY,allowed?'yes':'no');}
  function cloudContext(context){
    const mode=localStorage.getItem(MODEL_MODE_KEY)||'auto';
    const selected=mode==='manual'?localStorage.getItem(MODEL_KEY):'';
    return selected?{...(context||{}),aiModel:selected}:context;
  }
  async function cloud({message,context,invoke}){
    if(!config.cloudConsent)throw new Error('Cloud AI is disabled. Enable the cloud privacy consent setting first.');
    if(typeof invoke!=='function')throw new Error('Cloud AI requires a signed-in Supabase session.');
    const result=await invoke({message,context:cloudContext(context)});
    if(!result||typeof result.reply!=='string')throw new Error(result?.error||'Cloud AI returned an invalid response.');
    return {...result,provider:result.provider||'Cloud AI'};
  }
  window.MBBS_AI_PROVIDERS={
    register(name,adapter){if(!name||typeof adapter?.complete!=='function')throw new Error('An AI adapter must expose complete().');adapters.set(String(name),adapter);},
    list(){return ['local','cloud','hybrid',...adapters.keys()];},
    setMode,setCloudConsent,
    async complete({message,context,invoke,getAccessToken}){
      const mode=config.mode||'local';
      if(adapters.has(mode))return adapters.get(mode).complete({message,context,config});
      if(mode==='cloud')return cloud({message,context,invoke,getAccessToken});
      if(mode==='hybrid'){
        try{
          if(window.MBBS_LOCAL_LLM?.status?.engine)return await window.MBBS_LOCAL_LLM.complete({message,context});
          throw new Error('No local model is loaded.');
        }catch(localError){
          if(!config.cloudConsent)throw new Error('Local AI failed and cloud fallback is not authorised. '+(localError.message||''));
          const result=await cloud({message,context,invoke,getAccessToken});
          result.fallbackReason=localError.message||'Local AI unavailable';
          return result;
        }
      }
      if(!window.MBBS_LOCAL_LLM)throw new Error('Local AI runtime did not load. Refresh the tracker and retry.');
      return window.MBBS_LOCAL_LLM.complete({message,context});
    }
  };
})();
