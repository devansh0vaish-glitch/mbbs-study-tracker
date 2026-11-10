// MBBS Study Tracker V36 — Gemini assistant with safe, confirm-before-apply tracker proposals.
// Store GEMINI_API_KEY only as a Supabase Edge Function secret.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
const SYSTEM = `You are the AI study assistant embedded in an MBBS study tracker.
Use the supplied tracker state and complete conversation history. Treat the newest user turn as the current request and use earlier turns to resolve references such as "that topic", "same plan", "change it", or "as discussed". Do not ask the user to repeat information already in the conversation.
Never invent tracker facts, topic keys, dates, subject names, completion states, or task IDs. Use exact identifiers from the supplied context.
You can propose tracker changes using the action schema below. The app will validate every action and require the user's explicit confirmation before writing anything. Never claim a change is already applied.
Return ONLY a valid JSON object: {"reply":"Markdown response","actions":[]}.
Allowed actions:
- {"type":"complete_topics","topicKeys":["exact topicKey", ...]} (up to 30)
- {"type":"set_topic_completion","topicKey":"exact topicKey","completed":true|false}
- {"type":"set_daily_goal","target":number} (new topics to add to today's target, integer 1-100)
- {"type":"update_user_goals","weeklyMinutes":number,"weeklyTopics":number} (weekly targets; include only fields the user asked to change)
- {"type":"add_planner_tasks","tasks":[{"date":"YYYY-MM-DD","topicKey":"exact topicKey","type":"study"|"revision","minutes":30}]}
- {"type":"remove_planner_tasks","taskIds":["exact existing task id", ...]}
- {"type":"update_planner_settings","availableMinutes":240,"newLimit":5,"prioritySubject":"exact subject string"}
Only propose actions when the user clearly requests a data change. For advice, explanations, planning recommendations, or questions, return actions: []. If an action needs clarification, ask one concise question and return actions: []. Do not propose more than 30 topic completions, 14 planner tasks, or 30 task deletions in one action. Weekly study-minute targets must be 60-10080 and weekly topic targets 1-300. Dates must be today or later. Task durations must be 5-240 minutes. A set_daily_goal changes the daily target; it does not complete any topics. A set_topic_completion false reopens a topic. For requests to "set my goal" distinguish daily topic target from weekly minutes/topics goals; ask if ambiguous.
You are an academic study assistant, not a patient-care decision tool. Do not provide patient-specific diagnosis or treatment advice.`;
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in is required." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const legacyKey = Deno.env.get("SUPABASE_ANON_KEY");
    let publishableKey = req.headers.get("apikey") || legacyKey || "";
    const keyMapRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
    if (!publishableKey && keyMapRaw) {
      try { publishableKey = JSON.parse(keyMapRaw).default || ""; } catch { /* validated below */ }
    }
    if (!supabaseUrl || !publishableKey) return json({ error: "Supabase function authentication is not configured." }, 500);
    const userCheck = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: publishableKey, Authorization: authHeader } });
    if (!userCheck.ok) return json({ error: "Your session is invalid or expired. Please sign in again." }, 401);

    let payload: any;
    try { payload = await req.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400); }
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
    const contextObject = payload?.context && typeof payload.context === "object" ? payload.context : {};
    // Server-side safety cap mirrors the client context budget. Never forward an unbounded tracker dump.
    if (Array.isArray(contextObject.conversation)) contextObject.conversation = contextObject.conversation.slice(-8).map((m: any) => ({ role: m?.role, content: String(m?.content || "").slice(-1200) }));
    if (Array.isArray(contextObject.tracker?.topicCatalog)) contextObject.tracker.topicCatalog = contextObject.tracker.topicCatalog.slice(0, 45);
    if (Array.isArray(contextObject.tracker?.planner?.days)) contextObject.tracker.planner.days = contextObject.tracker.planner.days.slice(-14);
    const context = JSON.stringify(contextObject);
    if (!message) return json({ error: "Enter a question first." }, 400);
    if (message.length > 8000 || context.length > 60000) return json({ error: "The AI context is still too large. Narrow the question or start a new chat; no partial tracker action was applied." }, 413);
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "Live AI is not configured. Add GEMINI_API_KEY to Supabase Function secrets." }, 503);

    const input = `${SYSTEM}\n\nCOMPACT TRACKER CONTEXT AND RECENT CHAT (JSON):\n${context}\n\nLATEST USER REQUEST:\n${message}`;
    const modelFallbacks = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];
    let aiResponse: Response | undefined;
    let activeModel = modelFallbacks[0];
    let lastProviderStatus = 0;

    // Retry transient 503 once; immediately fall back on 429 or timeout.
    for (const candidate of modelFallbacks) {
      activeModel = candidate;
      let tryNextModel = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({ model: candidate, input, store: false, generation_config: { max_output_tokens: 1400, temperature: 0.2 } }),
            signal: AbortSignal.timeout(14000),
          });
        } catch (e) {
          console.warn(`Gemini request failed for ${candidate}; switching model`, e);
          tryNextModel = true;
          aiResponse = undefined;
          break;
        }
        lastProviderStatus = aiResponse.status;
        if (aiResponse.status === 429 || aiResponse.status === 503) {
          if (aiResponse.status === 503 && attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 600));
            continue;
          }
          console.warn(`Gemini ${candidate} returned ${aiResponse.status}; switching model.`);
          tryNextModel = true;
          aiResponse = undefined;
          break;
        }
        break;
      }
      if (!tryNextModel && aiResponse) break;
    }
    if (!aiResponse) {
      const status = lastProviderStatus === 429 ? 429 : 503;
      return json({ error: status === 429
        ? "Gemini rate limit reached on both models. Please wait briefly and retry."
        : "Gemini primary and fallback models timed out or are temporarily unavailable. Please try again shortly." }, status);
    }

    const raw = await aiResponse.text();
    let result: any = {};
    try { result = raw ? JSON.parse(raw) : {}; } catch { return json({ error: "Gemini returned an unexpected response." }, 502); }
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) return json({ error: "Gemini quota or rate limit reached. No paid-provider fallback was used." }, 429);
      const detail = typeof result?.error?.message === "string" ? result.error.message.slice(0, 400) : "Gemini request failed.";
      return json({ error: `Gemini error (HTTP ${aiResponse.status}): ${detail}` }, 502);
    }

    const textOutput = (result?.steps || [])
      .filter((step: any) => step?.type === "model_output")
      .flatMap((step: any) => Array.isArray(step.content) ? step.content : [])
      .filter((part: any) => part?.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text).join("\n").trim();
    if (!textOutput) return json({ error: "Gemini returned no text. Try rephrasing your request." }, 502);

    let parsed: any = null;
    try {
      const cleaned = textOutput.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch { /* Return plain model text safely without executable actions. */ }
    const reply = typeof parsed?.reply === "string" ? parsed.reply : textOutput;
    const actions = Array.isArray(parsed?.actions) ? parsed.actions.slice(0, 5) : [];
    return json({ reply, actions, model: activeModel, provider: "Google Gemini Interactions API" });
  } catch (error) {
    console.error("study-assistant error:", error);
    return json({ error: "The study assistant is temporarily unavailable. Try again shortly." }, 500);
  }
});
