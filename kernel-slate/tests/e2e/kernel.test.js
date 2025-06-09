const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

jest.setTimeout(30000);

const repoRoot = path.resolve(__dirname, '../../..');
const sampleYaml = path.join(repoRoot, 'agent-templates', 'analysis-bot.yaml');
const readmePath = path.join(path.dirname(sampleYaml), 'README.md');
const agentsFile = path.join(repoRoot, 'kernel-slate/docs/available-agents.json');

let originalAgents;
let serverProc;

beforeAll(() => {
  originalAgents = fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, 'utf8') : '[]';
  if (fs.existsSync(readmePath)) fs.unlinkSync(readmePath);
  process.env.NODE_PATH = path.join(repoRoot, 'kernel-slate/node_modules');
  require('module').Module._initPaths();
});

afterAll(() => {
  if (serverProc) serverProc.kill();
  if (fs.existsSync(readmePath)) fs.unlinkSync(readmePath);
  fs.writeFileSync(agentsFile, originalAgents);
});

describe('kernel runtime e2e', () => {
  test('ensure-runtime installs deps', () => {
    const { ensureRuntime } = require('../../../scripts/core/ensure-runtime');
    ensureRuntime();
    expect(() => require('js-yaml')).not.toThrow();
  });

  test('generate README from agent template', async () => {
    await new Promise((resolve, reject) => {
      const proc = spawn('node', ['scripts/dev/generate-agent-readme.js', sampleYaml], { cwd: repoRoot });
      proc.on('error', reject);
      proc.on('exit', code => (code === 0 ? resolve() : reject(new Error(`exit ${code}`))));
    });
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  test('register agent updates available-agents', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    process.env.GITHUB_OWNER = 'test';
    process.env.GITHUB_TOKEN = 'token';
    process.env.MARKET_REPO = 'repo';
    const prevArgv = process.argv;
    process.argv = ['node', 'register-agent.js', sampleYaml, 'utility', 'Usage'];
    await require('../../../scripts/dev/register-agent').main();
    process.argv = prevArgv;
    const list = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
    expect(list.some(a => a.name === 'Analysis Bot')).toBe(true);
  });

  test('ui server endpoints', async () => {
    const port = 3456;
    await new Promise(resolve => {
      serverProc = spawn('node', ['scripts/ui/server.js'], { cwd: repoRoot, env: { ...process.env, PORT: port } });
      serverProc.stdout.on('data', data => {
        const msg = String(data);
        console.log('server:', msg.trim());
        if (msg.includes('UI server running')) resolve();
      });
      serverProc.stderr.on('data', d => console.log('server err:', String(d).trim()));
    });

    const resRoot = await new Promise((resolve, reject) => {
      require('http').get(`http://localhost:${port}/`, r => resolve(r)).on('error', reject);
    }).catch(e => { console.error('fetch error', e); return undefined; });
    expect(resRoot && resRoot.statusCode).toBe(200);

    const resUsage = await new Promise((resolve, reject) => {
      require('http').get(`http://localhost:${port}/usage`, r => {
        let data='';
        r.on('data', c => data+=c);
        r.on('end', () => { r.body=data; resolve(r); });
      }).on('error', reject);
    }).catch(e => { console.error('fetch error', e); return undefined; });
    const html = resUsage ? resUsage.body : '';
    expect(resUsage && resUsage.statusCode).toBe(200);
    expect(html).toMatch(/<html>/i);

    const list = JSON.parse(fs.readFileSync(agentsFile, 'utf8'));
    const slug = encodeURIComponent(list[0].name.toLowerCase().replace(/\s+/g, '-'));
    const resAgent = await new Promise((resolve, reject) => {
      require('http').get(`http://localhost:${port}/agents/${slug}`, r => resolve(r)).on('error', reject);
    }).catch(e => { console.error('fetch error', e); return undefined; });
    expect(resAgent && resAgent.statusCode).toBe(200);
  });
});
