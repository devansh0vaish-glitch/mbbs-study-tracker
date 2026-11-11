const MODEL = "@cf/zai-org/glm-4.7-flash";
const ORIGIN = "https://devansh0vaish-glitch.github.io";
const SYSTEM = `You are an evidence-conscious MBBS undergraduate tutor and study-tracker copilot for a medical student in India. Give accurate, exam-oriented explanations. Use clear headings, concise comparison tables and stepwise mechanisms when useful. Prioritize Robbins and Cotran for pathology, KD Tripathi 8th edition for pharmacology, Apurba Sastry for microbiology and Park for community medicine. Never invent textbook quotations, references, clinical facts, tracker facts, topic keys, dates or task IDs. Use Mermaid flowcharts when useful; use charts only with supplied numerical data. Do not provide patient-specific diagnosis or treatment advice. Propose tracker actions only when explicitly requested, using exact supplied IDs and dates. Allowed actions: complete_topics(topicKeys), set_topic_completion(topicKey,completed), set_daily_goal(target), update_user_goals(weeklyMinutes,weeklyTopics), add_planner_tasks(tasks), remove_planner_tasks(taskIds), update_planner_settings(availableMinutes,newLimit,prioritySubject). The app validates and asks confirmation before writing. Never claim an action was applied. Return only JSON with keys reply (string) and actions (array).`;
const ALLOWED = new Set(["complete_topics","set_topic_completion","set_daily_goal","update_user_goals","add_planner_tasks","remove_planner_tasks","update_planner_settings"]);
function respond(req: Request, body: unknown, status = 200) {
  const headers = new Headers({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"});
  const origin = req.headers.get("Origin") || "";
  if (origin === ORIGIN) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), {status, headers});
}
function compact(raw: any) {
  const c = raw && typeof raw === "object" ? raw : {};
  const t = c.tracker && typeof c.tracker === "object" ? c.tracker : {};
  const keys = ["today","syllabus","backlog","subjects","revisionDue","unresolvedMistakes","recentStudyMinutes","recentTopicsCompleted","weeklyGoals","upcomingExams","availableMinutes","topLocalRecommendations","topicCatalog","planner","dailyGoal","userGoals"];
  const tracker: Record<string,unknown> = {};
  for (const k of keys) if (t[k] !== undefined) tracker[k] = t[k];
  if (Array.isArray((tracker as any).topicCatalog)) (tracker as any).topicCatalog = (tracker as any).topicCatalog.slice(0,35);
  if (Array.isArray((tracker as any).subjects)) (tracker as any).subjects = (tracker as any).subjects.slice(0,15);
  if (Array.isArray((tracker as any).planner?.days)) (tracker as any).planner.days = (tracker as any).planner.days.slice(-10);
  return {
    conversation: Array.isArray(c.conversation) ? c.conversation.slice(-6).map((m:any)=>({role:m?.role==="assistant"?"assistant":"user",content:String(m?.content||"").slice(-900)})) : [],
    conversationSummary: typeof c.conversationSummary === "string" ? c.conversationSummary.slice(-1800) : "",
    tracker
  };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin") || "";
    if (origin !== ORIGIN) return new Response("Forbidden", {status:403});
    return new Response("ok", {headers:{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin"}});
  }
  if (req.method !== "POST") return respond(req,{error:"Method not allowed."},405);
  try {
    const origin = req.headers.get("Origin") || "";
    if (origin && origin !== ORIGIN) return respond(req,{error:"Origin not allowed."},403);
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return respond(req,{error:"Sign in is required."},401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publicKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !publicKey) return respond(req,{error:"Supabase authentication is not configured."},500);
    const authCheck = await fetch(supabaseUrl + "/auth/v1/user", {headers:{apikey:publicKey,Authorization:authorization},signal:AbortSignal.timeout(5000)});
    if (!authCheck.ok) return respond(req,{error:"Your session is invalid or expired. Sign in again."},401);
    const user = await authCheck.json();
    if (typeof user?.id !== "string") return respond(req,{error:"Unable to verify your account."},401);
    let payload: any;
    try { payload = await req.json(); } catch { return respond(req,{error:"Request body must be valid JSON."},400); }
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";
    if (!message) return respond(req,{error:"Enter a question first."},400);
    if (message.length > 6000) return respond(req,{error:"Message is too long."},413);
    const context = JSON.stringify(compact(payload.context));
    if (context.length > 18000) return respond(req,{error:"Tracker context is too large. Narrow the request and retry."},413);
    const account = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
    if (!account || !token) return respond(req,{error:"Cloud AI is not configured on the server."},503);
    const endpoint = "https://api.cloudflare.com/client/v4/accounts/" + encodeURIComponent(account) + "/ai/run/" + MODEL;
    let cf: Response;
    try {
      cf = await fetch(endpoint, {
        method:"POST",
        headers:{Authorization:"Bearer " + token,"Content-Type":"application/json"},
        body:JSON.stringify({messages:[{role:"system",content:SYSTEM},{role:"user",content:"TRACKER CONTEXT (JSON):\n"+context+"\n\nUSER REQUEST:\n"+message}],max_tokens:1400,temperature:0.1,chat_template_kwargs:{enable_thinking:false}}),
        signal:AbortSignal.timeout(14000)
      });
    } catch (e) {
      console.error("Cloudflare inference transport failure", e instanceof Error ? e.name + ": " + e.message : "unknown");
      return respond(req,{error:"The cloud AI provider timed out or could not be reached. Please retry in a moment."},200);
    }
    let result: any;
    try { result = await cf.json(); } catch {
      console.error("Cloudflare returned non-JSON response", cf.status);
      return respond(req,{error:"The cloud AI provider returned an unreadable response. Please retry."},200);
    }
    if (!cf.ok || result?.success === false) {
      const details = Array.isArray(result?.errors) ? result.errors.map((x:any)=>x?.message).filter(Boolean).join("; ").slice(0,220) : "";
      console.error("Cloudflare inference rejected", cf.status, details);
      return respond(req,{error:cf.status===429 ? "Cloud AI rate limit reached. Please wait briefly and retry." : "Cloud AI request failed" + (details ? ": " + details : " (HTTP " + cf.status + ").")},200);
    }
    const rawText = (typeof result?.result?.response === "string" ? result.result.response : typeof result?.result?.choices?.[0]?.message?.content === "string" ? result.result.choices[0].message.content : typeof result?.choices?.[0]?.message?.content === "string" ? result.choices[0].message.content : typeof result?.response === "string" ? result.response : "").trim();
    if (!rawText) {
      console.error("Cloudflare response contained no text", JSON.stringify(result?.result || {}).slice(0,300));
      return respond(req,{error:"The cloud AI returned an empty response. Please retry."},200);
    }
    let parsed: any;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const start = rawText.indexOf("{"), end = rawText.lastIndexOf("}");
      try { parsed = start >= 0 && end > start ? JSON.parse(rawText.slice(start,end+1)) : {reply:rawText,actions:[]}; }
      catch { parsed = {reply:rawText,actions:[]}; }
    }
    const reply = typeof parsed?.reply === "string" ? parsed.reply : rawText;
    const actions = Array.isArray(parsed?.actions) ? parsed.actions.filter((a:any)=>a && typeof a==="object" && ALLOWED.has(a.type)).slice(0,5) : [];
    console.log("study-assistant success", JSON.stringify({model:MODEL,replyChars:reply.length,actions:actions.length}));
    return respond(req,{reply,actions,provider:"Cloudflare Workers AI",model:MODEL});
  } catch (e) {
    console.error("study-assistant gateway error",e instanceof Error ? e.name + ": " + e.message : "unknown");
    return respond(req,{error:"The study assistant encountered a temporary server error. Please retry."},200);
  }
});
