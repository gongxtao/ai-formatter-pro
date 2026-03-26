/**
 * TablePicker Component
 * Interactive grid picker for selecting table dimensions
 */

import React, { useState } from 'react'
import ToolbarButton from '../buttons/ToolbarButton'
import PickerDropdown from './PickerDropdown'
import { TableIcon } from '../../icons'
import { TABLE_MAX_ROWS, TABLE_MAX_COLS } from '../config/constants'

export interface TablePickerProps {
  /** Callback when a table size is selected */
  onTableSelect: (rows: number, cols: number) => void
  /** Whether the picker is disabled */
  disabled?: boolean
}

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
      <PickerDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} width="w-64">
        {/* Header */}
        <div className="mb-3 border-b border-gray-200 pb-2">
          <p className="text-sm font-medium text-gray-700">Insert table</p>
        </div>

        {/* Table Grid */}
        <div className="mb-3">
          <div
            className="grid grid-cols-10 gap-1"
            onMouseLeave={() => {
              setHoveredRow(null)
              setHoveredCol(null)
            }}
          >
            {Array.from({ length: TABLE_MAX_ROWS * TABLE_MAX_COLS }, (_, i) => {
              const row = Math.floor(i / TABLE_MAX_COLS) + 1
              const col = (i % TABLE_MAX_COLS) + 1

              const isHighlighted =
                hoveredRow !== null &&
                hoveredCol !== null &&
                row <= hoveredRow &&
                col <= hoveredCol

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTableClick(row, col)}
                  onMouseEnter={() => {
                    setHoveredRow(row)
                    setHoveredCol(col)
                  }}
                  className={`
                    w-5 h-5 border border-gray-300 rounded-sm transition-colors
                    ${isHighlighted ? 'bg-blue-500 border-blue-500' : 'hover:bg-gray-200'}
                  `}
                  title={`${row}x${col} table`}
                  aria-label={`${row} by ${col} table`}
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

      </PickerDropdown>
    </div>
  )
}

export default TablePicker
