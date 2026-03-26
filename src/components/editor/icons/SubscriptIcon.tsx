import { IconProps } from './IconProps'

const SubscriptIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <text x="5" y="14" fontFamily="serif" fontSize="16" fontStyle="italic" fontWeight="bold">X</text>
    <text x="14" y="20" fontFamily="serif" fontSize="10" fontWeight="bold">2</text>
  </svg>
)

export default SubscriptIcon
