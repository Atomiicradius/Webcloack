import { forwardRef } from 'react'
import { cx } from './cx.js'
import './win98.css'

/**
 * Button — native <button>, raised; sunken with a 1px content shift while
 * pressed. variant="default" adds the Win98 black frame for the primary action.
 */
export const Button = forwardRef(function Button(
  { variant = 'normal', block = false, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('w98-btn', variant === 'default' && 'w98-btn--default', block && 'w98-btn--block', className)}
      {...rest}
    >
      <span className="w98-btn__inner">{children}</span>
    </button>
  )
})

/**
 * ToolButton — icon + label toolbar button. When `pressed` is a boolean it
 * becomes a toggle (aria-pressed) and the pressed state is drawn sunken.
 * `hint` is a small faint corner label (e.g. the keyboard shortcut).
 */
export const ToolButton = forwardRef(function ToolButton(
  { icon = null, label, hint, pressed, layout = 'stack', className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
      className={cx('w98-tool', layout === 'row' && 'w98-tool--row', className)}
      {...rest}
    >
      <span className="w98-tool__inner">
        {icon && <span className="w98-tool__icon" aria-hidden="true">{icon}</span>}
        <span className="w98-tool__label">{label}</span>
      </span>
      {hint != null && <span className="w98-tool__hint" aria-hidden="true">{hint}</span>}
    </button>
  )
})
