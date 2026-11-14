/** Join truthy class names. */
export function cx(...names) {
  return names.filter(Boolean).join(' ')
}
