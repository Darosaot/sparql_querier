export function assert(condition, message) {\n  expect(condition).toBeTruthy();\n  if (!condition) {\n    console.error(message)\n  }\n}
