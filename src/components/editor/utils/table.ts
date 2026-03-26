const MIN_CELL_WIDTH = 60
const MIN_CELL_HEIGHT = 32

export class TableHandler {
  private grid: (HTMLTableCellElement | null)[][] = []
  private rows: HTMLTableRowElement[] = []
  private maxCols: number = 0

  constructor(private table: HTMLTableElement) {
    this.analyze()
  }

  private analyze() {
    this.rows = Array.from(this.table.rows)
    this.grid = []
    this.maxCols = 0

    // Initialize grid
    for (let r = 0; r < this.rows.length; r++) {
      this.grid[r] = []
    }

    // Fill grid
    for (let r = 0; r < this.rows.length; r++) {
      const row = this.rows[r]
      const cells = Array.from(row.cells)
      let currCol = 0

      for (const cell of cells) {
        // Skip filled slots (from rowspans)
        while (this.grid[r][currCol]) {
          currCol++
        }

        const rowspan = cell.rowSpan || 1
        const colspan = cell.colSpan || 1

        // Mark slots
        for (let i = 0; i < rowspan; i++) {
          for (let j = 0; j < colspan; j++) {
            if (this.grid[r + i]) {
              this.grid[r + i][currCol + j] = cell
            }
          }
        }

        currCol += colspan
      }
      if (currCol > this.maxCols) this.maxCols = currCol
    }
  }

  insertColumnBefore(cell: HTMLTableCellElement) {
    const colIndex = this.getCellColIndex(cell)
    if (colIndex === -1) return
    this.insertColumnAt(colIndex)
  }

  insertColumnAfter(cell: HTMLTableCellElement) {
    const colIndex = this.getCellColIndex(cell)
    if (colIndex === -1) return
    this.insertColumnAt(colIndex + cell.colSpan)
  }

