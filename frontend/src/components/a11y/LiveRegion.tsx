import React from 'react'

export type LiveRegionProps = React.HTMLAttributes<HTMLDivElement> & {
  politeness?: 'polite' | 'assertive'
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ politeness = 'polite', className = '', children, ...rest }) => (
  <div
    aria-live={politeness}
    aria-atomic="true"
    role="status"
    className={`sr-only ${className}`}
    {...rest}
  >
    {children}
  </div>
)

export default LiveRegion
