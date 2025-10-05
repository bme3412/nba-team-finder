// Streaming narrative for QuizFlow results (client → server → OpenAI → stream back)

export async function POST(req: Request) {
  try {
    const { results, answers } = await req.json();
    if (!Array.isArray(results)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(''));
          controller.close();
        }
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    let teamsJson: any = null;
    let reasonsJson: any = null;
    try { teamsJson = require('../../../data/teams.json'); } catch {}
    try { reasonsJson = require('../../../data/reasons.json'); } catch {}

    const statusSnippets = (reasonsJson && reasonsJson.statusSnippets) || {};

    const humanizeStyles = (arr?: string[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      const map: Record<string, string> = {
        fast_paced: 'fast-paced transition offense',
        three_point: 'three-point shooting and spacing',
        defensive: 'defensive intensity and physicality',
        team_first: 'team-first ball movement',
        star_dominance: 'superstar-driven attack',
        playmaking: 'elite playmaking',
        balanced: 'balanced two-way style',
        big_man_focused: 'frontcourt-focused attack',
        clutch: 'late-game shotmaking'
      };
      return arr.map(s => map[s] || s).join(', ');
    };

    const watchabilityLabel = (n?: number) => {
      if (typeof n !== 'number') return '';
      if (n >= 90) return `${n}/100 (elite)`;
      if (n >= 80) return `${n}/100 (high)`;
      if (n >= 65) return `${n}/100 (medium)`;
      return `${n}/100 (low)`;
    };

    const toLines = (list: any[]) => list.map((t: any, i: number) => {
      const key = t.name;
      const meta = (teamsJson && (teamsJson as any)[key]) || {};
      const statusEnum = meta.statusEnum || '';
      const statusText = statusEnum ? (statusSnippets[statusEnum] || statusEnum) : '';
      const stylesText = humanizeStyles(meta.playingStyles);
      const philosophy = Array.isArray(meta.philosophy) ? meta.philosophy.join(', ') : '';
      const stars = (meta.stars || '').toString();
      const watch = watchabilityLabel(meta.watchabilityScore);
      const tz = meta.timezone || '';
      const viewing = meta.viewingTimes || '';
      const reasons = (t.reasons || []).filter(Boolean).join(' | ');
      const catchLine = t.catch ? `catch: ${t.catch}` : '';
      return (
        `${i + 1}. ${t.name}\n` +
        `headline: ${t.headline || ''}\n` +
        (statusText ? `status: ${statusText}\n` : '') +
        (stylesText ? `style: ${stylesText}\n` : '') +
        (philosophy ? `philosophy: ${philosophy}\n` : '') +
        (stars ? `stars: ${stars}\n` : '') +
        (watch ? `watchability: ${watch}\n` : '') +
        (tz ? `timezone: ${tz}\n` : '') +
        (viewing ? `viewing: ${viewing}\n` : '') +
        (reasons ? `reasons: ${reasons}\n` : '') +
        (catchLine ? `${catchLine}\n` : '')
      );
    }).join('\n');

    const labels = ['Top recommendation', 'Second choice', 'Dark horse'];
    const mapping = results.slice(0, 3).map((t: any, i: number) => `${labels[i]} -> ${t.name}`).join('\n');

    const system = `You are a sports concierge. Write persuasive, concrete, fan-friendly explanations for NBA team recommendations.
Rules:
- 3 paragraphs, one per team, in rank order: "Top recommendation:", "Second choice:", "Dark horse:".
- Each paragraph: 3-5 sentences. Be specific; reference the user's location/timezone, nationality, preferred style/philosophy, and any caveats.
- Only use details that appear in the provided metadata for each team. Do NOT invent trades, signings or injuries.
- Mention player names only if included in the team's stars list; otherwise speak generically (e.g., "French superstar center").
- Avoid generic phrasing. Prefer concrete details. Keep it positive but honest.`;

    const user = `User inputs: ${JSON.stringify(answers)}

Candidates (with metadata):
${toLines(results.slice(0, 3))}

Write EXACTLY three paragraphs in this order, and start each paragraph EXACTLY like this (including the team name and an em dash after the name):
${mapping}
Format:
Top recommendation: {Team 1} — {paragraph}

Second choice: {Team 2} — {paragraph}

Dark horse: {Team 3} — {paragraph}

Hard constraints:
- Do not swap team names; each paragraph must be about the mapped team only.
- Do not add extra headings or lists; only the three paragraphs.
Compose the three paragraphs now in plain text.`;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        max_completion_tokens: 900,
        stream: true
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
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}


