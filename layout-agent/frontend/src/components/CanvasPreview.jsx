import React, { useMemo, useState } from 'react'

const TYPE_COLORS = {
  image: { bg: 'rgba(96,165,250,0.18)', border: '#60a5fa', text: '#60a5fa' },
  text:  { bg: 'rgba(167,139,250,0.18)', border: '#a78bfa', text: '#c4b5fd' },
  shape: { bg: 'rgba(68,255,170,0.18)', border: '#44ffaa', text: '#44ffaa' },
}

function getSemanticLabel(node) {
  if (node.name === 'Background.png') return 'BG'
  if (node.name === 'Product.png')    return 'Product'
  if (node.name === 'Circle')         return '◉ Badge'
  if (node.name?.startsWith('Vector'))return '★'
  if (node.type === 'text') {
    const c = node.data?.content || ''
    if (c.includes('Luxury') || c.includes('Surprisingly')) return 'Headline'
    if (c.includes('Comfort that')) return 'Subheadline'
    if (c.includes('20%') || c.includes('OFF'))  return '20% OFF'
    if (c.includes('Limited'))        return 'CTA'
    if (c.includes('8,000'))          return 'Social proof'
    const short = c.replace(/\n/g, ' ').trim()
    return short.length > 14 ? short.slice(0, 12) + '…' : short
  }
  return node.name || node.type
}


function WireNode({ node, scale, isHovered, onHover, onLeave }) {
  if (node.name === 'Background.png') return null

  const colors = TYPE_COLORS[node.type] || TYPE_COLORS.image
  const isCircle = node.data?.shapeType === 'circle'

  const left   = node.x * scale
  const top    = node.y * scale
  const width  = Math.max(node.width  * scale, 8)
  const height = Math.max(node.height * scale, 4)
  const label  = getSemanticLabel(node)

  const isThin = height < 14

  return (
    <div
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={onLeave}
      title={`${node.name}\nx: ${node.x.toFixed(1)}  y: ${node.y.toFixed(1)}\n${node.width.toFixed(1)} × ${node.height.toFixed(1)}`}
      style={{
        position: 'absolute',
        left, top, width, height,
        background: isHovered
          ? colors.bg.replace('0.18', '0.35')
          : colors.bg,
        border: `1.5px solid ${colors.border}`,
        boxShadow: isHovered ? `0 0 8px ${colors.border}66, inset 0 0 8px ${colors.border}22` : 'none',
        overflow: 'visible',
        cursor: 'default',
        transition: 'box-shadow 0.15s, background 0.15s',
        borderRadius: isCircle ? '50%' : 3,
        zIndex: isHovered ? 10 : 2,
      }}
    >
      {(width > 24) && (
        <span style={{
          position: 'absolute',
          ...(isThin
            ? { left: 0, top: height + 1 }     // below box for thin elements
            : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }  // centered
          ),
          fontSize: Math.min(9, Math.max(6, height * 0.4)),
          color: colors.text,
          fontFamily: 'var(--font-mono)',
          textAlign: 'center',
          lineHeight: 1.1,
          padding: '1px 4px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: width,
          fontWeight: 600,
          letterSpacing: '0.02em',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 2,
          backdropFilter: 'blur(2px)',
        }}>
          {label}
        </span>
      )}
    </div>
  )
}

function PreviewNode({ node, scale }) {
  if (node.name === 'Background.png') return null

  const left   = node.x * scale
  const top    = node.y * scale
  const width  = node.width  * scale
  const height = node.height * scale
  const visual = node.style?.visual || {}

  if (node.type === 'image') {
    const src = node.data?.sourceUrl
    if (!src) return null
    return (
      <img
        src={src}
        alt={node.name}
        style={{
          position: 'absolute',
          left, top, width, height,
          objectFit: node.data?.fit || 'cover',
          borderRadius: visual.borderRadius || 0,
          pointerEvents: 'none',
        }}
      />
    )
  }

  if (node.type === 'text') {
    const content = node.data?.content || ''
    const fontSize = (visual.fontSize || 16) * scale
    const rawColor = visual.color?.value || '#ffffff'
    const color = rawColor === '#FFFF' ? '#ffffff' : rawColor
    return (
      <div
        style={{
          position: 'absolute',
          left, top, width, height,
          fontSize: Math.max(6, fontSize),
          fontWeight: visual.fontWeight || 400,
          fontStyle: visual.fontStyle || 'normal',
          fontFamily: visual.fontFamily || 'Arial',
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.2,
          overflow: 'hidden',
          pointerEvents: 'none',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}
      >
        {content}
      </div>
    )
  }

  if (node.type === 'shape') {
    const fillColor = visual.fill?.value || '#f4cf1b'
    const isCircle = node.data?.shapeType === 'circle'
    return (
      <div
        style={{
          position: 'absolute',
          left, top, width, height,
          background: fillColor,
          borderRadius: isCircle ? '50%' : (visual.borderRadius || 0),
          border: visual.stroke?.value
            ? `${(visual.strokeWidth || 1) * scale}px solid ${visual.stroke.value}`
            : 'none',
          pointerEvents: 'none',
        }}
      />
    )
  }

  return null
}


function NodeTooltip({ node }) {
  if (!node) return null
  return (
    <div style={{
      position: 'absolute',
      bottom: 8, right: 8,
      background: 'rgba(8,8,20,0.94)',
      border: '1px solid var(--border-light)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 10,
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-dim)',
      lineHeight: 1.8,
      zIndex: 20,
      backdropFilter: 'blur(8px)',
      pointerEvents: 'none',
      minWidth: 140,
    }}>
      <div style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 2 }}>{node.name}</div>
      <div>x <span style={{ color: 'var(--text)' }}>{node.x.toFixed(1)}</span></div>
      <div>y <span style={{ color: 'var(--text)' }}>{node.y.toFixed(1)}</span></div>
      <div>w <span style={{ color: 'var(--text)' }}>{node.width.toFixed(1)}</span></div>
      <div>h <span style={{ color: 'var(--text)' }}>{node.height.toFixed(1)}</span></div>
      {node.style?.visual?.fontSize && (
        <div>fs <span style={{ color: '#fb923c' }}>{node.style.visual.fontSize}px</span></div>
      )}
    </div>
  )
}


