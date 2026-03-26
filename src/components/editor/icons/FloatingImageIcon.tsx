import { IconProps } from './IconProps'

const FloatingImageIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path 
      d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" 
      style={{ transform: 'scale(0.8) translate(3px, 3px)' }}
    />
    <path d="M4 4h4v4H4z" fill="currentColor" opacity="0.7"/>
  </svg>
)

export default FloatingImageIcon
