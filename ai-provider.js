/* Single-provider AI adapter: authenticated Cloudflare Workers AI via Supabase. */
(() => {
  'use strict';
  window.MBBS_AI_CONFIG = { mode: 'cloud', provider: 'Cloudflare Workers AI' };
  window.MBBS_AI_PROVIDERS = {
    setMode() { return 'cloud'; },
    setCloudConsent() { return true; },
    list() { return ['cloud']; },
    async complete({ message, context, invoke }) {
      if (typeof invoke !== 'function') throw new Error('Sign in with an internet connection to use the study assistant.');
      const result = await invoke({ message, context });
      if (!result || typeof result.reply !== 'string') throw new Error(result?.error || 'Cloud AI returned an invalid response.');
      return { ...result, provider: 'Cloudflare Workers AI' };
    }
  };
})();
