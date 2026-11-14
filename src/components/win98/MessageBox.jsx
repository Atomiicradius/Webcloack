import { useId } from 'react'
import { Window } from './Window.jsx'
import { cx } from './cx.js'
import './win98.css'

/**
 * MessageBox — Win98 dialog: title bar, icon, message, buttons.
 *
 * role: 'alertdialog' for errors, 'status' for passive notices, 'dialog' for
 * other modal content. Dialog roles get aria-modal and a description id.
 */
export function MessageBox({
  title,
  icon = null,
  role = 'status',
  buttons = null,
  className,
  children,
  ...rest
}) {
  const messageId = useId()
  const isDialog = role === 'alertdialog' || role === 'dialog'
  return (
    <Window
      title={title}
      titleAs="h2"
      className={cx('w98-msgbox', className)}
      role={role}
      aria-modal={isDialog ? 'true' : undefined}
      aria-describedby={isDialog ? messageId : undefined}
      {...rest}
    >
      <div className="w98-msgbox__content">
        {icon && <span className="w98-msgbox__icon" aria-hidden="true">{icon}</span>}
        <div id={messageId} className="w98-msgbox__message">{children}</div>
      </div>
      {buttons && <div className="w98-msgbox__buttons">{buttons}</div>}
    </Window>
  )
}
