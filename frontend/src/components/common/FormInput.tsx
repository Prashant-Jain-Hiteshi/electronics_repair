import React from 'react'

export type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  helpText?: string
  error?: string
  containerClassName?: string
}

const FormInput: React.FC<FormInputProps> = ({ label, helpText, error, containerClassName, className, ...rest }) => {
  return (
    <label className={"block text-sm " + (containerClassName || '')}>
      {label && <span className="block text-xs text-slate-300 mb-1">{label}</span>}
      <input
        className={[
          'w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors',
          'bg-[#0f1218] text-white border-white/10 focus:ring-2 focus:ring-[#A48AFB] focus:border-[#A48AFB]',
          'placeholder-slate-400',
          className || '',
        ].join(' ')}
        {...rest}
      />
      {helpText && !error && <span className="mt-1 block text-[11px] text-slate-400">{helpText}</span>}
      {error && <span className="mt-1 block text-[11px] text-rose-300">{error}</span>}
    </label>
  )
}

export default FormInput
