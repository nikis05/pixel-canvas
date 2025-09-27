export function toVoid<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => void {
  return (...args: T) => {
    fn(...args).catch((err: unknown) => {
      console.error("Unhandled async error:", err);
    });
  };
}
