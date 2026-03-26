import { IconProps } from './IconProps'

const DeleteRowIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Row icon */}
    <rect x="3" y="8" width="18" height="4" />
    <line x1="3" y1="10" x2="21" y2="10" />
    {/* Minus icon */}
    <line x1="10" y1="15" x2="14" y2="15" />
  </svg>
)

export default DeleteRowIcon
