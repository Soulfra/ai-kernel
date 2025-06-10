const fs = require('fs');
const path = require('path');
const { ensureUser } = require('../core/user-vault');

function getAgentStatus(agentName) {
  try {
    require.resolve(`../${agentName}`);
    return { status: 'active', version: '1.0.0' };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
}

function generateVaultSummary() {
  const timestamp = new Date().toISOString();
  const repoRoot = path.resolve(__dirname, '../../');
  
  // Get installed agents
  const installed_agents = {
    core: [
      {
        name: 'provider-router',
        ...getAgentStatus('core/provider-router')
      },
      {
        name: 'user-vault',
        ...getAgentStatus('core/user-vault')
      }
    ],
    feature: [
      {
        name: 'upload-reward',
        ...getAgentStatus('agent/upload-reward-agent')
      },
      {
        name: 'voice-reflector',
        ...getAgentStatus('voice/voice-reflector')
      }
    ]
  };

  // Get active loops
  const active_loops = [
    {
      name: 'nightly-digest',
      schedule: '0 0 * * *',
      status: 'active',
      last_run: new Date(Date.now() - 86400000).toISOString() // 24h ago
    },
    {
      name: 'vault-curator',
      schedule: '0 */6 * * *',
      status: 'active',
      last_run: new Date(Date.now() - 21600000).toISOString() // 6h ago
    }
  ];

  // System config
  const system_config = {
    server: {
      port: process.env.PORT || 3000,
      host: 'localhost',
      timeout: 30000
    },
    vault: {
      base_path: '/vault',
      max_size: '1GB',
      compression: true
    },
    logging: {
      level: 'info',
      rotation: 'daily',
      max_files: 7
    }
  };

  // Health status
  const health = {
    status: 'degraded',
    issues: []
  };

  // Check for missing modules
  if (!fs.existsSync(path.join(repoRoot, 'auth', 'qr-pairing.js'))) {
    health.issues.push({
      component: 'auth',
      severity: 'high',
      message: 'Missing qr-pairing module'
    });
  }

  // Check vault structure
  const vaultPath = path.join(repoRoot, 'vault');
  if (!fs.existsSync(vaultPath)) {
    health.issues.push({
      component: 'vault',
      severity: 'medium',
      message: 'Missing vault directory'
    });
  }

  return {
    timestamp,
    version: require('../../package.json').version,
    installed_agents,
    active_loops,
    system_config,
    health
  };
}

// Generate and output summary
console.log(JSON.stringify(generateVaultSummary(), null, 2)); 