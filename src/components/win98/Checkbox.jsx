import { cx } from './cx.js'
import './win98.css'

function Choice({ type, label, className, ...inputProps }) {
  return (
    <label className={cx('w98-check', type === 'radio' && 'w98-check--radio', className)}>
      <input type={type} className="w98-check__input" {...inputProps} />
      <span className="w98-check__box" aria-hidden="true" />
      <span className="w98-check__label">{label}</span>
    </label>
  )
}

/** Checkbox — native checkbox with a Win98 box and a real <label>. */
export function Checkbox(props) {
  return <Choice type="checkbox" {...props} />
}

/** Radio — native radio with a Win98 dot and a real <label>. */
export function Radio(props) {
  return <Choice type="radio" {...props} />
}
