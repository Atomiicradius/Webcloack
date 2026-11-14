import { useId } from 'react'
import { cx } from './cx.js'
import './win98.css'

/**
 * Window — Win98 window frame: gradient title bar and body.
 *
 * `controls` holds REAL title-bar buttons (e.g. help). `decorativeControls`
 * draws inactive min/max/close glyphs that are aria-hidden and not focusable.
 */
export function Window({
  title,
  titleAs: TitleTag = 'h2',
  icon = null,
  controls = null,
  decorativeControls = false,
  className,
  bodyClassName,
  children,
  ...rest
}) {
  const titleId = useId()
  return (
    <section className={cx('w98-window', className)} aria-labelledby={titleId} {...rest}>
      <header className="w98-titlebar">
        {icon && <span className="w98-titlebar__icon" aria-hidden="true">{icon}</span>}
        <TitleTag id={titleId} className="w98-titlebar__text">{title}</TitleTag>
        {(controls || decorativeControls) && (
          <div className="w98-titlebar__controls">
            {controls}
            {decorativeControls && (
              <span className="w98-titlebar__deco" aria-hidden="true">
                <span className="w98-raised">_</span>
                <span className="w98-raised">□</span>
                <span className="w98-raised">×</span>
              </span>
            )}
          </div>
        )}
      </header>
      <div className={cx('w98-window__body', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Small real button for the title bar (e.g. "?"). */
export function TitleBarButton({ className, children, ...rest }) {
  return (
    <button type="button" className={cx('w98-titlebar__btn w98-raised', className)} {...rest}>
      {children}
    </button>
  )
}
