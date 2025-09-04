import React from 'react'

export const VisuallyHidden: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ children, className = '', ...rest }) => (
  <span
    className={`sr-only ${className}`}
    {...rest}
  >
    {children}
  </span>
)

export default VisuallyHidden
