import { IconProps } from './IconProps'

const SuperscriptIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <text x="5" y="17" fontFamily="serif" fontSize="16" fontStyle="italic" fontWeight="bold">X</text>
    <text x="14" y="10" fontFamily="serif" fontSize="10" fontWeight="bold">2</text>
  </svg>
)

export default SuperscriptIcon
