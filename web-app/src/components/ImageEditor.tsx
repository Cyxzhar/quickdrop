import { useState, useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Arrow, Text, Rect, Circle, Transformer, Group, Line as KonvaLine } from 'react-konva'

interface ImageEditorProps {
  imageUrl: string
  onSave: (dataUrl: string) => void
  onCancel: () => void
}

type Tool = 'select' | 'arrow' | 'text' | 'blur' | 'rectangle' | 'circle' | 'pen' | 'highlighter' | 'eraser'

interface Annotation {
  id: string
  type: Tool
  x: number
  y: number
  width?: number
  height?: number
  points?: number[]
  text?: string
  color?: string
  fontSize?: number
  strokeWidth?: number
  radius?: number
}

export function ImageEditor({ imageUrl, onSave, onCancel }: ImageEditorProps) {
  const [tool, setTool] = useState<Tool>('select')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string | null>(null)
  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [blurredImage, setBlurredImage] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const textInputRef = useRef<HTMLInputElement>(null)
  const justCreatedTextRef = useRef<boolean>(false)

  // Tool settings
  const [currentColor, setCurrentColor] = useState<string>('#ef4444')
  const [currentFontSize, setCurrentFontSize] = useState<number>(24)
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState<number>(3)

  // Load image
  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      setImage(img)
      createBlurredImage(img)
    }
    return () => {
      img.onload = null
    }
  }, [imageUrl])

  // Create pixelated/blurred version of image
  const createBlurredImage = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!

    ctx.drawImage(img, 0, 0)

    // Apply pixelation effect
    const pixelSize = 12
    ctx.imageSmoothingEnabled = false

    for (let y = 0; y < canvas.height; y += pixelSize) {
      for (let x = 0; x < canvas.width; x += pixelSize) {
        const pixelData = ctx.getImageData(x, y, 1, 1).data
        ctx.fillStyle = `rgb(${pixelData[0]},${pixelData[1]},${pixelData[2]})`
        ctx.fillRect(x, y, pixelSize, pixelSize)
      }
    }

    const blurred = new window.Image()
    blurred.src = canvas.toDataURL()
    blurred.onload = () => setBlurredImage(blurred)
  }

  useEffect(() => {
    if (image) {
      const maxWidth = window.innerWidth - 100
      const maxHeight = window.innerHeight - 250
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
      setStageSize({
        width: image.width * scale,
        height: image.height * scale
      })
    }
  }, [image])

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = stageRef.current
      const selectedNode = stage.findOne(`#${selectedId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer().batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [selectedId])

  const handleMouseDown = (e: any) => {
    console.log('[Editor] handleMouseDown, tool:', tool, 'target:', e.target.constructor.name)

    // Deselect when clicking on stage (but allow text tool to work on empty stage)
    if (e.target === e.target.getStage() && tool !== 'text') {
      setSelectedId(null)
      return
    }

    if (tool === 'select' || tool === 'eraser') return

    const pos = e.target.getStage().getPointerPosition()
    const id = `${tool}-${Date.now()}`

    if (tool === 'arrow') {
      setCurrentAnnotation({
        id,
        type: 'arrow',
        x: pos.x,
        y: pos.y,
        points: [pos.x, pos.y, pos.x, pos.y],
        color: currentColor,
        strokeWidth: currentStrokeWidth
      })
      setIsDrawing(true)
    } else if (tool === 'pen') {
      setCurrentAnnotation({
        id,
        type: 'pen',
        x: 0,
        y: 0,
        points: [pos.x, pos.y],
        color: currentColor,
        strokeWidth: currentStrokeWidth
      })
      setIsDrawing(true)
    } else if (tool === 'blur') {
      setCurrentAnnotation({
        id,
        type: 'blur',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0
      })
      setIsDrawing(true)
    } else if (tool === 'rectangle') {
      setCurrentAnnotation({
        id,
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth
      })
      setIsDrawing(true)
    } else if (tool === 'circle') {
      setCurrentAnnotation({
        id,
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        color: currentColor,
        strokeWidth: currentStrokeWidth
      })
      setIsDrawing(true)
    } else if (tool === 'highlighter') {
      setCurrentAnnotation({
        id,
        type: 'highlighter',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        color: currentColor
      })
      setIsDrawing(true)
    } else if (tool === 'text') {
      // Create text annotation immediately
      console.log('[Editor] Creating text annotation at', pos.x, pos.y)
      const textAnnotation: Annotation = {
        id,
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: '',
        color: currentColor,
        fontSize: currentFontSize
      }
      console.log('[Editor] Text annotation created:', textAnnotation)
      setAnnotations([...annotations, textAnnotation])
      console.log('[Editor] Setting editingText to:', id)
      justCreatedTextRef.current = true
      setEditingText(id)
      // Auto-focus will happen via useEffect
    }
  }

  // Auto-focus text input when editing starts
  useEffect(() => {
    console.log('[Editor] useEffect triggered, editingText:', editingText)
    if (editingText) {
      console.log('[Editor] editingText is truthy, setting up focus timer')
      // Use setTimeout to ensure DOM has fully updated
      const focusTimer = setTimeout(() => {
        console.log('[Editor] Focus timer fired, checking ref...')
        if (textInputRef.current) {
          textInputRef.current.focus()
          textInputRef.current.select()
          console.log('[Editor] Text input focused successfully')

          // After a short delay, allow blur to close the input
          setTimeout(() => {
            justCreatedTextRef.current = false
            console.log('[Editor] Text input ready for blur events')
          }, 300)
        } else {
          console.warn('[Editor] Text input ref not available')
        }
      }, 100) // Increased delay

      return () => clearTimeout(focusTimer)
    }
  }, [editingText])

  const handleMouseMove = (e: any) => {
    if (!isDrawing || !currentAnnotation) return

    const pos = e.target.getStage().getPointerPosition()

    if (currentAnnotation.type === 'arrow') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [currentAnnotation.x, currentAnnotation.y, pos.x, pos.y]
      })
    } else if (currentAnnotation.type === 'pen') {
      // Add point to the freehand line
      const newPoints = [...(currentAnnotation.points || []), pos.x, pos.y]
      setCurrentAnnotation({
        ...currentAnnotation,
        points: newPoints
      })
    } else if (currentAnnotation.type === 'blur' || currentAnnotation.type === 'rectangle' || currentAnnotation.type === 'highlighter') {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: pos.x - currentAnnotation.x,
        height: pos.y - currentAnnotation.y
      })
    } else if (currentAnnotation.type === 'circle') {
      const dx = pos.x - currentAnnotation.x
      const dy = pos.y - currentAnnotation.y
      const radius = Math.sqrt(dx * dx + dy * dy)
      setCurrentAnnotation({
        ...currentAnnotation,
        radius
      })
    }
  }

  const handleMouseUp = () => {
    if (currentAnnotation && isDrawing) {
      // Only add if it has size
      if (currentAnnotation.type === 'arrow' && currentAnnotation.points) {
        const [x1, y1, x2, y2] = currentAnnotation.points
        if (Math.abs(x2 - x1) > 5 || Math.abs(y2 - y1) > 5) {
          setAnnotations([...annotations, currentAnnotation])
        }
      } else if (currentAnnotation.type === 'pen' && currentAnnotation.points) {
        // Only add pen if it has multiple points
        if (currentAnnotation.points.length >= 4) {
          setAnnotations([...annotations, currentAnnotation])
        }
      } else if (currentAnnotation.type === 'blur' || currentAnnotation.type === 'rectangle' || currentAnnotation.type === 'highlighter') {
        if (Math.abs(currentAnnotation.width || 0) > 10 && Math.abs(currentAnnotation.height || 0) > 10) {
          setAnnotations([...annotations, currentAnnotation])
        }
      } else if (currentAnnotation.type === 'circle') {
        if ((currentAnnotation.radius || 0) > 10) {
          setAnnotations([...annotations, currentAnnotation])
        }
      }
      setCurrentAnnotation(null)
    }
    setIsDrawing(false)
  }

  const handleAnnotationClick = (id: string) => {
    if (tool === 'select') {
      setSelectedId(id)
    } else if (tool === 'eraser') {
      // Eraser: delete on click
      setAnnotations(annotations.filter(ann => ann.id !== id))
      if (selectedId === id) setSelectedId(null)
    }
  }

  const handleAnnotationDblClick = (annotation: Annotation) => {
    if (annotation.type === 'text') {
      setEditingText(annotation.id)
      setSelectedId(null)
    }
  }

  const handleTextEdit = (id: string, newText: string) => {
    setAnnotations(annotations.map(ann =>
      ann.id === id ? { ...ann, text: newText } : ann
    ))
  }

  const handleTextEditComplete = () => {
    // Prevent blur from closing text input immediately after creation
    if (justCreatedTextRef.current) {
      console.log('[Editor] Ignoring blur - text just created')
      justCreatedTextRef.current = false
      return
    }

    console.log('[Editor] Text edit complete, cleaning up')
    // Remove empty text annotations
    if (editingText) {
      const textAnn = annotations.find(a => a.id === editingText)
      if (!textAnn?.text || textAnn.text.trim() === '') {
        setAnnotations(annotations.filter(a => a.id !== editingText))
      }
    }
    setEditingText(null)
  }

  const handleDelete = () => {
    if (selectedId) {
      setAnnotations(annotations.filter(ann => ann.id !== selectedId))
      setSelectedId(null)
    }
  }

  const handleUndo = () => {
    if (annotations.length > 0) {
      setAnnotations(annotations.slice(0, -1))
      setSelectedId(null)
    }
  }

  const handleClear = () => {
    if (confirm('Clear all annotations?')) {
      setAnnotations([])
      setSelectedId(null)
    }
  }

  const handleSave = () => {
    if (stageRef.current) {
      setSelectedId(null)
      setEditingText(null)
      setTimeout(() => {
        const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 })
        onSave(dataUrl)
      }, 100)
    }
  }

  const renderAnnotation = (annotation: Annotation, isEditing: boolean = false) => {
    const isErasing = tool === 'eraser'

    if (annotation.type === 'arrow' && annotation.points) {
      return (
        <Arrow
          key={annotation.id}
          id={annotation.id}
          points={annotation.points}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth || 3}
          fill={annotation.color}
          pointerLength={12}
          pointerWidth={12}
          onClick={() => handleAnnotationClick(annotation.id)}
          draggable={tool === 'select'}
          opacity={isErasing ? 0.6 : 1}
        />
      )
    }

    if (annotation.type === 'pen' && annotation.points) {
      return (
        <KonvaLine
          key={annotation.id}
          id={annotation.id}
          points={annotation.points}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth || 3}
          lineCap="round"
          lineJoin="round"
          onClick={() => handleAnnotationClick(annotation.id)}
          draggable={tool === 'select'}
          opacity={isErasing ? 0.6 : 1}
        />
      )
    }

    if (annotation.type === 'rectangle') {
      return (
        <Rect
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth || 3}
          onClick={() => handleAnnotationClick(annotation.id)}
          draggable={tool === 'select'}
          opacity={isErasing ? 0.6 : 1}
        />
      )
    }

    if (annotation.type === 'highlighter') {
      return (
        <Rect
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          fill={annotation.color}
          opacity={isErasing ? 0.2 : 0.35}
          onClick={() => handleAnnotationClick(annotation.id)}
          draggable={tool === 'select'}
        />
      )
    }

    if (annotation.type === 'circle') {
      return (
        <Circle
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          radius={annotation.radius || 0}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth || 3}
          onClick={() => handleAnnotationClick(annotation.id)}
          draggable={tool === 'select'}
          opacity={isErasing ? 0.6 : 1}
        />
      )
    }

    if (annotation.type === 'blur' && blurredImage) {
      return (
        <Group
          key={annotation.id}
          id={annotation.id}
          onClick={() => handleAnnotationClick(annotation.id)}
          draggable={tool === 'select'}
          opacity={isErasing ? 0.5 : 1}
        >
          <KonvaImage
            image={blurredImage}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            crop={{
              x: annotation.x * (blurredImage.width / stageSize.width),
              y: annotation.y * (blurredImage.height / stageSize.height),
              width: (annotation.width || 0) * (blurredImage.width / stageSize.width),
              height: (annotation.height || 0) * (blurredImage.height / stageSize.height)
            }}
          />
          <Rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            stroke="#ef4444"
            strokeWidth={isErasing ? 3 : 2}
            dash={[5, 5]}
          />
        </Group>
      )
    }

    if (annotation.type === 'text') {
      return (
        <Text
          key={annotation.id}
          id={annotation.id}
          x={annotation.x}
          y={annotation.y}
          text={annotation.text || ''}
          fontSize={annotation.fontSize || 24}
          fontFamily="Inter, sans-serif"
          fill={annotation.color}
          fontStyle="bold"
          onClick={() => handleAnnotationClick(annotation.id)}
          onDblClick={() => handleAnnotationDblClick(annotation)}
          draggable={tool === 'select'}
          shadowColor={isEditing ? '#fbbf24' : (isErasing ? '#ef4444' : undefined)}
          shadowBlur={isEditing ? 10 : (isErasing ? 8 : undefined)}
          opacity={isErasing ? 0.7 : 1}
        />
      )
    }

    return null
  }

  const colorOptions = [
    { value: '#ef4444', label: 'Red' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#eab308', label: 'Yellow' },
    { value: '#22c55e', label: 'Green' },
    { value: '#3b82f6', label: 'Blue' },
    { value: '#6366f1', label: 'Indigo' },
    { value: '#a855f7', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
    { value: '#ffffff', label: 'White' },
    { value: '#000000', label: 'Black' }
  ]

  return (
    <div className="editor-modal">
      <div className="editor-overlay" onClick={onCancel} />
      <div className="editor-container">
        <div className="editor-toolbar">
          <div className="toolbar-section">
            <span className="toolbar-label">Tools</span>
            <div className="toolbar-group">
              <button
                className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
                onClick={() => setTool('select')}
                title="Select & Move"
              >
                <i className="ph-bold ph-cursor"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'arrow' ? 'active' : ''}`}
                onClick={() => setTool('arrow')}
                title="Arrow"
              >
                <i className="ph-bold ph-arrow-up-right"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
                onClick={() => setTool('pen')}
                title="Pen (Freehand)"
              >
                <i className="ph-bold ph-pen"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'text' ? 'active' : ''}`}
                onClick={() => {
                  console.log('[Editor] Text tool button clicked')
                  setTool('text')
                }}
                title="Text"
              >
                <i className="ph-bold ph-text-t"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'rectangle' ? 'active' : ''}`}
                onClick={() => setTool('rectangle')}
                title="Rectangle"
              >
                <i className="ph-bold ph-rectangle"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'circle' ? 'active' : ''}`}
                onClick={() => setTool('circle')}
                title="Circle"
              >
                <i className="ph-bold ph-circle"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'highlighter' ? 'active' : ''}`}
                onClick={() => setTool('highlighter')}
                title="Highlighter (Emphasize Area)"
              >
                <i className="ph-bold ph-highlighter-circle"></i>
              </button>
              <button
                className={`tool-btn ${tool === 'blur' ? 'active' : ''}`}
                onClick={() => setTool('blur')}
                title="Blur"
              >
                <i className="ph-bold ph-eye-slash"></i>
              </button>
              <button
                className={`tool-btn tool-btn-danger ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
                title="Eraser"
              >
                <i className="ph-bold ph-eraser"></i>
              </button>
            </div>
          </div>

          {(tool === 'text' || tool === 'arrow' || tool === 'pen' || tool === 'rectangle' || tool === 'circle' || tool === 'highlighter') && (
            <>
              <div className="toolbar-divider"></div>
              <div className="toolbar-section">
                <span className="toolbar-label">Color</span>
                <div className="color-picker">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      className={`color-option ${currentColor === color.value ? 'active' : ''}`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setCurrentColor(color.value)}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {tool === 'text' && (
            <>
              <div className="toolbar-divider"></div>
              <div className="toolbar-section">
                <span className="toolbar-label">Size</span>
                <select
                  className="size-select"
                  value={currentFontSize}
                  onChange={(e) => setCurrentFontSize(Number(e.target.value))}
                >
                  <option value={16}>Small</option>
                  <option value={24}>Medium</option>
                  <option value={32}>Large</option>
                  <option value={48}>XLarge</option>
                </select>
              </div>
            </>
          )}

          {(tool === 'arrow' || tool === 'pen' || tool === 'rectangle' || tool === 'circle') && (
            <>
              <div className="toolbar-divider"></div>
              <div className="toolbar-section">
                <span className="toolbar-label">Width</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentStrokeWidth}
                  onChange={(e) => setCurrentStrokeWidth(Number(e.target.value))}
                  className="stroke-slider"
                />
                <span className="stroke-value">{currentStrokeWidth}px</span>
              </div>
            </>
          )}

          <div className="toolbar-divider"></div>
          <div className="toolbar-section">
            <div className="toolbar-group">
              <button
                className="tool-btn"
                onClick={handleDelete}
                disabled={!selectedId}
                title="Delete"
              >
                <i className="ph-bold ph-trash"></i>
              </button>
              <button
                className="tool-btn"
                onClick={handleUndo}
                disabled={annotations.length === 0}
                title="Undo"
              >
                <i className="ph-bold ph-arrow-counter-clockwise"></i>
              </button>
              <button
                className="tool-btn"
                onClick={handleClear}
                disabled={annotations.length === 0}
                title="Clear All"
              >
                <i className="ph-bold ph-broom"></i>
              </button>
            </div>
          </div>

          <div className="toolbar-spacer"></div>

          <div className="toolbar-section">
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <i className="ph-bold ph-check"></i>
              Save
            </button>
          </div>
        </div>

        <div className="editor-canvas" style={{ position: 'relative' }}>
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              cursor: tool === 'eraser' ? 'not-allowed' :
                      tool === 'select' ? 'move' :
                      tool === 'pen' ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\'><circle cx=\'10\' cy=\'10\' r=\'2\' fill=\'%23ef4444\'/></svg>") 10 10, crosshair' :
                      'crosshair'
            }}
          >
            <Layer>
              {image && (
                <KonvaImage
                  image={image}
                  width={stageSize.width}
                  height={stageSize.height}
                />
              )}
              {annotations.map(ann => renderAnnotation(ann, ann.id === editingText))}
              {currentAnnotation && renderAnnotation(currentAnnotation)}
              {tool === 'select' && <Transformer ref={transformerRef} />}
            </Layer>
          </Stage>

          {/* Text editing input */}
          {editingText && (() => {
            console.log('[Editor] Rendering text input, editingText:', editingText)
            const annotation = annotations.find(a => a.id === editingText)
            console.log('[Editor] Found annotation:', annotation)

            if (!annotation || annotation.type !== 'text') {
              console.log('[Editor] No annotation found or wrong type, returning null')
              return null
            }

            console.log('[Editor] Rendering input element at', annotation.x, annotation.y)
            return (
              <input
                ref={textInputRef}
                type="text"
                autoFocus
                placeholder="Type here..."
                value={annotation.text || ''}
                onChange={(e) => {
                  console.log('[Editor] onChange triggered:', e.target.value)
                  handleTextEdit(editingText, e.target.value)
                }}
                onBlur={handleTextEditComplete}
                onKeyDown={(e) => {
                  console.log('[Editor] Key pressed:', e.key)
                  if (e.key === 'Enter') {
                    handleTextEditComplete()
                  } else if (e.key === 'Escape') {
                    handleTextEditComplete()
                  }
                }}
                style={{
                  position: 'absolute',
                  top: `${annotation.y + 24}px`,
                  left: `${annotation.x + 24}px`,
                  zIndex: 9999,
                  fontSize: `${annotation.fontSize || 24}px`,
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 'bold',
                  color: annotation.color,
                  background: 'white',
                  border: '3px solid #6366f1',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  outline: 'none',
                  minWidth: '250px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}
              />
            )
          })()}
        </div>

        {/* Status bar */}
        <div className="editor-status">
          <div className="status-left">
            <span className="status-item">
              <strong>Tool:</strong> {tool.charAt(0).toUpperCase() + tool.slice(1)}
            </span>
            {annotations.length > 0 && (
              <span className="status-item">
                <strong>Annotations:</strong> {annotations.length}
              </span>
            )}
          </div>
          <div className="status-right">
            <span className="status-hint">
              {tool === 'text' && 'Click to add text, type immediately'}
              {tool === 'eraser' && 'Click any annotation to delete'}
              {tool === 'select' && 'Click to select, drag to move'}
              {(tool === 'arrow' || tool === 'rectangle' || tool === 'circle') && 'Click and drag'}
              {tool === 'pen' && 'Draw freehand - click and drag'}
              {tool === 'highlighter' && 'Drag to emphasize area'}
              {tool === 'blur' && 'Drag to hide sensitive info'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
