import { forwardRef } from 'react'
import { cx } from './cx.js'
import './win98.css'

/**
 * Button — native <button>, raised; sunken with a 1px content shift while
 * pressed. variant="default" adds the Win98 black frame for the primary action.
 */
export const Button = forwardRef(function Button(
  { variant = 'normal', className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('w98-btn', variant === 'default' && 'w98-btn--default', className)}
      {...rest}
    >
      <span className="w98-btn__inner">{children}</span>
    </button>
  )
})
