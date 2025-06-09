const featureFunction = require('../index');

describe('Feature Template', () => {
  it('should return not implemented message', () => {
    expect(featureFunction()).toMatch(/not implemented/i);
  });
}); 