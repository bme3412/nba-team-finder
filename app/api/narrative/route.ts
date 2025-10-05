// No SDK import to avoid bundling issues. Use direct REST call instead.

export async function POST(req: Request) {
  try {
    const { topThree, sources } = await req.json()
    if (!Array.isArray(topThree) || !Array.isArray(sources)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      // Return a minimal empty stream if no key
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(''))
          controller.close()
        }
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }

    // Optional: enrich candidates with extra metadata from server-side NBA data
    let teamsJson: any = null
    let reasonsJson: any = null
    try { teamsJson = require('../../../data/teams.json') } catch {}
    try { reasonsJson = require('../../../data/reasons.json') } catch {}

    const statusSnippets = (reasonsJson && reasonsJson.statusSnippets) || {}
    let tagMap: any = null
    try { tagMap = require('../../../data/tagMap.json') } catch {}

    // Load external source leagues for richer source context (NFL, MLB, NHL, F1, Football)
    let footballClubsJson: any = null
    let nflJson: any = null
    let mlbJson: any = null
    let nhlJson: any = null
    let f1Json: any = null
    try { footballClubsJson = require('../../../data/footballClubs.json') } catch {}
    try { nflJson = require('../../../data/nflTeams.json') } catch {}
    try { mlbJson = require('../../../data/mlbTeams.json') } catch {}
    try { nhlJson = require('../../../data/nhlTeams.json') } catch {}
    try { f1Json = require('../../../data/f1Teams.json') } catch {}

    // Short -> Full NBA mapping for primaryTeam resolution
    const shortToFull: Record<string, string> = {
      Lakers: 'Los Angeles Lakers',
      Celtics: 'Boston Celtics',
      Thunder: 'Oklahoma City Thunder',
      '76ers': 'Philadelphia 76ers',
      Warriors: 'Golden State Warriors',
      Clippers: 'Los Angeles Clippers',
      Knicks: 'New York Knicks',
      Magic: 'Orlando Magic',
      Nuggets: 'Denver Nuggets',
      Pistons: 'Detroit Pistons',
      Pacers: 'Indiana Pacers',
      Hornets: 'Charlotte Hornets',
      Heat: 'Miami Heat',
      Spurs: 'San Antonio Spurs',
      Wizards: 'Washington Wizards',
      Bucks: 'Milwaukee Bucks',
      Timberwolves: 'Minnesota Timberwolves',
      Cavaliers: 'Cleveland Cavaliers',
      Suns: 'Phoenix Suns',
      Grizzlies: 'Memphis Grizzlies',
      Kings: 'Sacramento Kings',
      Mavericks: 'Dallas Mavericks',
      'Trail Blazers': 'Portland Trail Blazers',
      Pelicans: 'New Orleans Pelicans',
      Raptors: 'Toronto Raptors',
      Hawks: 'Atlanta Hawks',
      Bulls: 'Chicago Bulls',
      Rockets: 'Houston Rockets',
      Jazz: 'Utah Jazz',
      Nets: 'Brooklyn Nets'
    }

    const humanizeStyles = (arr?: string[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return ''
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
      }
      return arr.map(s => map[s] || s).join(', ')
    }

    const humanizeTags = (arr?: string[]) => {
      if (!Array.isArray(arr) || arr.length === 0) return ''
      return arr.map(s => String(s).replace(/_/g, ' ')).join(', ')
    }

    const watchabilityLabel = (n?: number) => {
      if (typeof n !== 'number') return ''
      if (n >= 90) return `${n}/100 (elite)`
      if (n >= 80) return `${n}/100 (high)`
      if (n >= 65) return `${n}/100 (medium)`
      return `${n}/100 (low)`
    }

    const findMeta = (name: string) => {
      if (!teamsJson) return null
      const cleaned = name?.replace(/^#?\d+\.?\s*/, '')
      if (teamsJson[cleaned]) return teamsJson[cleaned]
      // Try to match by containing the short key inside the full name
      const keys = Object.keys(teamsJson)
      const key = keys.find(k => new RegExp(k, 'i').test(cleaned))
      return key ? teamsJson[key] : null
    }

    // Build a unified lookup for user's source teams (across leagues)
    const sourceMaps = [footballClubsJson, nflJson, mlbJson, nhlJson, f1Json].filter(Boolean) as Array<Record<string, any>>
    const sourceLookup: Record<string, any> = Object.assign({}, ...sourceMaps)

    // For city-linked NBA matching from sources
    const findCityLinkedNba = (city?: string) => {
      if (!teamsJson || !city) return ''
      const sc = String(city).toLowerCase()
      const hit = Object.keys(teamsJson).find(k => {
        const c = (teamsJson as any)[k]?.city?.toString().toLowerCase() || ''
        return c && (c === sc || c.includes(sc) || sc.includes(c))
      })
      return hit || ''
    }

    const sourceEnrichedLines = (sources as string[]).map((name) => {
      const m = sourceLookup[name]
      if (!m) return `- ${name}`
      const league = m.league || (m.conference ? 'NFL' : '')
      const city = m.city || ''
      const statusText2 = m.statusEnum ? (statusSnippets[m.statusEnum] || m.statusEnum) : (m.status || '')
      const stylesText2 = humanizeStyles(m.playingStyles) || humanizeTags(m.playingStyleTags)
      const idText = humanizeTags(m.identityTags)
      const watch2 = watchabilityLabel(m.watchabilityScore)
      const record = m['2025_record'] || m.currentRecord || ''
      const primaryShort = m.primaryTeam || ''
      const primaryFull = primaryShort && shortToFull[primaryShort] ? shortToFull[primaryShort] : primaryShort
      const cityLinked = findCityLinkedNba(city)
      const highlights = m['2025_highlights'] || ''
      return `- ${name}${league ? ` [${league}]` : ''}${city ? ` (${city})` : ''}${statusText2 ? `: ${statusText2}` : ''}${record ? ` | record: ${record}` : ''}${stylesText2 ? ` | style: ${stylesText2}` : ''}${idText ? ` | identity: ${idText}` : ''}${watch2 ? ` | watchability: ${watch2}` : ''}${primaryFull ? ` | primary_nba: ${primaryFull}` : ''}${cityLinked ? ` | city_link_nba: ${cityLinked}` : ''}${highlights ? ` | highlights: ${highlights}` : ''}`
    }).join('\n')

    const enrichedLines = (topThree as any[]).map((t, i) => {
      const meta = findMeta(t.name) || {}
      const statusEnum = meta.statusEnum || ''
      const statusText = statusEnum ? (statusSnippets[statusEnum] || statusEnum) : ''
      const stylesText = humanizeStyles(meta.playingStyles)
      const philosophy = Array.isArray(meta.philosophy) ? meta.philosophy.join(', ') : ''
      const stars = (meta.stars || '').toString()
      const watch = watchabilityLabel(meta.watchabilityScore)
      const tz = meta.timezone || ''
      const viewing = meta.viewingTimes || ''
      const risks = [meta.injuries, meta.dysfunction].filter(Boolean).join(' | ')
      const reasons = (t.reasons || []).filter(Boolean).join(' | ')
      const catchLine = t.catch ? `catch: ${t.catch}` : ''
      // Source-derived identity: collect top tags from inputs if present (identityTags/playingStyleTags)
      const sourceTags: string[] = []
      const srcs = (sources as string[]).map(s => sourceLookup[s]).filter(Boolean)
      srcs.forEach((s: any) => {
        if (Array.isArray(s.identityTags)) sourceTags.push(...s.identityTags)
        if (Array.isArray(s.playingStyleTags)) sourceTags.push(...s.playingStyleTags)
      })
      const uniqueTags = Array.from(new Set(sourceTags)).slice(0, 6)

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
        (risks ? `risks: ${risks}\n` : '') +
        (uniqueTags.length ? `source_identity_tags: ${uniqueTags.join(', ')}\n` : '') +
        (reasons ? `reasons: ${reasons}\n` : '') +
        (catchLine ? `${catchLine}\n` : '')
      )
    }).join('\n')

    const system = `You are a sports concierge. Write persuasive, concrete, fan-friendly explanations for NBA team recommendations.
Rules:
- 3 paragraphs, one per team, in rank order: "Top recommendation:", "Second choice:", "Dark horse:".
- Each paragraph: 3-5 sentences. Be specific; reference the user's source teams, identity/style, current status, stars, and any caveats.
- Avoid generic phrasing. Prefer concrete details. Keep it positive but honest.`

    const labels = ['Top recommendation', 'Second choice', 'Dark horse']
    const mapping = (topThree as any[]).map((t, i) => `${labels[i]} -> ${t.name}`).join('\n')

    const user = `Source teams: ${sources.join(', ')}
Source context:
${sourceEnrichedLines}

Candidates (with metadata):
${enrichedLines}

Write EXACTLY three paragraphs in this order, and start each paragraph EXACTLY like this (including the team name and an em dash after the name):
${mapping}
Format:
Top recommendation: {Team 1} — {paragraph}

Second choice: {Team 2} — {paragraph}

Dark horse: {Team 3} — {paragraph}

Hard constraints:
- Do not swap team names; each paragraph must be about the mapped team only.
- Do not add extra headings or lists; only the three paragraphs.
Preference guidance:
- If a source lists a primary_nba that matches one of the three candidates, explicitly connect that link in the rationale.
- If a source city maps to a city_link_nba matching a candidate, use it to explain the fit ("complete your {city} set").
- Avoid defaulting to the same 3-4 glamour teams; focus on the specific identity tags and context of the user's source teams to justify each recommendation.
Compose the three paragraphs now in plain text.`

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
        max_completion_tokens: 1000,
        stream: true
      })
    })

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text()
      return new Response(JSON.stringify({ error: errText }), { status: 500 })
    }

    const encoder = new TextEncoder()
    const reader = upstream.body.getReader()
    let buffer = ''

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }
        buffer += new TextDecoder().decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.replace(/^data:\s*/, '')
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            const json = JSON.parse(data)
            const delta = json?.choices?.[0]?.delta?.content
            if (delta) controller.enqueue(encoder.encode(delta))
          } catch {
            // ignore malformed chunk
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 })
  }
}


