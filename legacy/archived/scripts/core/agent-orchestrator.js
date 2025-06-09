const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const TelemetryManager = require('./telemetry-manager');
const { LLMRouter } = require('./llm-router');

class AgentOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      registryPath: options.registryPath || './CLARITY_ENGINE_DOCS/core/agents/Unified_Soulfra_Registry_v6.1_FULL.json',
      agentConfig: {
        maxConcurrent: options.maxConcurrent || 10,
        timeout: options.timeout || 30000,
        retryAttempts: options.retryAttempts || 3,
        cacheEnabled: options.cacheEnabled || true,
        cacheTTL: options.cacheTTL || 3600000
      },
      chainConfig: {
        maxChainLength: options.maxChainLength || 5,
        validationEnabled: options.validationEnabled || true,
        monitoringEnabled: options.monitoringEnabled || true,
        recoveryEnabled: options.recoveryEnabled || true
      },
      resourceConfig: {
        maxMemory: options.maxMemory || 1024,
        maxCPU: options.maxCPU || 80,
        maxConcurrentChains: options.maxConcurrentChains || 5
      }
    };

    this.agents = new Map();
    this.chains = new Map();
    this.cache = new Map();
    this.activeChains = new Set();
    this.agentStats = new Map();
    this.telemetryManager = new TelemetryManager();
  }

  async initialize() {
    try {
      await this.telemetryManager.startSpan('AgentOrchestrator.initialize');
      // Load agent registry
      const registryData = await fs.readFile(this.options.registryPath, 'utf8');
      const registry = JSON.parse(registryData);

      // Initialize agents
      for (const agent of registry) {
        if (agent.enabled) {
          this.agents.set(agent.name, {
            ...agent,
            stats: {
              calls: 0,
              errors: 0,
              avgResponseTime: 0,
              lastUsed: null
            }
          });
        }
      }

      this.emit('initialized', { agentCount: this.agents.size });
      await this.telemetryManager.endSpan('AgentOrchestrator.initialize');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize AgentOrchestrator: ${error.message}`));
      throw error;
    }
  }

  async findAgents({ tags = [], capabilities = [], loop = null }) {
    const matches = [];
    for (const [name, agent] of this.agents) {
      const hasTags = tags.length === 0 || tags.some(tag => agent.tags.includes(tag));
      const hasCapabilities = capabilities.length === 0 || 
        capabilities.some(cap => agent.capabilities?.includes(cap));
      const hasLoop = !loop || agent.loop === loop;
      
      if (hasTags && hasCapabilities && hasLoop) {
        matches.push(agent);
      }
    }
    return matches;
  }

  async buildChain({ agents, input, context = {} }) {
    // Validate chain length
    if (agents.length > this.options.chainConfig.maxChainLength) {
      throw new Error(`Chain length exceeds maximum of ${this.options.chainConfig.maxChainLength}`);
    }

    // Validate agents exist and are enabled
    for (const agentName of agents) {
      const agent = this.agents.get(agentName);
      if (!agent) {
        throw new Error(`Unknown agent: ${agentName}`);
      }
      if (!agent.enabled) {
        throw new Error(`Agent ${agentName} is disabled`);
      }
    }

    const chainId = `chain_${Date.now()}`;
    const chain = {
      id: chainId,
      agents,
      input,
      context: {
        metadata: {},
        state: {},
        ...context
      },
      options: {
        timeout: this.options.agentConfig.timeout,
        retryAttempts: this.options.agentConfig.retryAttempts
      }
    };

    this.chains.set(chainId, chain);
    return chain;
  }

  async executeChain(chain) {
    if (this.activeChains.size >= this.options.resourceConfig.maxConcurrentChains) {
      throw new Error('Maximum concurrent chains limit reached');
    }

    this.activeChains.add(chain.id);
    const startTime = Date.now();

    try {
      await this.telemetryManager.startSpan('AgentOrchestrator.executeChain');
      let result = chain.input;
      const chainContext = { ...chain.context };

      for (const agentName of chain.agents) {
        const agent = this.agents.get(agentName);
        const agentStartTime = Date.now();

        try {
          await this.telemetryManager.startSpan('AgentOrchestrator.executeAgent');
          result = await this.executeAgent(agent, result, chainContext);
          this.updateAgentStats(agentName, Date.now() - agentStartTime);
          await this.telemetryManager.endSpan('AgentOrchestrator.executeAgent');
        } catch (error) {
          this.updateAgentStats(agentName, Date.now() - agentStartTime, true);
          throw error;
        }
      }

      const executionTime = Date.now() - startTime;
      this.emit('chainComplete', {
        chainId: chain.id,
        executionTime,
        result
      });
      await this.telemetryManager.endSpan('AgentOrchestrator.executeChain');
      return result;
    } catch (error) {
      this.emit('chainError', {
        chainId: chain.id,
        error: error.message
      });
      throw error;
    } finally {
      this.activeChains.delete(chain.id);
    }
  }

  async executeAgent(agent, input, context) {
    const cacheKey = this.generateCacheKey(agent.name, input);
    
    if (this.options.agentConfig.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.options.agentConfig.cacheTTL) {
        return cached.result;
      }
    }

    // Validate input against agent's schema
    this.validateInput(agent, input);

    // Execute agent using its prompt template and LLM
    await this.telemetryManager.startSpan('AgentOrchestrator.executeAgentWithLLM');
    const result = await this.executeAgentWithLLM(agent, input, context);
    await this.telemetryManager.endSpan('AgentOrchestrator.executeAgentWithLLM');

    // Validate output against agent's schema
    this.validateOutput(agent, result);

    if (this.options.agentConfig.cacheEnabled) {
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  validateInput(agent, input) {
    if (!agent.inputSchema) return;

    const validate = (schema, data) => {
      if (schema.type === 'object') {
        if (typeof data !== 'object') {
          throw new Error(`Invalid input type for ${agent.name}: expected object`);
        }
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              throw new Error(`Missing required field '${field}' for ${agent.name}`);
            }
          }
        }
        if (schema.properties) {
          for (const [key, value] of Object.entries(data)) {
            if (schema.properties[key]) {
              validate(schema.properties[key], value);
            }
          }
        }
      }
    };

    validate(agent.inputSchema, input);
  }

  validateOutput(agent, output) {
    if (!agent.outputSchema) return;

    const validate = (schema, data) => {
      if (schema.type === 'object') {
        if (typeof data !== 'object') {
          throw new Error(`Invalid output type for ${agent.name}: expected object`);
        }
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              throw new Error(`Missing required field '${field}' in ${agent.name} output`);
            }
          }
        }
        if (schema.properties) {
          for (const [key, value] of Object.entries(data)) {
            if (schema.properties[key]) {
              validate(schema.properties[key], value);
            }
          }
        }
      }
    };

    validate(agent.outputSchema, output);
  }

  async executeAgentWithLLM(agent, input, context) {
    const prompt = this.buildPrompt(agent, input, context);
    const llmRouter = new LLMRouter();
    try {
      const result = await llmRouter.routeLLMCall(prompt, context, { model: agent.model || 'openai' });
      await this.telemetryManager.recordMetric('agent_llm_call', 1, { agent: agent.name, model: agent.model || 'openai' });
      return { response: result.response };
    } catch (err) {
      await this.telemetryManager.recordMetric('agent_llm_call_error', 1, { agent: agent.name, error: err.message });
      throw new Error(`[AgentOrchestrator] LLM call failed: ${err.message}`);
    }
  }

  buildPrompt(agent, input, context) {
    let prompt = agent.promptTemplate;
    
    // Replace any template variables
    if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    return prompt;
  }

  updateAgentStats(agentName, responseTime, isError = false) {
    const agent = this.agents.get(agentName);
    if (!agent) return;

    const stats = agent.stats;
    stats.calls++;
    if (isError) stats.errors++;
    stats.lastUsed = new Date().toISOString();
    
    // Update average response time
    stats.avgResponseTime = (stats.avgResponseTime * (stats.calls - 1) + responseTime) / stats.calls;
    
    this.agentStats.set(agentName, stats);
  }

  generateCacheKey(agentName, input) {
    return `${agentName}_${JSON.stringify(input)}`;
  }

  getAgentStats(agentName) {
    return this.agentStats.get(agentName);
  }

  getAllAgentStats() {
    return Object.fromEntries(this.agentStats);
  }

  async cleanup() {
    this.cache.clear();
    this.activeChains.clear();
    this.removeAllListeners();
  }
}

module.exports = AgentOrchestrator; 