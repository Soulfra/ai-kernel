const generateRouteHash = require('../../shared/utils/generateRouteHash');

describe('generateRouteHash', () => {
  it('returns a sha256 hash for given JSON', () => {
    const input = { route: '/foo', params: { id: 1 } };
    const hash = generateRouteHash(input);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent hashes for same input', () => {
    const obj = { route: '/bar', params: { q: 'test' } };
    const h1 = generateRouteHash(obj);
    const h2 = generateRouteHash(obj);
    expect(h1).toBe(h2);
  });
});
