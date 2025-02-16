module.exports = {
  // 指定測試文件的位置
  testMatch: ["**/tests/**/*.test.js"],

  // 指定測試環境
  testEnvironment: "node",

  // 指定需要忽略的目錄
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  // 指定覆蓋率報告的目錄
  coverageDirectory: "coverage",

  // 指定需要收集覆蓋率的文件
  collectCoverageFrom: ["src/**/*.js", "!src/tests/**"],

  // 設置測試超時時間（毫秒）
  // 允許使用 import/export
  transform: {},
};
