import React, { useState, useRef, useEffect, useCallback } from 'react'
import CanvasPreview from './components/CanvasPreview'
import JsonViewer from './components/JsonViewer'
import { INITIAL_JSON } from './initialJson'


const SUGGESTIONS = [
  { label: '9:16 Portrait',   text: 'Convert this design to 9:16' },
  { label: 'Keep product',    text: 'Keep the product large' },
  { label: 'Headline top',    text: 'Move the headline to the top' },
  { label: 'Badge higher',    text: 'Move the offer badge higher' },
  { label: 'Smaller headline',text: 'Make the headline smaller' },
  { label: 'Center sub',      text: 'Center the subheadline' },
  { label: '4:5 Portrait',    text: 'Convert this design to 4:5' },
  { label: 'Reset to 1:1',    text: 'Convert back to 1:1 square format' },
]


function ThinkingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </span>
  )
}

function StatusBadge({ artboard, undoLen, redoLen }) {
  if (!artboard) return null
  const ratio = (artboard.width / artboard.height).toFixed(2)
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center',
      fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
    }}>
      <span style={{
        background: 'var(--surface-3)', border: '1px solid var(--border)',
        padding: '2px 7px', borderRadius: 3, color: 'var(--text-dim)',
      }}>
        {artboard.width}×{artboard.height}
      </span>
      <span style={{
        background: 'var(--accent-dim)', border: '1px solid rgba(167,139,250,0.2)',
        padding: '2px 7px', borderRadius: 3, color: 'var(--accent)',
      }}>
        {ratio}:1
      </span>
      {undoLen > 0 && (
        <span style={{ color: 'var(--text-muted)' }}>{undoLen} step{undoLen > 1 ? 's' : ''}</span>
      )}
    </div>
  )
}


