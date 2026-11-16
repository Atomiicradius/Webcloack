/**
 * filterImages.js — Which filters have a card image, decided at BUILD time.
 *
 * Only the keys of this glob are used, so Vite emits the matching paths and
 * no imports (checked: the transform contains no import statements). A
 * missing file is therefore never requested at runtime. Drop
 * public/assets/filters/<filterId>.png in and rebuild to use it.
 */

const found = Object.keys(import.meta.glob('/public/assets/filters/*.png'))

/** filterId -> public URL */
export const FILTER_IMAGES = Object.fromEntries(
  found.map((path) => [path.split('/').pop().replace(/\.png$/, ''), path.replace(/^\/public/, '')]),
)
