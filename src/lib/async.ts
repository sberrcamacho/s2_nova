// Mock services await this to feel like real network calls without any
// backend — short and consistent, never long enough to feel sluggish.
export function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}
