export function makeArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function flattenArray<T>(value: T | T[] | T[][]): T[] {
  if (Array.isArray(value)) {
    return value.flat() as T[];
  }
  return [value];
}
