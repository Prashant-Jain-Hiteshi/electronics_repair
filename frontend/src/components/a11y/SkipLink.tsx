import React from 'react'

const SkipLink: React.FC<{ href?: string; children?: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href = '#main-content', children = 'Skip to main content', className = '', ...rest }) => {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-md focus:bg-blue-600 focus:text-white ${className}`}
      {...rest}
    >
      {children}
    </a>
  )
}

export default SkipLink
