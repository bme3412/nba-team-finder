// Streaming narrative for player trait selections

export async function POST(req: Request) {
  try {
    const { players, traits } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const stream = new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode('')); c.close(); } });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const items = (players || []).slice(0, 7);
    const list = items.map((p: any, i: number) => `${i+1}. ${p.player}${p.team ? ` (${p.team})` : ''}`).join('\n');
    const traitText = Array.isArray(traits) && traits.length ? traits.join(', ') : 'beginner preferences';

    const system = `You are a friendly NBA guide for beginners. Explain why each suggested player is fun to follow in plain language. Do NOT use markdown, bold, asterisks, or emojis.`;
    const user = `Traits picked: ${traitText}

Players to rank and explain (use EXACTLY these names, no repeats, one line per player):
${list}

Write a short numbered list with exactly ${items.length} items. Format each line exactly like this:
1. Player Name (Team): short hook; what to watch for in plain language.
No extra blank lines. No markdown. Keep sentences short and clear. Do not add or repeat players.`;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
        stream: true,
        max_completion_tokens: 700
      })
    });
    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }
    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();
    let buffer = '';
    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        buffer += new TextDecoder().decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.replace(/^data:\s*/, '');
          if (data === '[DONE]') { controller.close(); return; }
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {}
        }
      }
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}


