const fs = require('fs');
const path = require('path');
const os = require('os');

describe('load-loop-route', () => {
  let tempDir;
  const origEnv = process.env.LOOP_ROUTE_PATH;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-route-'));
    jest.resetModules();
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (origEnv === undefined) {
      delete process.env.LOOP_ROUTE_PATH;
    } else {
      process.env.LOOP_ROUTE_PATH = origEnv;
    }
  });

  it('loads JSON from LOOP_ROUTE_PATH', () => {
    const file = path.join(tempDir, 'route.json');
    const data = { route: 'test' };
    fs.writeFileSync(file, JSON.stringify(data));
    process.env.LOOP_ROUTE_PATH = file;
    const route = require('../../scripts/core/loop-route');
    expect(route).toEqual(data);
  });

  it('throws if file missing', () => {
    const file = path.join(tempDir, 'missing.json');
    process.env.LOOP_ROUTE_PATH = file;
    expect(() => require('../../scripts/core/loop-route')).toThrow(/missing/);
  });

  it('throws on malformed JSON', () => {
    const file = path.join(tempDir, 'bad.json');
    fs.writeFileSync(file, '{ bad json');
    process.env.LOOP_ROUTE_PATH = file;
    expect(() => require('../../scripts/core/loop-route')).toThrow(/Malformed/);
  });
});
