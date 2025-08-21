import { useState } from 'react'
import axios from 'axios'
import type { ChatTurn, Citation } from '../types'

export default function ChatPanel({
  docId,
  onCitationClick
}: {
  docId: string | null
  onCitationClick: (page: number) => void
}) {
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [citations, setCitations] = useState<Citation[]>([])

  async function ask() {
    if (!docId || !input.trim()) return
    const q = input.trim()
    setInput('')
    setBusy(true)
    setHistory(h => [...h, { role: 'user', content: q }])
    try {
      const { data } = await axios.post('/api/chat', { docId, question: q })
      setHistory(h => [...h, { role: 'assistant', content: data.text }])
      setCitations(data.citations || [])
    } catch (e: any) {
      setHistory(h => [...h, { role: 'assistant', content: 'Error getting answer.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-3 overflow-auto space-y-3">
        {history.map((t, i) => (
          <div key={i} className={t.role === 'user' ? 'text-right' : ''}>
            <div className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 ${t.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
              {t.content}
            </div>
            {t.role === 'assistant' && citations.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2">
                {citations.map((c, j) => (
                  <button
                    key={`${i}-${j}`}
                    className="text-xs underline text-blue-700"
                    onClick={() => onCitationClick(c.page)}
                    title={`Score ${c.score}`}
                  >
                    Page {c.page}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder={docId ? "Ask about this PDF..." : "Upload a PDF first"}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => (e.key === 'Enter' ? ask() : null)}
          disabled={!docId || busy}
        />
        <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" onClick={ask} disabled={!docId || busy}>
          {busy ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