export default function CanvasPreview({ designJson, mode = 'wireframe' }) {
  const [hoveredId, setHoveredId] = useState(null)

  const artboard = useMemo(() => {
    if (!designJson?.nodes) return null
    const root = designJson.rootNodes?.[0]
    return designJson.nodes[root] || null
  }, [designJson])

  const nodes = useMemo(() => {
    if (!designJson?.nodes || !artboard) return []
    // Sort: shapes first so badge circle renders behind its text
    return Object.values(designJson.nodes)
      .filter(n => n.type !== 'artboard')
      .sort((a, b) => {
        const order = { image: 0, shape: 1, text: 2 }
        return (order[a.type] ?? 3) - (order[b.type] ?? 3)
      })
  }, [designJson, artboard])

  const hoveredNode = nodes.find(n => n.id === hoveredId) || null

  if (!artboard) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: 200, color: 'var(--text-muted)', fontSize: 12,
    }}>
      No artboard found
    </div>
  )

  const MAX_W = 360
  const scale  = MAX_W / artboard.width
  const PW     = Math.round(artboard.width  * scale)
  const PH     = Math.round(artboard.height * scale)

  const aspectLabel = (() => {
    const r = artboard.width / artboard.height
    if (Math.abs(r - 1)    < 0.02) return '1:1'
    if (Math.abs(r - 9/16) < 0.02) return '9:16'
    if (Math.abs(r - 4/5)  < 0.02) return '4:5'
    if (Math.abs(r - 16/9) < 0.02) return '16:9'
    return `${(artboard.width/artboard.height).toFixed(2)}:1`
  })()


  const layerCount = nodes.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>


      <div style={{
        display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)',
        width: PW,
      }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{artboard.name}</span>
        <span>{artboard.width} × {artboard.height}px</span>
        <span style={{
          background: 'var(--accent-dim)', color: 'var(--accent)',
          padding: '1px 8px', borderRadius: 3,
          border: '1px solid rgba(167,139,250,0.25)',
          fontWeight: 700,
        }}>{aspectLabel}</span>
        <span>{layerCount} layers</span>
        <span style={{
          marginLeft: 'auto',
          background: 'var(--surface-3)', padding: '1px 7px',
          borderRadius: 3, border: '1px solid var(--border)',
          color: 'var(--text-dim)',
        }}>
          {mode.toUpperCase()}
        </span>
      </div>


      <div
        style={{
          position: 'relative',
          width: PW, height: PH,
          background: '#0e1218',
          border: '1px solid var(--border-light)',
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}
      >

        {designJson.imageUrl && (
          <img
            src={designJson.imageUrl}
            alt="design background"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: mode === 'preview' ? 1 : 0.06,   // nearly invisible in wireframe
            }}
          />
        )}

        {/* Scrim overlay for wireframe legibility */}
        {mode === 'wireframe' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(6,6,18,0.85)',
            pointerEvents: 'none',
            zIndex: 1,
          }} />
        )}


        <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
          {nodes.map(node =>
            mode === 'wireframe'
              ? <WireNode
                  key={node.id}
                  node={node}
                  scale={scale}
                  isHovered={hoveredId === node.id}
                  onHover={setHoveredId}
                  onLeave={() => setHoveredId(null)}
                />
              : <PreviewNode key={node.id} node={node} scale={scale} />
          )}
        </div>

        {/* Tooltip */}
        {mode === 'wireframe' && hoveredNode && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
            <NodeTooltip node={hoveredNode} />
          </div>
        )}

        {/* Dot grid */}
        {mode === 'wireframe' && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: `${Math.round(40 * scale)}px ${Math.round(40 * scale)}px`,
            pointerEvents: 'none',
            zIndex: 3,
          }} />
        )}
      </div>


      {mode === 'wireframe' && (
        <div style={{
          display: 'flex', gap: 16, width: PW,
          padding: '7px 12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          alignItems: 'center',
        }}>
          {Object.entries(TYPE_COLORS).map(([type, c]) => (
            <span key={type} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: c.text, fontFamily: 'var(--font-mono)',
            }}>
              <span style={{
                width: 9, height: 9,
                background: c.bg,
                border: `1.5px solid ${c.border}`,
                borderRadius: type === 'shape' ? '50%' : 2,
                display: 'inline-block', flexShrink: 0,
              }} />
              {type}
            </span>
          ))}
          <span style={{
            marginLeft: 'auto', fontSize: 9,
            color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
          }}>
            hover for coords
          </span>
        </div>
      )}
    </div>
  )
}
