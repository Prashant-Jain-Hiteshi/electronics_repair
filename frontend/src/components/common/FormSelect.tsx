import React from 'react'

export type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  helpText?: string
  error?: string
  containerClassName?: string
  options?: Array<{ value: string; label: string }>
}

const FormSelect: React.FC<FormSelectProps> = ({ label, helpText, error, containerClassName, className, children, options, ...rest }) => {
  return (
    <label className={"block text-sm " + (containerClassName || '')}>
      {label && <span className="block text-xs text-slate-300 mb-1">{label}</span>}
      <select
        className={[
          'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors',
          'bg-[#0f1218] text-white border-white/10 focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB]',
          className || '',
        ].join(' ')}
        {...rest}
      >
        {options ? options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )) : children}
      </select>
      {helpText && !error && <span className="mt-1 block text-[11px] text-slate-400">{helpText}</span>}
      {error && <span className="mt-1 block text-[11px] text-rose-300">{error}</span>}
    </label>
  )
}

export default FormSelect
