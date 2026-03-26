import { IconProps } from './IconProps'

const RemoveFormatIcon: React.FC<IconProps> = ({ size = 18, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.05 0 2.83L6.45 21.42c.39.39.9.58 1.41.58H21v-2h-4.5l6.78-6.78c.78-.78.78-2.05 0-2.83l-6.87-6.87C16.17 3.2 15.65 3 15.14 3zM7.86 20l-3.86-3.86 5.46-5.46 3.86 3.86L7.86 20z" />
  </svg>
)

export default RemoveFormatIcon
