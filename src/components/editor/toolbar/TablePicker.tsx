import React, { useState } from 'react'
import ToolbarButton from './ToolbarButton'
import { TableIcon } from '../icons'

interface TablePickerProps {
  onTableSelect: (rows: number, cols: number) => void
  disabled?: boolean
}

const MAX_ROWS = 10
const MAX_COLS = 10

const TablePicker: React.FC<TablePickerProps> = ({ onTableSelect, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [hoveredCol, setHoveredCol] = useState<number | null>(null)

  const handleTableClick = (rows: number, cols: number) => {
    onTableSelect(rows, cols)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      {/* Main Table Button */}
      <ToolbarButton
        title="Insert table"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="min-w-[40px] px-2"
      >
        <TableIcon />
      </ToolbarButton>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Table Picker Panel */}
          <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 w-64">
            {/* Header */}
            <div className="mb-3 border-b border-gray-200 pb-2">
              <p className="text-sm font-medium text-gray-700">Insert table</p>
            </div>

            {/* Table Grid */}
            <div className="mb-3">
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
                  const row = Math.floor(i / MAX_COLS) + 1
                  const col = (i % MAX_COLS) + 1

                  const isHighlighted =
                    hoveredRow !== null &&
                    hoveredCol !== null &&
                    row <= hoveredRow &&
                    col <= hoveredCol

                  return (
                    <button
                      key={i}
                      onClick={() => handleTableClick(row, col)}
                      onMouseEnter={() => {
                        setHoveredRow(row)
                        setHoveredCol(col)
                      }}
                      onMouseLeave={() => {
                        setHoveredRow(null)
                        setHoveredCol(null)
                      }}
                      className={`
                        w-5 h-5 border border-gray-300 rounded-sm transition-colors
                        ${isHighlighted ? 'bg-blue-500 border-blue-500' : 'hover:bg-gray-200'}
                      `}
                      title={`${row}x${col} table`}
                    />
                  )
                })}
              </div>
              {hoveredRow && hoveredCol && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {hoveredRow} × {hoveredCol} table
                </p>
              )}
            </div>

            {/* Quick Insert */}
            <div className="border-t border-gray-200 pt-3">
              <p className="text-xs text-gray-500 mb-2 px-1">Quick insert</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleTableClick(2, 2)}
                  className="px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors text-left"
                >
                  2 × 2 table
                </button>
                <button
                  onClick={() => handleTableClick(3, 3)}
                  className="px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors text-left"
                >
                  3 × 3 table
                </button>
                <button
                  onClick={() => handleTableClick(2, 3)}
                  className="px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors text-left"
                >
                  2 × 3 table
                </button>
                <button
                  onClick={() => handleTableClick(3, 2)}
                  className="px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors text-left"
                >
                  3 × 2 table
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default TablePicker
