export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const BASE = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

type Ctx = {
  teams: { 1: string; 2: string };
  score: { 1: number; 2: number };
  phase: string;
  minute: number | null;
  discipline: Record<string, [number, number]>;
  var: { for: [number, number]; against: [number, number]; overturned: [number, number] };
  scorers: { team: string; players: string[] }[];
  decisions: { minute: number | null; team: string | null; text: string }[];
};

function systemPrompt(ctx: Ctx): string {
  return [
    "You are REF, an AI football match analyst. You know the IFAB Laws of the Game",
    "well, but you ALWAYS explain in plain, friendly language a casual fan understands.",
    "Be concise (2-4 short sentences per answer unless asked for more), neutral and factual.",
    "Never say a match was biased, fixed, or rigged. If something stands out, describe it",
    'as "within normal range", "unusual", or "rare". Base every statement ONLY on the match',
    "data below — if the data does not answer a question, say so plainly.",
    "",
    "MATCH DATA (JSON):",
    JSON.stringify(ctx),
  ].join("\n");
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json(
      { error: "AI analyst not configured — add OPENAI_API_KEY to .env.local" },
      { status: 503 },
    );
  }
  let body: { context: Ctx; messages: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const messages = [
    { role: "system" as const, content: systemPrompt(body.context) },
    ...body.messages.slice(-12),
  ];

  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.4, max_tokens: 400 }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return Response.json({ error: `model error ${res.status}: ${detail}` }, { status: 502 });
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return Response.json({ reply });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "request failed" },
      { status: 502 },
    );
  }
}
