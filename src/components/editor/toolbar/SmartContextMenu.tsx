import React, { useEffect, useRef, useState } from 'react'

export interface SmartContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onAction: (action: string) => void
  contextType: 'row' | 'col' | 'cell' | 'selection'
  canMerge?: boolean
  canSplit?: boolean
}

// Icons
const ChevronRight = () => (
  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const InsertIcon = () => (
    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
)

const DeleteIcon = () => (
    <svg className="w-4 h-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)

const AlignIcon = () => (
    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
)

const MergeIcon = () => (
    <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
)

interface SubMenuProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  id: string
  activeSubmenu: string | null
  setActiveSubmenu: React.Dispatch<React.SetStateAction<string | null>>
}

const SubMenu: React.FC<SubMenuProps> = ({ title, icon, children, id, activeSubmenu, setActiveSubmenu }) => {
  const isHovered = activeSubmenu === id
  return (
    <div
      className="relative"
      onMouseEnter={() => setActiveSubmenu(id)}
      onMouseLeave={() => setActiveSubmenu(null)}
    >
      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors">
        {icon}
        {title}
        <ChevronRight />
      </button>
      {isHovered && (
        <div className="absolute left-full top-0 bg-white shadow-xl rounded-md border border-gray-200 py-1 min-w-[160px] -ml-1">
          {children}
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  className?: string
}

const MenuItem: React.FC<MenuItemProps> = ({ label, icon, onClick, className = '' }) => (
  <button onClick={onClick} className={`w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors ${className}`}>
    {icon}
    {label}
  </button>
)

const Separator = () => <div className="h-px bg-gray-200 my-1" />


const SmartContextMenu: React.FC<SmartContextMenuProps> = ({ 
  position, onClose, onAction, contextType, canMerge, canSplit 
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState(position)

  useEffect(() => {
    setMenuPosition(position)
  }, [position])

  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    const padding = 8
    const menuRect = menu.getBoundingClientRect()
    const clampedX = Math.min(
      Math.max(menuPosition.x, padding),
      window.innerWidth - menuRect.width - padding
    )
    const clampedY = Math.min(
      Math.max(menuPosition.y, padding),
      window.innerHeight - menuRect.height - padding
    )
    if (clampedX !== menuPosition.x || clampedY !== menuPosition.y) {
      setMenuPosition({ x: clampedX, y: clampedY })
    }
  }, [menuPosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside menu
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Add listener to document (main window)
    document.addEventListener('mousedown', handleClickOutside)
    
    // Also try to add listener to iframe if accessible? 
    // Usually clicks inside iframe are handled by the iframe event listeners in parent component
    // which call setContextMenu(null).
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleAction = (action: string) => {
    onAction(action)
    onClose()
  }

  return (
    <div
      ref={menuRef}
      data-context-type={contextType}
      className="fixed bg-white shadow-xl rounded-md border border-gray-200 py-1 z-[9999] min-w-[200px] pointer-events-auto"
      style={{ top: menuPosition.y, left: menuPosition.x }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <SubMenu id="align" title="Vertical Align" icon={<AlignIcon />} activeSubmenu={activeSubmenu} setActiveSubmenu={setActiveSubmenu}>
          <MenuItem label="Align Top" icon={<span className="w-4 mr-2 text-center">↑</span>} onClick={() => handleAction('valignTop')} />
          <MenuItem label="Align Middle" icon={<span className="w-4 mr-2 text-center">↕</span>} onClick={() => handleAction('valignMiddle')} />
          <MenuItem label="Align Bottom" icon={<span className="w-4 mr-2 text-center">↓</span>} onClick={() => handleAction('valignBottom')} />
      </SubMenu>

      <SubMenu id="insert" title="Insert" icon={<InsertIcon />} activeSubmenu={activeSubmenu} setActiveSubmenu={setActiveSubmenu}>
          <MenuItem label="Insert Row Above" icon={<span className="w-4 mr-2 text-center">↟</span>} onClick={() => handleAction('insertRowBefore')} />
          <MenuItem label="Insert Row Below" icon={<span className="w-4 mr-2 text-center">↡</span>} onClick={() => handleAction('insertRowAfter')} />
          <MenuItem label="Insert Column Left" icon={<span className="w-4 mr-2 text-center">↞</span>} onClick={() => handleAction('insertColumnBefore')} />
          <MenuItem label="Insert Column Right" icon={<span className="w-4 mr-2 text-center">↠</span>} onClick={() => handleAction('insertColumnAfter')} />
      </SubMenu>

      <SubMenu id="delete" title="Delete" icon={<DeleteIcon />} activeSubmenu={activeSubmenu} setActiveSubmenu={setActiveSubmenu}>
          <MenuItem label="Delete Row" className="text-red-600" onClick={() => handleAction('deleteRow')} />
          <MenuItem label="Delete Column" className="text-red-600" onClick={() => handleAction('deleteColumn')} />
          <MenuItem label="Delete Table" className="text-red-600" onClick={() => handleAction('deleteTable')} />
      </SubMenu>

      {(canMerge || canSplit) && <Separator />}
      
      {canMerge && (
        <MenuItem label="Merge Cells" icon={<MergeIcon />} onClick={() => handleAction('mergeCells')} />
      )}
      
      {canSplit && (
        <MenuItem label="Split Cell" icon={<MergeIcon />} onClick={() => handleAction('splitCell')} />
      )}

    </div>
  )
}

export default SmartContextMenu
