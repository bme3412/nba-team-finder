// Client-side helper now calls a server route to avoid bundling the SDK
export function getOpenAI() {
  return null
}

export async function generateTeamNarrative(
  topThree: Array<{ name: string; headline?: string; reasons?: string[]; catch?: string }>,
  sources: string[],
  onToken?: (chunk: string) => void
): Promise<string[] | null> {
  // Stream response from server route; accumulate text and optionally send chunks upstream
  try {
    const res = await fetch('/api/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topThree, sources })
    })
    if (!res.body) {
      const txt = await res.text()
      if (onToken && txt) onToken(txt)
      return txt ? txt.split(/\n\n+/).slice(0, 3) : null
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      full += chunk
      if (onToken) onToken(chunk)
    }
    return full ? full.split(/\n\n+/).slice(0, 3) : null
  } catch {
    return null
  }
  
}


export async function generateQuizNarrative(
  results: Array<{ name: string; headline?: string; reasons?: string[]; catch?: string }>,
  answers: Record<string, any>,
  onToken?: (chunk: string) => void
): Promise<string[] | null> {
  try {
    const res = await fetch('/api/quiz-narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, answers })
    })
    if (!res.body) {
      const txt = await res.text()
      if (onToken && txt) onToken(txt)
      return txt ? txt.split(/\n\n+/).slice(0, 3) : null
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      full += chunk
      if (onToken) onToken(chunk)
    }
    return full ? full.split(/\n\n+/).slice(0, 3) : null
  } catch {
    return null
  }
}


export async function generatePlayerNarrative(
  players: Array<{ player: string; team?: string }>,
  traits: string[],
  onToken?: (chunk: string) => void
): Promise<string | null> {
  try {
    const res = await fetch('/api/player-narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      body: JSON.stringify({ players, traits })
    })
    if (!res.body) {
      const txt = await res.text()
      if (onToken && txt) onToken(txt)
      return txt || null
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() || ''
      for (const frame of frames) {
        if (!frame.startsWith('data:')) continue
        // Remove only the literal "data: " prefix; preserve any leading space emitted by the model
        const payload = frame.startsWith('data: ') ? frame.slice(6) : frame.replace(/^data:/, '')
        if (!payload) continue
        full += payload
        if (onToken) onToken(payload)
      }
    }
    // flush any trailing payload
    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().replace(/^data:\s*/, '')
      full += payload
      if (onToken) onToken(payload)
    }
    return full || null
  } catch {
    return null
  }
}


