import { cx } from './cx.js'
import './win98.css'

/** Panel — raised | sunken | etched box. `dark` gives the mint-on-black look. */
export function Panel({ variant = 'raised', dark = false, as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cx('w98-panel', `w98-panel--${variant}`, dark && 'w98-panel--dark', className)} {...rest}>
      {children}
    </Tag>
  )
}

/** Groupbox — etched frame with a legend (native fieldset/legend). */
export function Groupbox({ legend, className, children, ...rest }) {
  return (
    <fieldset className={cx('w98-group', className)} {...rest}>
      <legend className="w98-group__legend">{legend}</legend>
      {children}
    </fieldset>
  )
}

/** StatusField — one shallow sunken cell of a status bar. */
export function StatusField({ grow = false, className, children, ...rest }) {
  return (
    <div className={cx('w98-statusfield', grow && 'w98-statusfield--grow', className)} {...rest}>
      {children}
    </div>
  )
}
