/* MBBS Study Tracker AI provider adapter
 * Change only MBBS_AI_CONFIG.provider to switch providers.
 * Built-ins: supabase-gemini, private-endpoint, offline
 * Offline/private adapters can also be registered with MBBS_AI_PROVIDERS.register().
 */
(() => {
  'use strict';
  const config = window.MBBS_AI_CONFIG = window.MBBS_AI_CONFIG || {
    provider: 'supabase-gemini',
    endpoint: '',                 // e.g. https://your-private-host/v1/chat
    sendTrackerContext: true,
    timeoutMs: 60000
  };
  const adapters = new Map();
  const registry = window.MBBS_AI_PROVIDERS = {
    register(name, adapter) {
      if (!name || !adapter || typeof adapter.complete !== 'function') throw new Error('An AI adapter must expose complete().');
      adapters.set(String(name), adapter);
    },
    list() { return ['supabase-gemini', 'private-endpoint', 'offline', ...adapters.keys()]; },
    async complete({ message, context, invoke, getAccessToken }) {
      const provider = config.provider || 'supabase-gemini';
      if (adapters.has(provider)) return adapters.get(provider).complete({ message, context, config });
      if (provider === 'offline') throw new Error('No offline model adapter has been registered yet. Add one in ai-provider.js.');
      if (provider === 'private-endpoint') {
        if (!config.endpoint) throw new Error('Set MBBS_AI_CONFIG.endpoint in ai-provider.js first.');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Number(config.timeoutMs) || 60000);
        try {
          const token = await getAccessToken?.();
          const response = await fetch(config.endpoint, {
            method: 'POST', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(config.headers || {}) },
            body: JSON.stringify({ message, context: config.sendTrackerContext === false ? undefined : context })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || `Private AI endpoint returned HTTP ${response.status}.`);
          return data;
        } finally { clearTimeout(timeout); }
      }
      if (provider === 'supabase-gemini') {
        if (typeof invoke !== 'function') throw new Error('Supabase AI transport is not available.');
        return invoke({ message, context });
      }
      throw new Error(`Unknown AI provider: ${provider}`);
    }
  };
})();
