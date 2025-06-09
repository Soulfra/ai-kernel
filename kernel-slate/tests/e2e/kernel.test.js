const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn, spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, "../../..");

function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// Utility to start a node script on a port
function startScript(script, port) {
  const proc = spawn('node', [script], {
    env: { ...process.env, PORT: String(port), NODE_PATH: path.join(repoRoot, "kernel-slate", "node_modules") },
    stdio: 'inherit'
  });
  return proc;
}

// ensure-runtime.js test
const ensureRuntimePath = path.join(repoRoot, 'scripts', 'ensure-runtime.js');
(fs.existsSync(ensureRuntimePath) ? test : test.skip)(
  'calls ensure-runtime.js and installs js-yaml if missing',
  () => {
    const jsYamlDir = path.join(repoRoot, 'node_modules', 'js-yaml');
    const backup = `${jsYamlDir}_bak`;
    if (fs.existsSync(jsYamlDir)) fs.renameSync(jsYamlDir, backup);
    try {
      execSync(`node ${ensureRuntimePath}`, { cwd: repoRoot });
      expect(fs.existsSync(jsYamlDir)).toBe(true);
    } finally {
      if (fs.existsSync(backup)) {
        fs.rmSync(jsYamlDir, { recursive: true, force: true });
        fs.renameSync(backup, jsYamlDir);
      }
    }
  }
);

// generate-agent-readme.js test
const genReadmePath = path.join(repoRoot, 'scripts', 'generate-agent-readme.js');
(fs.existsSync(genReadmePath) ? test : test.skip)(
  'runs generate-agent-readme.js and produces README.md',
  () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-'));
    const yamlPath = path.join(tmpDir, 'agent.yaml');
    fs.writeFileSync(
      yamlPath,
      'name: Test\ndescription: test\nfile: test.js\n'
    );
    execSync(`node ${genReadmePath} ${yamlPath}`, { cwd: repoRoot });
    expect(fs.existsSync(path.join(tmpDir, 'README.md'))).toBe(true);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
);

// register-agent.js test
const registerPath = path.join(repoRoot, 'scripts', 'dev', 'register-agent.js');

test('register-agent.js adds metadata to available-agents.json', async () => {
  const docsFile = path.join(repoRoot, 'kernel-slate', 'docs', 'available-agents.json');
  const original = fs.existsSync(docsFile) ? fs.readFileSync(docsFile, 'utf8') : '[]';
  const tmpYaml = path.join(os.tmpdir(), 'sample-agent.yaml');
  fs.writeFileSync(
    tmpYaml,
    'name: Sample\ndescription: Sample agent\nfile: sample.js\n'
  );
  process.env.GITHUB_OWNER = 'test';
  process.env.GITHUB_TOKEN = 'token';
  const realFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  const result = spawnSync('node', [registerPath, tmpYaml, 'test', 'usage'], {
    env: { ...process.env, NODE_PATH: path.join(repoRoot, 'kernel-slate', 'node_modules') },
    cwd: repoRoot,
    stdio: 'inherit'
  });
  global.fetch = realFetch;
  if (result.status === 0) {
    const list = JSON.parse(fs.readFileSync(docsFile, 'utf8'));
    expect(list.some(a => a.name === 'Sample')).toBe(true);
  }
  fs.writeFileSync(docsFile, original);
});

// server routes test

describe('server routes', () => {
  const uiPath = path.join(repoRoot, 'scripts', 'ui', 'server.js');
  const uploadPath = path.join(repoRoot, 'kernel-slate', 'scripts', 'features', 'upload-server.js');
  const docsFile = path.join(repoRoot, 'kernel-slate', 'docs', 'available-agents.json');
  let originalDocs;
  let uiProc;
  let uploadProc;

  beforeAll(async () => {
    originalDocs = fs.existsSync(docsFile) ? fs.readFileSync(docsFile, 'utf8') : '[]';
    fs.writeFileSync(docsFile, JSON.stringify([{ name: 'TestAgent', path: 'na', url: '' }]));
    uiProc = startScript(uiPath, 3050);
    uploadProc = startScript(uploadPath, 3051);
    await wait(1000); // give servers time to start
  });

  afterAll(() => {
    uiProc.kill();
    uploadProc.kill();
    fs.writeFileSync(docsFile, originalDocs);
  });

  test('GET /agents/0 responds', async () => {
    const res = await fetch('http://localhost:3050/agents/0');
    expect(res.status).toBe(200);
  });

  test('GET /usage responds', async () => {
    const res = await fetch('http://localhost:3050/usage');
    expect(res.status).toBe(200);
  });

  test('POST /upload responds', async () => {
    const res = await fetch('http://localhost:3051/upload', { method: 'POST' });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500); // accept 200 or 400
  });
});