  insertColumnAt(index: number) {
    // Iterate all rows and insert a cell at the given grid index
    for (let r = 0; r < this.rows.length; r++) {
      const row = this.rows[r]
      
      // Find the cell that corresponds to this column index
      // Or the cell BEFORE it
      const currentGridCol = 0
      let inserted = false
      
      const cells = Array.from(row.cells)
      
      // Special case: empty row or inserting at 0
      if (index === 0 && cells.length > 0) {
         const newCell = row.insertCell(0)
         this.styleCell(newCell)
         continue
      }

      // Find insertion point
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        // Calculate where this cell ends
        const colspan = cell.colSpan || 1
        
        // If we are inserting within a spanned cell?
        // e.g. cell starts at 0, colspan 3. We insert at 1.
        // Then we should increase colspan.
        // BUT, we need to know the GRID index of this cell.
        
        // We can use our analyzed grid
        const cellInGrid = this.grid[r].findIndex(c => c === cell)
        if (cellInGrid === -1) continue // Should not happen
        
        // If insertion index is strictly AFTER this cell
        if (cellInGrid + colspan === index) {
            // Insert after this cell
            const newCell = row.insertCell(i + 1)
            this.styleCell(newCell)
            inserted = true
            break
        }
        
        // If insertion index is INSIDE this cell (spanned)
        if (cellInGrid < index && cellInGrid + colspan > index) {
            cell.colSpan++
            inserted = true
            break
        }
      }
      
      if (!inserted) {
          // Append to end if not found (e.g. index is maxCols)
          const newCell = row.insertCell()
          this.styleCell(newCell)
      }
    }
  }

  deleteColumn(cell: HTMLTableCellElement) {
    const colIndex = this.getCellColIndex(cell)
    if (colIndex === -1) return
    this.deleteColumnAt(colIndex)
  }

  deleteColumnAt(colIndex: number) {
    if (colIndex < 0 || colIndex >= this.maxCols) return

    const processedCells = new Set<HTMLTableCellElement>()

    for (let r = 0; r < this.rows.length; r++) {
      const cellAtPos = this.grid[r][colIndex]
      if (!cellAtPos) continue

      if (processedCells.has(cellAtPos)) continue
      processedCells.add(cellAtPos)

      if (cellAtPos.colSpan > 1) {
        cellAtPos.colSpan--
      } else {
        cellAtPos.remove()
      }
    }

    this.analyze()
  }

  insertRowBefore(cell: HTMLTableCellElement) {
    const row = cell.parentElement as HTMLTableRowElement
    const rowIndex = row.rowIndex
    this.insertRowAt(rowIndex)
  }

  insertRowAfter(cell: HTMLTableCellElement) {
    const row = cell.parentElement as HTMLTableRowElement
    const rowIndex = row.rowIndex
    this.insertRowAt(rowIndex + 1) // +1 works for append too
  }
  
  insertRowAt(index: number) {
      const newRow = this.table.insertRow(index)
      // We need to match the column structure.
      // Simply adding maxCols cells is a naive approach but works for simple tables.
      // Correct approach: Check each column index. If a rowspan from above crosses this index, don't add cell.
      
      // Since we inserting a NEW row, any rowspan crossing it must be extended.
      // We need to check the row ABOVE insertion point (index - 1).
      
      const prevRowIndex = index - 1
      
      for (let c = 0; c < this.maxCols; c++) {
          // Check if column c is occupied by a rowspan from above
          let occupied = false
          if (prevRowIndex >= 0) {
              const cellAbove = this.grid[prevRowIndex][c]
              if (cellAbove) {
                  const cellRowIndex = (cellAbove.parentElement as HTMLTableRowElement).rowIndex
                  const cellRowSpan = cellAbove.rowSpan
                  // If cell starts above and ends below insertion
                  if (cellRowIndex + cellRowSpan > index) {
                      cellAbove.rowSpan++
                      occupied = true
                  }
              }
          }
          
          if (!occupied) {
              const newCell = newRow.insertCell()
              this.styleCell(newCell)
          }
      }
  }

  deleteRow(cell: HTMLTableCellElement) {
    const row = cell.parentElement as HTMLTableRowElement
    const rowIndex = row.rowIndex
    
    // Check cells in this row
    const cells = Array.from(row.cells)
    for (const c of cells) {
        if (c.rowSpan > 1) {
            // This cell spans multiple rows.
            // Since we are deleting the STARTING row, we need to move the cell to the next row?
            // This is complex. Standard behavior: content is lost or cell is moved.
            // Simple approach: shrink rowspan? No, cell is anchored here.
            
            // Better approach: Move cell to next row (if exists) and decrement rowspan.
            const nextRow = this.table.rows[rowIndex + 1]
            if (nextRow) {
                // We need to insert this cell into nextRow at correct position.
                // Complex.
                // Fallback: just delete it for now.
            }
        }
    }
    
    // Check cells from ABOVE spanning into this row
    // We need to find them and decrement rowspan.
    const processedCells = new Set<HTMLTableCellElement>()
    for (let c = 0; c < this.maxCols; c++) {
        const cellAtPos = this.grid[rowIndex][c]
        if (!cellAtPos) continue
        
        // If cell started in this row, we handled it (it gets deleted).
        // If cell started above:
        const cellRow = cellAtPos.parentElement as HTMLTableRowElement
        if (cellRow !== row) {
            if (processedCells.has(cellAtPos)) continue
            processedCells.add(cellAtPos)
            cellAtPos.rowSpan--
        }
    }
    
    row.remove()
  }
  
  deleteTable() {
      this.table.remove()
  }

  private getCellColIndex(cell: HTMLTableCellElement): number {
    for (let r = 0; r < this.rows.length; r++) {
        const index = this.grid[r].indexOf(cell)
        if (index !== -1) return index
    }
    return -1
  }

  private styleCell(cell: HTMLTableCellElement) {
      cell.style.border = '1px solid #ccc'
      cell.style.padding = '8px'
      cell.style.minWidth = `${MIN_CELL_WIDTH}px`
      cell.style.height = `${MIN_CELL_HEIGHT}px`
      cell.style.boxSizing = 'border-box'
      cell.style.whiteSpace = 'normal'
      cell.style.wordBreak = 'break-word'
      cell.style.overflowWrap = 'break-word'
  }

  setRowHeight(rowIndex: number, height: number) {
    if (rowIndex < 0 || rowIndex >= this.rows.length) return
    const row = this.rows[rowIndex]
    const nextHeight = Math.max(height, MIN_CELL_HEIGHT)
    row.style.height = `${nextHeight}px`
    Array.from(row.cells).forEach(cell => {
      cell.style.height = `${nextHeight}px`
    })
  }

  setColumnWidth(colIndex: number, width: number) {
    if (colIndex < 0 || colIndex >= this.maxCols) return
    const nextWidth = Math.max(width, MIN_CELL_WIDTH)
    const processedCells = new Set<HTMLTableCellElement>()
    for (let r = 0; r < this.rows.length; r++) {
      const cell = this.grid[r][colIndex]
      if (!cell) continue
      if (processedCells.has(cell)) continue
      processedCells.add(cell)
      cell.style.boxSizing = 'border-box'
      cell.style.width = `${nextWidth}px`
      cell.style.minWidth = `${nextWidth}px`
      cell.style.whiteSpace = 'normal'
      cell.style.wordBreak = 'break-word'
      cell.style.overflowWrap = 'break-word'
    }
  }

  applyColumnWidths(widths: number[]) {
    const normalized = []
    for (let i = 0; i < this.maxCols; i++) {
      const next = widths[i]
      normalized[i] = Math.max(typeof next === 'number' ? next : MIN_CELL_WIDTH, MIN_CELL_WIDTH)
    }
    const processedCells = new Set<HTMLTableCellElement>()
    for (let r = 0; r < this.rows.length; r++) {
      for (let c = 0; c < this.maxCols; c++) {
        const cell = this.grid[r][c]
        if (!cell) continue
        if (processedCells.has(cell)) continue
        processedCells.add(cell)
        const startCol = this.grid[r].indexOf(cell)
        if (startCol === -1) continue
        const span = cell.colSpan || 1
        let totalWidth = 0
        for (let i = 0; i < span; i++) {
          totalWidth += normalized[startCol + i] ?? MIN_CELL_WIDTH
        }
        cell.style.boxSizing = 'border-box'
        cell.style.width = `${totalWidth}px`
        cell.style.minWidth = `${totalWidth}px`
        cell.style.whiteSpace = 'normal'
        cell.style.wordBreak = 'break-word'
        cell.style.overflowWrap = 'break-word'
      }
    }
  }

  getCellBounds(cell: HTMLTableCellElement) {
    let startRow = Infinity
    let endRow = -1
    let startCol = Infinity
    let endCol = -1

    for (let r = 0; r < this.rows.length; r++) {
      for (let c = 0; c < this.maxCols; c++) {
        if (this.grid[r][c] === cell) {
          startRow = Math.min(startRow, r)
          endRow = Math.max(endRow, r)
          startCol = Math.min(startCol, c)
          endCol = Math.max(endCol, c)
        }
      }
    }

    if (startRow === Infinity) return null
    return { startRow, endRow, startCol, endCol }
  }

  getColumnMetrics() {
    const tableRect = this.table.getBoundingClientRect()
    const fallbackWidth = this.maxCols > 0 ? tableRect.width / this.maxCols : 0
    const cols: { left: number; width: number }[] = []

    for (let c = 0; c < this.maxCols; c++) {
      let metric: { left: number; width: number } | null = null
      for (let r = 0; r < this.rows.length; r++) {
        const cell = this.grid[r][c]
        if (!cell) continue
        const rect = cell.getBoundingClientRect()
        const startIndex = this.grid[r].indexOf(cell)
        if (startIndex === -1) continue
        const span = cell.colSpan || 1
        const width = rect.width / span
        const left = rect.left + (c - startIndex) * width
        metric = { left, width }
        break
      }
      if (!metric) {
        metric = {
          left: tableRect.left + c * fallbackWidth,
          width: fallbackWidth
        }
      }
      cols.push(metric)
    }

    return cols
  }

  mergeCells(cells: HTMLTableCellElement[]) {
    if (cells.length < 2) return

    // 1. Calculate bounding box
    let minRow = Infinity, maxRow = -Infinity
    let minCol = Infinity, maxCol = -Infinity

    const cellPositions: { cell: HTMLTableCellElement, r: number, c: number }[] = []

    for (const cell of cells) {
      // Find cell position in grid
      for (let r = 0; r < this.rows.length; r++) {
        for (let c = 0; c < this.maxCols; c++) {
          if (this.grid[r][c] === cell) {
            minRow = Math.min(minRow, r)
            maxRow = Math.max(maxRow, r)
            minCol = Math.min(minCol, c)
            maxCol = Math.max(maxCol, c)
            cellPositions.push({ cell, r, c })
          }
        }
      }
    }

    if (minRow === Infinity) return // Should not happen

    // 2. Verify rectangularity
    // The number of cells in the grid within bounds must equal the number of cells provided
    // AND the area (width * height) must match the number of grid slots covered
    
    const targetRowCount = maxRow - minRow + 1
    const targetColCount = maxCol - minCol + 1
    const targetArea = targetRowCount * targetColCount

    // Check if every slot in the bounding box is covered by one of the input cells
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cellAtPos = this.grid[r][c]
        if (!cellAtPos || !cells.includes(cellAtPos)) {
          return // Selection is not rectangular or contains gaps
        }
      }
    }

    // 3. Merge
    // The top-left cell is the keeper
    const keeper = this.grid[minRow][minCol]
    if (!keeper) return

    const cellPositionMap = new Map<HTMLTableCellElement, { r: number; c: number }>()
    cellPositions.forEach(pos => {
      if (!cellPositionMap.has(pos.cell)) {
        cellPositionMap.set(pos.cell, { r: pos.r, c: pos.c })
      }
    })
    const orderedCells = Array.from(cellPositionMap.entries())
      .map(([cell, pos]) => ({ cell, r: pos.r, c: pos.c }))
      .sort((a, b) => (a.r - b.r) || (a.c - b.c))
    const mergedPieces = orderedCells
      .map(item => item.cell.innerHTML.trim())
      .filter(html => html.length > 0)
    const mergedHtml = mergedPieces.join('<br>')

    const cellsToRemove = new Set<HTMLTableCellElement>()
    for (const cell of cells) {
      if (cell !== keeper) {
        cellsToRemove.add(cell)
      }
    }
    
    cellsToRemove.forEach(cell => cell.remove())

    // Update keeper
    keeper.rowSpan = targetRowCount
    keeper.colSpan = targetColCount
    keeper.innerHTML = mergedHtml
    
    // Re-analyze to update grid
    this.analyze()
  }

  splitCell(cell: HTMLTableCellElement) {
    const rowspan = cell.rowSpan || 1
    const colspan = cell.colSpan || 1

    if (rowspan === 1 && colspan === 1) return

    // Find position
    let startR = -1, startC = -1
    for (let r = 0; r < this.rows.length; r++) {
      const c = this.grid[r].indexOf(cell)
      if (c !== -1) {
        startR = r
        startC = c
        break
      }
    }

    if (startR === -1) return

    // Reset current cell
    cell.rowSpan = 1
    cell.colSpan = 1

    // Insert new cells for the gaps
    for (let r = startR; r < startR + rowspan; r++) {
      for (let c = startC; c < startC + colspan; c++) {
        if (r === startR && c === startC) continue // This is the original cell

        const row = this.rows[r]
        
        // We need to insert a cell at column c in row r
        // Find the insertion point: the cell at grid[r][c+1]...
        let nextCell: HTMLTableCellElement | null = null
        for (let nextC = c + 1; nextC < this.maxCols; nextC++) {
            const possibleNext = this.grid[r][nextC]
            if (possibleNext && possibleNext.parentElement === row) {
                // Make sure we haven't already seen this cell in our loop (unlikely for right-side neighbors)
                // And ensure it starts in this row (not a rowspan from above)
                nextCell = possibleNext
                break
            }
        }

        const newCell = this.table.ownerDocument.createElement('td')
        this.styleCell(newCell)

        if (nextCell) {
          row.insertBefore(newCell, nextCell)
        } else {
          row.appendChild(newCell)
        }
      }
    }
    
    this.analyze()
  }

  getCellAt(row: number, col: number): HTMLTableCellElement | null {
    if (row >= 0 && row < this.rows.length && col >= 0 && col < this.maxCols) {
      return this.grid[row][col]
    }
    return null
  }
}
