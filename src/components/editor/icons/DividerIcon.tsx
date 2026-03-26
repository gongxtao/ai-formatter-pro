import { IconProps } from './IconProps'

const DividerIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19 13H5v-2h14v2z" />
  </svg>
)

export default DividerIcon
