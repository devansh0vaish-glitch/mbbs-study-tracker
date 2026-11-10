// Secure, authenticated AI assistant for MBBS Study Tracker V36.
// Configure OPENAI_API_KEY as a Supabase Function secret. Never put it in browser code.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Sign in is required.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const keyMapRaw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
    const legacyKey = Deno.env.get('SUPABASE_ANON_KEY');
    let publishableKey = req.headers.get('apikey') || legacyKey || '';
    if (!publishableKey && keyMapRaw) {
      try { publishableKey = JSON.parse(keyMapRaw).default || ''; } catch { /* checked below */ }
    }
    if (!supabaseUrl || !publishableKey) return json({ error: 'Supabase function authentication is not configured.' }, 500);

    // Verify the caller's JWT. Do not trust user identity supplied in the request body.
    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: authHeader }
    });
    if (!userCheck.ok) return json({ error: 'Your session is invalid or expired. Please sign in again.' }, 401);

    const payload = await req.json();
    const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 3000) : '';
    const context = payload?.context && typeof payload.context === 'object' ? JSON.stringify(payload.context).slice(0, 12000) : '{}';
    if (!message) return json({ error: 'Enter a question first.' }, 400);

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) return json({ error: 'AI is not enabled yet. Add OPENAI_API_KEY to your Supabase Function secrets.' }, 503);
    const model = Deno.env.get('OPENAI_MODEL') || 'gpt-6-luna';
    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 900,
        input: [
          {
            role: 'system',
            content: 'You are a practical MBBS study-planning assistant. Use the supplied tracker context to give concise, realistic academic planning advice. Do not claim to have changed tracker data. Never give patient-specific diagnosis or treatment advice. When asked for study schedules, protect time for revision, breaks and realistic workload. State uncertainty when context is incomplete.'
          },
          {
            role: 'user',
            content: `Tracker context (JSON):\n${context}\n\nUser request:\n${message}`
          }
        ]
      })
    });
    const result = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      const detail = result?.error?.message || `AI request failed (${aiResponse.status}).`;
      return json({ error: detail }, 502);
    }
    const reply = typeof result.output_text === 'string'
      ? result.output_text
      : (result.output || []).flatMap((item: any) => item.content || []).filter((part: any) => part.type === 'output_text').map((part: any) => part.text).join('\n');
    if (!reply) return json({ error: 'The AI service returned an empty response.' }, 502);
    return json({ reply, model });
  } catch (error) {
    console.error('study-assistant error:', error);
    return json({ error: 'The study assistant is temporarily unavailable.' }, 500);
  }
});
