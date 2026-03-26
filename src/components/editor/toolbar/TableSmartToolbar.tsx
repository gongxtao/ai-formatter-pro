import React, { useEffect, useState, useRef, useCallback } from 'react'
import SmartContextMenu from './SmartContextMenu'
import { TableHandler } from '../utils/table'

interface TableSmartToolbarProps {
  iframeRef: React.RefObject<HTMLIFrameElement>
  activeTable: HTMLTableElement | null
  onAction: (action: string, payload?: unknown) => void
  readonly?: boolean
}

interface TableMetrics {
  rows: { height: number; top: number; element: HTMLTableRowElement }[]
  cols: { width: number; left: number }[]
  tableTop: number
  tableLeft: number
  tableWidth: number
  tableHeight: number
}

const TableSmartToolbar: React.FC<TableSmartToolbarProps> = ({
  iframeRef,
  activeTable,
  onAction,
  readonly = false
}) => {
  const [metrics, setMetrics] = useState<TableMetrics | null>(null)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)
  const [selection, setSelection] = useState<{ startRow: number, startCol: number, endRow: number, endCol: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [resizeHint, setResizeHint] = useState<{ type: 'row' | 'col', index: number, pos: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: 'row' | 'col' | 'cell' | 'selection'
    index?: number
    rowIndex?: number
    colIndex?: number
  } | null>(null)
  const resizeStateRef = useRef<{ type: 'row' | 'col', index: number, startPos: number, startSize: number, lastSize: number } | null>(null)
  const dragSelectionRef = useRef<{
    startRow: number
    startCol: number
    startX: number
    startY: number
    started: boolean
  } | null>(null)

  const updateMetrics = useCallback(() => {
    if (!activeTable || !iframeRef.current) return
    const iframe = iframeRef.current
    const doc = iframe.contentDocument
    if (!doc) return

    const tableRect = activeTable.getBoundingClientRect()
    
    const rows: TableMetrics['rows'] = []
    const cols: TableMetrics['cols'] = []

    Array.from(activeTable.rows).forEach(row => {
      const rect = row.getBoundingClientRect()
      rows.push({
        height: rect.height,
        top: rect.top,
        element: row
      })
    })

    const handler = new TableHandler(activeTable)
    handler.getColumnMetrics().forEach(col => {
      cols.push(col)
    })

    setMetrics({
      rows,
      cols,
      tableTop: tableRect.top,
      tableLeft: tableRect.left,
      tableWidth: tableRect.width,
      tableHeight: tableRect.height
    })
  }, [activeTable, iframeRef])

  useEffect(() => {
    if (!activeTable) {
      return
    }

    window.requestAnimationFrame(() => {
      updateMetrics()
    })
    
    const iframe = iframeRef.current
    const win = iframe?.contentWindow
    const handleWindowScroll = () => setContextMenu(null)

    if (win) {
        win.addEventListener('scroll', updateMetrics)
        win.addEventListener('resize', updateMetrics)
        win.addEventListener('scroll', handleWindowScroll)
    }
    
    const observer = new MutationObserver(updateMetrics)
    observer.observe(activeTable, { 
        subtree: true, 
        childList: true, 
        attributes: true,
        attributeFilter: ['style', 'class', 'width', 'height']
    })

    return () => {
        if (win) {
            win.removeEventListener('scroll', updateMetrics)
            win.removeEventListener('resize', updateMetrics)
            win.removeEventListener('scroll', handleWindowScroll)
        }
        observer.disconnect()
    }
  }, [activeTable, iframeRef, updateMetrics])

  const getResizeHint = useCallback((clientX: number, clientY: number) => {
    if (!metrics) return null
    const threshold = 4
    const tableRight = metrics.tableLeft + metrics.tableWidth
    const tableBottom = metrics.tableTop + metrics.tableHeight
    const withinX = clientX >= metrics.tableLeft - threshold && clientX <= tableRight + threshold
    const withinY = clientY >= metrics.tableTop - threshold && clientY <= tableBottom + threshold
    if (!withinX || !withinY) return null

    let best: { type: 'row' | 'col', index: number, pos: number, distance: number } | null = null

    if (clientX >= metrics.tableLeft && clientX <= tableRight) {
      if (metrics.rows.length > 0) {
        const firstTop = metrics.rows[0].top
        const distTop = Math.abs(clientY - firstTop)
        if (distTop <= threshold) {
          best = { type: 'row', index: 0, pos: firstTop, distance: distTop }
        }
        metrics.rows.forEach((row, index) => {
          const pos = row.top + row.height
          const dist = Math.abs(clientY - pos)
          if (dist <= threshold && (!best || dist < best.distance)) {
            best = { type: 'row', index, pos, distance: dist }
          }
        })
      }
    }

    if (clientY >= metrics.tableTop && clientY <= tableBottom) {
      if (metrics.cols.length > 0) {
        const firstLeft = metrics.cols[0].left
        const distLeft = Math.abs(clientX - firstLeft)
        if (distLeft <= threshold && (!best || distLeft < best.distance)) {
          best = { type: 'col', index: 0, pos: firstLeft, distance: distLeft }
        }
        metrics.cols.forEach((col, index) => {
          const pos = col.left + col.width
          const dist = Math.abs(clientX - pos)
          if (dist <= threshold && (!best || dist < best.distance)) {
            best = { type: 'col', index, pos, distance: dist }
          }
        })
      }
    }

    if (!best) return null
    return { type: best.type, index: best.index, pos: best.pos }
  }, [metrics])

  const applyResize = useCallback((type: 'row' | 'col', index: number, size: number) => {
    if (!activeTable) return
    const handler = new TableHandler(activeTable)
    if (type === 'row') {
      handler.setRowHeight(index, size)
    } else {
      handler.setColumnWidth(index, size)
    }
  }, [activeTable])

  // Handle events from iframe
  useEffect(() => {
      const iframe = iframeRef.current
      const doc = iframe?.contentDocument
      if (!doc || readonly || !metrics || !activeTable) return
      const clearDocSelection = () => {
        const selection = doc.getSelection()
        if (selection && selection.rangeCount > 0) {
          selection.removeAllRanges()
        }
      }

      const onMouseDown = (e: MouseEvent) => {
          setContextMenu(null) // Close menu on any interaction
          
          // If not left click, ignore
          if (e.button !== 0) return

          if (resizeHint) {
            dragSelectionRef.current = null
            const startPos = resizeHint.type === 'row' ? e.clientY : e.clientX
            const startSize = resizeHint.type === 'row'
              ? metrics.rows[resizeHint.index]?.height || 0
              : metrics.cols[resizeHint.index]?.width || 0
            resizeStateRef.current = {
              type: resizeHint.type,
              index: resizeHint.index,
              startPos,
              startSize,
              lastSize: startSize
            }
            setIsResizing(true)
            setIsSelecting(false)
            e.preventDefault()
            return
          }

          // Check if clicked inside table?
          const target = e.target as HTMLElement
          const cell = target.closest('td, th')
          if (!cell) {
             // Click outside table cells
             setSelection(null)
             dragSelectionRef.current = null
             return
          }
          
          // Find row/col index from cell directly is more reliable than coords
          const table = target.closest('table')
          if (table !== activeTable) return

          const tr = cell.closest('tr') as HTMLTableRowElement
          if (!tr) return
          // const r = tr.rowIndex // This might be absolute index in table
          // We need index in metrics.rows which matches table.rows
          // So tr.rowIndex is correct if metrics.rows is derived from table.rows
          
          // However, for safety and to match the visual grid (which might differ with complex rowspans?)
          // Let's stick to the visual coordinate check which handles the "visual" selection better
          // But wait, the visual check failed before? 
          // The previous issue was "click passing through".
          // Now we are listening on DOCUMENT.
          // Using coordinates is robust against structure but sensitive to scrolling.
          // e.clientX in iframe is relative to viewport. metrics.top is relative to viewport.
          // So the coordinate check is correct.
          
          const handler = new TableHandler(activeTable)
          const bounds = handler.getCellBounds(cell as HTMLTableCellElement)
          if (bounds) {
            const isGridSelectionMode = e.shiftKey
            dragSelectionRef.current = {
              startRow: bounds.startRow,
              startCol: bounds.startCol,
              startX: e.clientX,
              startY: e.clientY,
              started: isGridSelectionMode
            }
            setIsSelecting(isGridSelectionMode)
            setSelection({
              startRow: bounds.startRow,
              startCol: bounds.startCol,
              endRow: bounds.endRow,
              endCol: bounds.endCol
            })
            if (isGridSelectionMode) {
              clearDocSelection()
              e.preventDefault()
            }
            return
          }
      }
      
      const onMouseMove = (e: MouseEvent) => {
          if (isResizing) {
            const state = resizeStateRef.current
            if (!state) return
            const delta = state.type === 'row' ? e.clientY - state.startPos : e.clientX - state.startPos
            const nextSize = state.startSize + delta
            state.lastSize = nextSize
            setResizeHint({ type: state.type, index: state.index, pos: state.type === 'row' ? e.clientY : e.clientX })
            e.preventDefault()
            return
          }

          const dragSelection = dragSelectionRef.current
          if (dragSelection && e.buttons === 1) {
            if (!dragSelection.started) {
              const movedX = Math.abs(e.clientX - dragSelection.startX)
              const movedY = Math.abs(e.clientY - dragSelection.startY)
              if (movedX > 3 || movedY > 3) {
                dragSelection.started = true
                setIsSelecting(true)
              }
            }
          }

          if (dragSelection?.started || isSelecting) {
            e.preventDefault()
            clearDocSelection()
            const clientX = e.clientX
            const clientY = e.clientY
            let gridR = -1
            for (let i = 0; i < metrics.rows.length; i++) {
               const row = metrics.rows[i]
               if (clientY >= row.top && clientY <= row.top + row.height) {
                   gridR = i
                   break
               }
            }
            
            let gridC = -1
            for (let i = 0; i < metrics.cols.length; i++) {
               const col = metrics.cols[i]
               if (clientX >= col.left && clientX <= col.left + col.width) {
                   gridC = i
                   break
               }
            }
            
            if (gridR !== -1 && gridC !== -1) {
                const handler = new TableHandler(activeTable)
                const cellAt = handler.getCellAt(gridR, gridC)
                if (!cellAt) return
                const bounds = handler.getCellBounds(cellAt)
                if (!bounds) return
                const anchorRow = dragSelectionRef.current?.startRow ?? bounds.startRow
                const anchorCol = dragSelectionRef.current?.startCol ?? bounds.startCol
                const endRow = gridR < anchorRow ? bounds.startRow : bounds.endRow
                const endCol = gridC < anchorCol ? bounds.startCol : bounds.endCol
                setSelection({
                  startRow: anchorRow,
                  startCol: anchorCol,
                  endRow,
                  endCol
                })
            }
            return
          }

          const hint = getResizeHint(e.clientX, e.clientY)
          setResizeHint(hint)
          if (doc.body) {
            doc.body.style.cursor = hint ? (hint.type === 'row' ? 'row-resize' : 'col-resize') : ''
          }
      }
      
      const onMouseUp = () => {
          if (isResizing) {
            const state = resizeStateRef.current
            if (state) {
              onAction(state.type === 'row' ? 'resizeRow' : 'resizeColumn', { index: state.index, size: state.lastSize })
            }
            resizeStateRef.current = null
            setIsResizing(false)
            setResizeHint(null)
            if (doc.body) {
              doc.body.style.cursor = ''
            }
            return
          }
          dragSelectionRef.current = null
          setIsSelecting(false)
      }

      const onContextMenu = (e: MouseEvent) => {
          // If right click inside table, show context menu
          const target = e.target as HTMLElement
          const cell = target.closest('td, th') as HTMLTableCellElement | null
          if (!cell) return
          
          const table = target.closest('table')
          if (table !== activeTable) return
          
          e.preventDefault()
          
          let gridR = -1
          let gridC = -1
          
          // Similar logic as mousedown
          const clientX = e.clientX
          const clientY = e.clientY
          
          const handler = new TableHandler(activeTable)
          const bounds = handler.getCellBounds(cell)
          if (bounds) {
            gridR = bounds.startRow
            gridC = bounds.startCol
          } else {
            for (let i = 0; i < metrics.rows.length; i++) {
               const row = metrics.rows[i]
               if (clientY >= row.top && clientY <= row.top + row.height) {
                   gridR = i
                   break
               }
            }
            for (let i = 0; i < metrics.cols.length; i++) {
               const col = metrics.cols[i]
               if (clientX >= col.left && clientX <= col.left + col.width) {
                   gridC = i
                   break
               }
            }
          }
          
          // Update selection if needed
          let isInside = false
          if (selection) {
              const r1 = Math.min(selection.startRow, selection.endRow)
              const r2 = Math.max(selection.startRow, selection.endRow)
              const c1 = Math.min(selection.startCol, selection.endCol)
              const c2 = Math.max(selection.startCol, selection.endCol)
              if (gridR >= r1 && gridR <= r2 && gridC >= c1 && gridC <= c2) isInside = true
          }

          if (!isInside && gridR !== -1 && gridC !== -1) {
              if (bounds) {
                setSelection({
                  startRow: bounds.startRow,
                  startCol: bounds.startCol,
                  endRow: bounds.endRow,
                  endCol: bounds.endCol
                })
              } else {
                setSelection({ startRow: gridR, startCol: gridC, endRow: gridR, endCol: gridC })
              }
          }
          
          // Show menu
          const iframeRect = iframe.getBoundingClientRect()
          const cellRect = cell.getBoundingClientRect()
          const menuX = cellRect.left + iframeRect.left
          const menuY = cellRect.bottom + iframeRect.top + 6
          
          // Determine type based on where we clicked
          // If we clicked on a row header (onContextMenu on row div triggers this? No, that's separate)
          // This listener is on the DOCUMENT.
          
          // Wait, we have onContextMenu on the row/col headers too!
          // And we have this global listener on doc.
          // Which one is firing?
          
          // If we click inside table cell, doc listener fires.
          // We need to pass the clicked cell index to the menu if possible.
          
          setContextMenu({
              x: menuX,
              y: menuY,
              type: (selection && isInside && (selection.startRow !== selection.endRow || selection.startCol !== selection.endCol)) ? 'selection' : 'cell',
              rowIndex: gridR,
              colIndex: gridC
          })
      }

      doc.addEventListener('mousedown', onMouseDown)
      doc.addEventListener('mousemove', onMouseMove)
      doc.addEventListener('mouseup', onMouseUp)
      doc.addEventListener('contextmenu', onContextMenu)
      
      return () => {
          doc.removeEventListener('mousedown', onMouseDown)
          doc.removeEventListener('mousemove', onMouseMove)
          doc.removeEventListener('mouseup', onMouseUp)
          doc.removeEventListener('contextmenu', onContextMenu)
          if (doc.body) {
            doc.body.style.cursor = ''
          }
      }
  }, [iframeRef, metrics, activeTable, isSelecting, isResizing, readonly, selection, resizeHint, getResizeHint, applyResize, updateMetrics, onAction])

  if (!activeTable || !metrics || readonly) return null

  const BAR_SIZE = 18
  const GAP = 1
  const INSERT_HANDLE_SIZE = 14

  let canMerge = false
  let canSplit = false
  if (selection && activeTable) {
    const handler = new TableHandler(activeTable)
    const selectionBounds = {
      startRow: Math.min(selection.startRow, selection.endRow),
      endRow: Math.max(selection.startRow, selection.endRow),
      startCol: Math.min(selection.startCol, selection.endCol),
      endCol: Math.max(selection.startCol, selection.endCol)
    }
    const uniqueCells = new Set<HTMLTableCellElement>()
    for (let r = selectionBounds.startRow; r <= selectionBounds.endRow; r++) {
      for (let c = selectionBounds.startCol; c <= selectionBounds.endCol; c++) {
        const cell = handler.getCellAt(r, c)
        if (cell) uniqueCells.add(cell)
      }
    }
    const cells = Array.from(uniqueCells)
    const hasUnmerged = cells.some(cell => (cell.rowSpan || 1) === 1 && (cell.colSpan || 1) === 1)
    const hasMerged = cells.some(cell => (cell.rowSpan || 1) > 1 || (cell.colSpan || 1) > 1)
    const multiple = cells.length > 1
    const single = cells.length === 1
    canMerge = multiple && hasUnmerged
    canSplit = (single && hasMerged && !hasUnmerged) || (multiple && !hasUnmerged && hasMerged)
  }

  const getSelectionStyle = () => {
      if (!selection) return { display: 'none' }
      
      const r1 = Math.min(selection.startRow, selection.endRow)
      const r2 = Math.max(selection.startRow, selection.endRow)
      const c1 = Math.min(selection.startCol, selection.endCol)
      const c2 = Math.max(selection.startCol, selection.endCol)
      
      if (r1 >= metrics.rows.length || c1 >= metrics.cols.length) return { display: 'none' }
      
      const top = metrics.rows[r1].top
      const height = (metrics.rows[r2].top + metrics.rows[r2].height) - top
      const left = metrics.cols[c1].left
      const width = (metrics.cols[c2].left + metrics.cols[c2].width) - left
      
      return {
          top, left, width, height,
          display: 'block',
          position: 'absolute' as const,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          border: '2px solid #3b82f6',
          pointerEvents: 'none' as const,
          zIndex: 5
      }
  }

  const getResizeLineStyle = () => {
      if (!resizeHint) return { display: 'none' }
      if (resizeHint.type === 'row') {
        return {
          top: resizeHint.pos - 1,
          left: metrics.tableLeft,
          width: metrics.tableWidth,
          height: 2,
          display: 'block',
          position: 'absolute' as const,
          backgroundColor: '#3b82f6',
          pointerEvents: 'none' as const,
          zIndex: 6
        }
      }
      return {
        top: metrics.tableTop,
        left: resizeHint.pos - 1,
        width: 2,
        height: metrics.tableHeight,
        display: 'block',
        position: 'absolute' as const,
        backgroundColor: '#3b82f6',
        pointerEvents: 'none' as const,
        zIndex: 6
      }
  }

  return (
    <div className="absolute inset-0 z-50 pointer-events-none">
      {/* Interaction Layer over table - REMOVED blocking div */}
      
      <div style={getResizeLineStyle()} />
      <div style={getSelectionStyle()} />

      {/* Column Indicators */}
      <div className="absolute pointer-events-auto flex" style={{
        top: Math.max(0, metrics.tableTop - BAR_SIZE - GAP),
        left: metrics.tableLeft,
        height: BAR_SIZE
      }}>
        {metrics.cols.map((col, index) => (
          <div
            key={`col-${index}`}
            className={`
              group relative border border-gray-300 bg-gray-50 hover:bg-blue-50 cursor-pointer flex items-center justify-center text-xs text-gray-500
              ${hoveredCol === index ? 'bg-blue-100 border-blue-300' : ''}
            `}
            style={{ width: col.width, height: BAR_SIZE }}
            onMouseEnter={() => setHoveredCol(index)}
            onMouseLeave={() => setHoveredCol(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, type: 'col', index })
            }}
            onClick={() => {
                setSelection({ startRow: 0, endRow: metrics.rows.length - 1, startCol: index, endCol: index })
            }}
          >
            {/* <div className="w-1 h-3 bg-gray-300 rounded-sm" /> */}
            <div 
                className="absolute right-0 top-0 bottom-0 w-3 -translate-y-px translate-x-1/2 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer z-20"
                onClick={(e) => {
                    e.stopPropagation()
                    onAction('insertColumnAfter', { index })
                }}
            >
                <div
                  className="bg-blue-500 rounded-full text-white flex items-center justify-center text-[9px] shadow-sm transform hover:scale-110"
                  style={{ width: INSERT_HANDLE_SIZE, height: INSERT_HANDLE_SIZE }}
                >
                    +
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row Indicators */}
      <div className="absolute pointer-events-auto flex flex-col" style={{
        top: metrics.tableTop,
        left: Math.max(0, metrics.tableLeft - BAR_SIZE - GAP),
        width: BAR_SIZE
      }}>
        {metrics.rows.map((row, index) => (
          <div
            key={`row-${index}`}
            className={`
              group relative border border-gray-300 bg-gray-50 hover:bg-blue-50 cursor-pointer flex items-center justify-center text-xs text-gray-500
              ${hoveredRow === index ? 'bg-blue-100 border-blue-300' : ''}
            `}
            style={{ height: row.height, width: BAR_SIZE }}
            onMouseEnter={() => setHoveredRow(index)}
            onMouseLeave={() => setHoveredRow(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ x: e.clientX, y: e.clientY, type: 'row', index })
            }}
            onClick={() => {
                setSelection({ startRow: index, endRow: index, startCol: 0, endCol: metrics.cols.length - 1 })
            }}
          >
             {/* <div className="w-3 h-1 bg-gray-300 rounded-sm" /> */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-3 translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer z-20"
                onClick={(e) => {
                    e.stopPropagation()
                    onAction('insertRowAfter', { index })
                }}
            >
                <div
                  className="bg-blue-500 rounded-full text-white flex items-center justify-center text-[9px] shadow-sm transform hover:scale-110"
                  style={{ width: INSERT_HANDLE_SIZE, height: INSERT_HANDLE_SIZE }}
                >
                    +
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Corner Block */}
      <div 
        className="absolute bg-gray-100 border border-gray-300 cursor-pointer hover:bg-blue-100 pointer-events-auto z-20"
        style={{
            top: metrics.tableTop - BAR_SIZE - GAP,
            left: metrics.tableLeft - BAR_SIZE - GAP,
            width: BAR_SIZE,
            height: BAR_SIZE
        }}
        onClick={() => {
            setSelection({ startRow: 0, endRow: metrics.rows.length - 1, startCol: 0, endCol: metrics.cols.length - 1 })
        }}
      />

      {contextMenu && (
        <SmartContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          contextType={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onAction={(action) => {
              // Determine index based on context type and action
              let index = contextMenu.index
              
              if (index === undefined) {
                  // Fallback to row/col index if available
                  if (action.includes('Row') && contextMenu.rowIndex !== undefined) {
                      index = contextMenu.rowIndex
                  } else if (action.includes('Column') && contextMenu.colIndex !== undefined) {
                      index = contextMenu.colIndex
                  }
              }
              
              onAction(action, { 
                  index: index,
                  bounds: selection ? {
                      startRow: Math.min(selection.startRow, selection.endRow),
                      endRow: Math.max(selection.startRow, selection.endRow),
                      startCol: Math.min(selection.startCol, selection.endCol),
                      endCol: Math.max(selection.startCol, selection.endCol)
                  } : undefined
              })
          }}
          canMerge={canMerge}
          canSplit={canSplit}
        />
      )}
    </div>
  )
}

export default TableSmartToolbar