export default function App() {
  const [designJson, setDesignJson]   = useState(INITIAL_JSON)
  const [undoStack, setUndoStack]     = useState([])
  const [redoStack, setRedoStack]     = useState([])
  const [messages, setMessages]       = useState([{
    role: 'assistant',
    content: 'Hello!',
  }])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('canvas')
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])


  const pushUndo = useCallback((json) => {
    setUndoStack(s => [...s, json])
    setRedoStack([])
  }, [])

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const prev = undoStack[undoStack.length - 1]
    setRedoStack(s => [...s, designJson])
    setDesignJson(prev)
    setUndoStack(s => s.slice(0, -1))
  }, [undoStack, designJson])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setUndoStack(s => [...s, designJson])
    setDesignJson(next)
    setRedoStack(s => s.slice(0, -1))
  }, [redoStack, designJson])


  const buildHistory = useCallback((msgs) => {
    return msgs
      .slice(1)
      .map(m => ({ role: m.role, content: m.content }))
  }, [])


  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return
    setError(null)

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: text,
          current_json: designJson,
          history: buildHistory(messages),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || `HTTP ${res.status}`)
      }

      const data = await res.json()

      pushUndo(designJson)
      setDesignJson(data.updated_json)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.explanation,
      }])
    } catch (e) {
      setError(e.message)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠ ${e.message}`,
        isError: true,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [messages, designJson, loading, buildHistory, pushUndo])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const resetDesign = () => {
    setDesignJson(INITIAL_JSON)
    setUndoStack([])
    setRedoStack([])
    setMessages([{
      role: 'assistant',
      content: 'Design reset! 🔄 What would you like to change?',
    }])
  }

  const artboard = designJson?.nodes?.[designJson?.rootNodes?.[0]]


  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--bg)', overflow: 'hidden',
      fontFamily: 'var(--font-sans)',
    }}>

      {/* Chat Panel */}
      <div style={{
        width: 400, minWidth: 320, maxWidth: 460,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'relative',
      }}>


        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30,
                background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px var(--accent-glow)',
              }}>
                <span style={{ fontSize: 14 }}>✦</span>
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800,
                  letterSpacing: '-0.03em', color: 'var(--text)',
                }}>
                  Layout<span style={{ color: 'var(--accent)' }}>Agent</span>
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  AI DESIGN TRANSFORM
                </div>
              </div>
            </div>


            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={handleUndo}
                disabled={undoStack.length === 0 || loading}
                title="Undo"
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: undoStack.length > 0 ? 'var(--surface-3)' : 'transparent',
                  border: '1px solid var(--border)',
                  color: undoStack.length > 0 ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 13,
                  opacity: undoStack.length === 0 ? 0.4 : 1,
                }}
              >↩</button>
              <button
                onClick={handleRedo}
                disabled={redoStack.length === 0 || loading}
                title="Redo"
                style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: redoStack.length > 0 ? 'var(--surface-3)' : 'transparent',
                  border: '1px solid var(--border)',
                  color: redoStack.length > 0 ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: 13,
                  opacity: redoStack.length === 0 ? 0.4 : 1,
                }}
              >↪</button>
              <button
                onClick={resetDesign}
                style={{
                  padding: '0 10px', height: 28, borderRadius: 6,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontSize: 10, letterSpacing: '0.06em',
                }}
                title="Reset to original design"
              >RESET</button>
            </div>
          </div>


          <StatusBadge artboard={artboard} undoLen={undoStack.length} redoLen={redoStack.length} />
        </div>


        <div style={{
          flex: 1, overflow: 'auto',
          padding: '16px 18px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                animation: 'fadeSlideIn 0.22s ease',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  fontSize: 9, color: 'var(--accent)', marginBottom: 4,
                  letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--accent)', display: 'inline-block',
                  }} />
                  AGENT
                </div>
              )}
              <div style={{
                padding: '10px 14px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(167,139,250,0.15))'
                  : msg.isError
                    ? 'rgba(255,68,102,0.08)'
                    : 'var(--surface-2)',
                border: `1px solid ${
                  msg.role === 'user'
                    ? 'rgba(167,139,250,0.3)'
                    : msg.isError ? 'rgba(255,68,102,0.3)' : 'var(--border)'
                }`,
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                fontSize: 12.5,
                lineHeight: 1.65,
                color: msg.isError ? '#ff8888' : 'var(--text)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                fontSize: 9, color: 'var(--accent)', marginBottom: 4,
                letterSpacing: '0.1em', fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--accent)', display: 'inline-block',
                  animation: 'glowPulse 1.5s infinite',
                }} />
                AGENT
              </div>
              <div style={{
                padding: '12px 16px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '2px 12px 12px 12px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <ThinkingDots />
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  transforming layout…
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>


        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 7 }}>
            QUICK ACTIONS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s.text}
                onClick={() => sendMessage(s.text)}
                disabled={loading}
                style={{
                  fontSize: 10, padding: '4px 10px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                  borderRadius: 20,
                  letterSpacing: '0.01em',
                  opacity: loading ? 0.35 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.target.style.borderColor = 'var(--accent)'
                    e.target.style.color = 'var(--accent)'
                    e.target.style.background = 'var(--accent-dim)'
                  }
                }}
                onMouseLeave={e => {
                  e.target.style.borderColor = 'var(--border)'
                  e.target.style.color = 'var(--text-dim)'
                  e.target.style.background = 'var(--surface-2)'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>


        <div style={{
          padding: '12px 18px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--surface-2)',
            border: `1px solid ${input.trim() ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '8px 10px 8px 14px',
            transition: 'border-color 0.15s',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Describe a layout change…"
              rows={1}
              style={{
                flex: 1, resize: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: 12.5,
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
                padding: 0,
                maxHeight: 80,
                overflow: 'auto',
              }}
            />
            <button
              id="send-btn"
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, var(--accent), #7c3aed)'
                  : 'var(--border)',
                color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() && !loading ? '0 0 12px var(--accent-glow)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {loading
                ? <span style={{ fontSize: 10, animation: 'spin 1s linear infinite', display: 'block' }}>◌</span>
                : '↑'
              }
            </button>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
            Enter ↵ to send · Shift+Enter for newline
          </div>
        </div>
      </div>

      {/* Preview + JSON Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-2)' }}>


        <div style={{
          display: 'flex', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          padding: '0 20px',
          background: 'var(--surface)',
          gap: 4,
        }}>
          {[
            { id: 'canvas', label: '⬡ Wireframe' },
            { id: 'preview', label: '🖼 Preview' },
            { id: 'json',   label: '{ } JSON' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: '13px 16px',
                fontSize: 11, letterSpacing: '0.04em',
                background: 'transparent',
                color: activeTab === id ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: activeTab === id ? '2px solid var(--accent)' : '2px solid transparent',
                fontFamily: 'var(--font-sans)', fontWeight: activeTab === id ? 600 : 400,
                marginBottom: '-1px',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}

          <div style={{ flex: 1 }} />


          {undoStack.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)',
                animation: 'glowPulse 2s infinite',
              }} />
              modified
            </div>
          )}


          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(designJson, null, 2)], { type: 'application/json' })
              const url  = URL.createObjectURL(blob)
              const a    = document.createElement('a')
              a.href = url; a.download = 'layout.json'; a.click()
              URL.revokeObjectURL(url)
            }}
            style={{
              marginLeft: 8, padding: '5px 12px', borderRadius: 6,
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
              fontSize: 10, letterSpacing: '0.05em',
            }}
            onMouseEnter={e => { e.target.style.borderColor='var(--accent)'; e.target.style.color='var(--accent)' }}
            onMouseLeave={e => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text-dim)' }}
          >
            ↓ Export
          </button>
        </div>


        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {activeTab === 'canvas' && (
            <div style={{
              flex: 1, overflow: 'auto',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              padding: '28px 20px',
              background: 'radial-gradient(ellipse at center, #131320 0%, var(--bg-2) 70%)',
            }}>
              <CanvasPreview designJson={designJson} mode="wireframe" />
            </div>
          )}
          {activeTab === 'preview' && (
            <div style={{
              flex: 1, overflow: 'auto',
              display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
              padding: '28px 20px',
              background: 'radial-gradient(ellipse at center, #131320 0%, var(--bg-2) 70%)',
            }}>
              <CanvasPreview designJson={designJson} mode="preview" />
            </div>
          )}
          {activeTab === 'json' && (
            <div style={{ flex: 1, overflow: 'hidden', background: 'var(--surface)' }}>
              <JsonViewer current={designJson} previous={undoStack[undoStack.length - 1] || null} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
