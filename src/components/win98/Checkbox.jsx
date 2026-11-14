import { cx } from './cx.js'
import './win98.css'

/** Checkbox — native checkbox with a Win98 box and a real <label>. */
export function Checkbox({ label, className, ...inputProps }) {
  return (
    <label className={cx('w98-check', className)}>
      <input type="checkbox" className="w98-check__input" {...inputProps} />
      <span className="w98-check__box" aria-hidden="true" />
      <span className="w98-check__label">{label}</span>
    </label>
  )
}
