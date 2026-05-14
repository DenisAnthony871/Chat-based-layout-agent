import React, { useMemo, useState } from 'react'


function flattenJson(obj, prefix = '') {
  const result = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenJson(v, key))
    } else {
      result[key] = JSON.stringify(v)
    }
  }
  return result
}


function colorToken(token) {
  if (token === 'null' || token === 'true' || token === 'false')
    return '#fb923c'  // orange — keywords
  if (/^"/.test(token))
    return '#86efac'  // green — strings
  if (/^-?\d/.test(token))
    return '#60a5fa'  // blue — numbers
  if (token === '{' || token === '}' || token === '[' || token === ']' || token === ',')
    return '#5a5a7a'  // muted — punctuation
  if (token === ':')
    return '#5a5a7a'
  return '#e8e8f0'
}

function HighlightedJson({ json, changedPaths }) {
  const lines = JSON.stringify(json, null, 2).split('\n')

  return lines.map((line, i) => {
    const keyMatch  = line.match(/^\s+"([^"]+)"\s*:/)
    const key       = keyMatch ? keyMatch[1] : null
    const isChanged = key && Array.from(changedPaths).some(p => p.endsWith(`.${key}`) || p === key)

    const tokens = line.match(/"(?:[^"\\]|\\.)*"|[{}[\],:]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\s+|[^"{}[\],:trufalnse\s-]+/g) || [line]

    return (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderLeft: isChanged ? '2px solid var(--accent)' : '2px solid transparent',
          background: isChanged ? 'rgba(167,139,250,0.06)' : 'transparent',
          paddingLeft: 10,
          marginLeft: -2,
        }}
      >

        <span style={{
          userSelect: 'none',
          color: 'var(--text-muted)',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          width: 32, flexShrink: 0,
          paddingRight: 8,
          textAlign: 'right',
          lineHeight: 1.7,
          opacity: 0.5,
        }}>
          {i + 1}
        </span>


        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          lineHeight: 1.7,
          color: isChanged ? 'var(--accent)' : undefined,
          flex: 1,
        }}>
          {isChanged
            ? line
            : tokens.map((tok, j) => (
                <span key={j} style={{ color: colorToken(tok.trim()) || '#e8e8f0' }}>
                  {tok}
                </span>
              ))
          }
          {'\n'}
        </span>
      </div>
    )
  })
}


export default function JsonViewer({ current, previous }) {
  const [search, setSearch] = useState('')

  const changedPaths = useMemo(() => {
    if (!previous) return new Set()
    const flat1 = flattenJson(previous)
    const flat2 = flattenJson(current)
    const changed = new Set()
    for (const k of Object.keys(flat2)) {
      if (flat1[k] !== flat2[k]) changed.add(k)
    }
    return changed
  }, [current, previous])


  const nodeCount = Object.keys(current?.nodes || {}).filter(k => {
    return current.nodes[k]?.type !== 'artboard'
  }).length

  const artboard = useMemo(() => {
    const root = current?.rootNodes?.[0]
    return root ? current?.nodes?.[root] : null
  }, [current])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>

        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
          {changedPaths.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent-dim)', border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: 4, padding: '3px 9px',
              fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              {changedPaths.size} field{changedPaths.size !== 1 ? 's' : ''} changed
            </div>
          )}
          {artboard && (
            <div style={{
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '3px 9px',
              fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            }}>
              {artboard.width}×{artboard.height} · {nodeCount} nodes
            </div>
          )}
        </div>


        <input
          type="text"
          placeholder="search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 4, padding: '4px 9px',
            fontSize: 11, color: 'var(--text)',
            width: 130,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e  => e.target.style.borderColor = 'var(--border)'}
        />
      </div>


      <div style={{ flex: 1, overflow: 'auto', padding: '10px 6px' }}>
        <pre style={{
          margin: 0, padding: 0,
          fontSize: 11.5, lineHeight: 1.7,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-dim)',
          whiteSpace: 'pre',
          wordBreak: 'normal',
        }}>
          <HighlightedJson json={current} changedPaths={changedPaths} />
        </pre>
      </div>
    </div>
  )
}
