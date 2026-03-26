import { IconProps } from './IconProps'

const AddColumnIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    {/* Column icon */}
    <rect x="8" y="3" width="4" height="18" />
    <line x1="10" y1="3" x2="10" y2="21" />
    {/* Plus icon */}
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="14" y1="12" x2="18" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <line x1="16" y1="10" x2="16" y2="14" />
  </svg>
)

export default AddColumnIcon
