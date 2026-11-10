/* Provider-independent AI transport. Local on-device inference is the default. */
(() => {
  'use strict';
  const config = window.MBBS_AI_CONFIG = window.MBBS_AI_CONFIG || { provider: 'local', sendTrackerContext: true };
  config.provider = 'local';
  const adapters = new Map();
  window.MBBS_AI_PROVIDERS = {
    register(name, adapter) { if (!name || typeof adapter?.complete !== 'function') throw new Error('An AI adapter must expose complete().'); adapters.set(String(name), adapter); },
    list() { return ['local', ...adapters.keys()]; },
    async complete({message,context}) {
      if(adapters.has(config.provider)) return adapters.get(config.provider).complete({message,context,config});
      if(config.provider !== 'local') throw new Error('Only local on-device AI is enabled in this build.');
      if(!window.MBBS_LOCAL_LLM) throw new Error('Local AI runtime is not loaded. Refresh the tracker and try again.');
      return window.MBBS_LOCAL_LLM.complete({message,context:config.sendTrackerContext===false?{}:context});
    }
  };
})();
