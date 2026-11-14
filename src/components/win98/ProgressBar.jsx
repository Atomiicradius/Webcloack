import { cx } from './cx.js'
import './win98.css'

const BLOCKS = 24
const RUNNER = [0, 1, 2, 3, 4]

/**
 * ProgressBar — sunken box with segmented blue blocks.
 * Pass `value` (0..100) for determinate; omit it for indeterminate.
 */
export function ProgressBar({ value, label, className }) {
  const indeterminate = value == null
  const filled = indeterminate ? 0 : Math.round((Math.max(0, Math.min(100, value)) / 100) * BLOCKS)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(value)}
      className={cx('w98-progress', indeterminate && 'w98-progress--indeterminate', className)}
    >
      {indeterminate ? (
        <span className="w98-progress__runner" aria-hidden="true">
          {RUNNER.map((i) => <span key={i} className="w98-progress__block" />)}
        </span>
      ) : (
        Array.from({ length: filled }, (_, i) => (
          <span key={i} className="w98-progress__block" aria-hidden="true" />
        ))
      )}
    </div>
  )
}
