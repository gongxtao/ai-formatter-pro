import React from 'react'
import { IconProps } from './IconProps'

const FormatPainterIcon: React.FC<IconProps> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    width="18" 
    height="18"
  >
    <path d="M18 4V3c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h12c.55 0 1-.45 1-1V6h1v4H9v11c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-9h8V4h-2z"/>
  </svg>
)

export default FormatPainterIcon
