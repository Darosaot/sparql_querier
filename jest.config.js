module.exports = {
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!.*\\.mjs$|axios).*/",
  ],
  testEnvironment: "jsdom",
};