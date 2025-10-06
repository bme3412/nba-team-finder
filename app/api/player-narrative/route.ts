// Prefer the Edge runtime for lower latency streaming
export const runtime = 'edge'
export const dynamic = 'force-dynamic'
// Streaming narrative for player trait selections

export async function POST(req: Request) {
  try {
    const { players, traits } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const stream = new ReadableStream({ start(c){ c.enqueue(new TextEncoder().encode('')); c.close(); } });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const items = (players || []).slice(0, 8);
    const list = items.map((p: any, i: number) => `${i+1}. ${p.player}${p.team ? ` (${p.team})` : ''}`).join('\n');
    const traitText = Array.isArray(traits) && traits.length ? traits.join(', ') : 'beginner preferences';

    const system = `You are a friendly NBA guide for beginners. Write vivid, punchy hooks that make each player compelling to follow fast.
Rules and tone:
- Plain text only (no markdown/emojis). Conversational, energetic, but professional.
- 1–2 sentences per item, ~25–45 words total; avoid filler.
- Be specific about role/archetype, signature skills/moves, typical usage (on-ball/off-ball), and why games featuring this player are fun to watch.
- Use current team names only. Do NOT invent trades, injuries, or precise stats. Prefer timeless descriptors over numbers.
- When traits are provided, weave 1–2 of them naturally into each hook.`;
    const user = `Traits picked: ${traitText}

Players to rank and explain (use EXACTLY these names, no repeats, one line per player):
${list}

Write a numbered list with EXACTLY ${items.length} items. For EACH item, write 1–2 sentences (25–45 words). Format each line EXACTLY like this (one line per item):
1. Player Name (Team): compelling two-sentence hook highlighting skills/role, why it’s fun to watch, and a tie-in to the user’s traits when relevant.
No extra blank lines. No markdown. No emojis. Do not add or repeat players.`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(':ok\n\n'));
        for (let i = 0; i < items.length; i++) {
          const p = items[i];
          const prefix = `${i + 1}. ${p.player}${p.team ? ` (${p.team})` : ''}: `;
          controller.enqueue(encoder.encode(`data: ${prefix}` + '\n\n'));
          const localUser = `Traits picked: ${traitText}\n\nWrite a compelling 1–2 sentence hook (25–45 words) about why ${p.player}${p.team ? ` of the ${p.team}` : ''} is fun to follow. Mention role/archetype and signature skills; tie to 1–2 of the traits. Plain text only. END THE HOOK WITH A PERIOD, no trailing tokens.`;
          const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [ { role: 'system', content: system }, { role: 'user', content: localUser } ],
              stream: true,
              max_completion_tokens: 120,
              temperature: 0.7,
              top_p: 0.9
            })
          });
          if (!upstream.ok || !upstream.body) {
            controller.enqueue(encoder.encode(`data: dynamic scorer, fun watch factor.\n\n`));
            continue;
          }
          const reader = upstream.body.getReader();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += new TextDecoder().decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const data = trimmed.replace(/^data:\s*/, '');
              if (data === '[DONE]') break;
              try {
                const json = JSON.parse(data);
                const delta = json?.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(`data: ${delta.replace(/\s+/g, ' ')}\n\n`));
              } catch {}
            }
          }
          controller.enqueue(encoder.encode('data: __NL__\n\n'));
        }
        controller.close();
      }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}


