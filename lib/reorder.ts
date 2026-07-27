export function reorderFiles<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < items.length;
  if (!inRange(fromIndex) || !inRange(toIndex) || fromIndex === toIndex) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
