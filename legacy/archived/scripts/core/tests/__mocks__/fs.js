/**
 * Manual Jest mock for Node's fs module.
 * Ensures all references to fs in tests are properly mocked for robust, isolated testing.
 */
module.exports = {
  readdirSync: jest.fn(() => ['README_TEMPLATE.md']),
  copyFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
  writeFileSync: jest.fn(),
}; 