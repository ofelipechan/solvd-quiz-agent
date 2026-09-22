/** Joins class names, dropping falsy entries. Tiny stand-in for clsx so we avoid a dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
