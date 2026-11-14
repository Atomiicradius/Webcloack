import { useId } from 'react'
import { cx } from './cx.js'
import './win98.css'

/**
 * Slider — native range input: sunken track, raised thumb, keyboard operable.
 * Shows its value via <output>; `format` turns the raw value into display text.
 */
export function Slider({ label, value, min = 0, max = 100, step = 1, onChange, format = String, className, ...rest }) {
  const id = useId()
  return (
    <div className={cx('w98-slider', className)}>
      <div className="w98-slider__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        className="w98-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        {...rest}
      />
    </div>
  )
}
