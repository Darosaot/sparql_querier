export function assert(condition, message) {
  expect(condition).toBeTruthy();
  if (!condition) {
    console.error(message)
  }
}
