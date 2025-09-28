import React, { useEffect, useRef, useState } from 'react'
import '../rete.css'
import { createAppEditor, createNodeByKind, clientToWorld } from '../rete/app-editor'

export default function ReteCanvas() {
  const containerRef = useRef(null)
  const editorRef = useRef(null)
  const areaRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false
    ;(async () => {
      const { editor, area, destroy } = await createAppEditor(containerRef.current)
      if (destroyed) return
      editorRef.current = editor
      areaRef.current = area
      setReady(true)

      return () => {
        destroy()
      }
    })()

    return () => {
      destroyed = true
      if (areaRef.current) {
        areaRef.current.destroy()
      }
    }
  }, [])

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    if (!editorRef.current || !areaRef.current || !containerRef.current) return
    const kind = e.dataTransfer.getData('application/x-rete-node')
    if (!kind) return
  const world = clientToWorld(areaRef.current, containerRef.current, e.clientX, e.clientY, e)
  const node = createNodeByKind(kind)
  await editorRef.current.addNode(node)
  await areaRef.current.nodeViews.get(node.id)?.translate(world.x, world.y)
  }

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b7280' }}>
          <span>캔버스 초기화 중…</span>
        </div>
      )}
    </div>
  )
}
