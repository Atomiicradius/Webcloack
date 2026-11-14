import { cx } from './cx.js'
import './win98.css'

/** Panel — raised or sunken box. */
export function Panel({ variant = 'raised', as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cx('w98-panel', `w98-panel--${variant}`, className)} {...rest}>
      {children}
    </Tag>
  )
}
