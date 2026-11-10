// Free-tier Gemini assistant for MBBS Study Tracker V36.
// Store GEMINI_API_KEY only as a Supabase Edge Function secret. Never expose it in browser code.
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
      try { publishableKey = JSON.parse(keyMapRaw).default || ''; } catch { /* validated below */ }
    }
    if (!supabaseUrl || !publishableKey) return json({ error: 'Supabase function authentication is not configured.' }, 500);
    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: authHeader } });
    if (!userCheck.ok) return json({ error: 'Your session is invalid or expired. Please sign in again.' }, 401);

    const payload = await req.json();
    const message = typeof payload?.message === 'string' ? payload.message.trim().slice(0, 2500) : '';
    const context = payload?.context && typeof payload.context === 'object' ? JSON.stringify(payload.context).slice(0, 9000) : '{}';
    if (!message) return json({ error: 'Enter a question first.' }, 400);
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'Free live AI is not configured. Add GEMINI_API_KEY to Supabase Function secrets.' }, 503);

    // Use a model listed on Google's Gemini API free tier. No paid-provider fallback is implemented.
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const aiResponse = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are the study-planning and academic productivity assistant inside an MBBS study tracker. Do not act as a general medical tutor. Use the supplied tracker data to make specific, realistic recommendations about syllabus coverage, study planning, revision, weak subjects, assessments, MCQ practice, flashcards, viva practice and weekly reviews. Do not claim to have changed tracker data. Never give patient-specific diagnosis or treatment advice. Do not invent tracker facts. If data is missing, say so. Protect time for revision, breaks and realistic workload. Suggestions require the user\'s approval before being saved.' }] },
        contents: [{ role: 'user', parts: [{ text: `Tracker context (JSON):\n${context}\n\nUser request:\n${message}` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 1000 }
      })
    });
    const result = await aiResponse.json().catch(() => ({}));
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return json({ error: 'The free Gemini quota or rate limit has been reached. Your offline study assistant is still available; try again after the quota resets.' }, 429);
      const detail = result?.error?.message || `Gemini request failed (${aiResponse.status}).`;
      return json({ error: detail }, aiResponse.status >= 500 ? 503 : 502);
    }
    const reply = (result?.candidates?.[0]?.content?.parts || []).map((part: any) => typeof part.text === 'string' ? part.text : '').join('\n').trim();
    if (!reply) return json({ error: 'The free AI service returned no text. The local assistant remains available.' }, 502);
    return json({ reply, model, provider: 'Google Gemini free tier' });
  } catch (error) {
    console.error('study-assistant error:', error);
    return json({ error: 'The free study assistant is temporarily unavailable. Use the offline recommendations and try again later.' }, 500);
  }
});
