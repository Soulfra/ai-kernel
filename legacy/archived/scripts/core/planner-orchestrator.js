const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class PlannerOrchestrator extends EventEmitter {
  constructor(options = {}, { logger, writerOrchestrator, summarizerOrchestrator } = {}) {
    super();
    this.options = {
      logDir: options.logDir || path.join(__dirname, '../../project_meta/task_logs'),
      jsonLog: options.jsonLog || 'main_task_log.json',
      mdLog: options.mdLog || 'main_task_log.md',
      ...options
    };
    this.logger = logger;
    this.writerOrchestrator = writerOrchestrator;
    this.summarizerOrchestrator = summarizerOrchestrator;
    this.goals = [];
    this.goalIndex = new Map();
    this.initialized = false;
  }

  async initialize() {
    await fs.mkdir(this.options.logDir, { recursive: true });
    await this.loadLog();
    this.initialized = true;
    this.emit('initialized');
    if (this.logger) await this.logger.info('PlannerOrchestrator initialized');
  }

  async loadLog() {
    const jsonPath = path.join(this.options.logDir, this.options.jsonLog);
    try {
      const data = await fs.readFile(jsonPath, 'utf8');
      this.goals = JSON.parse(data);
      this.goalIndex = new Map(this.goals.map(g => [g.id, g]));
    } catch (e) {
      this.goals = [];
      this.goalIndex = new Map();
    }
  }

  async saveLog() {
    const jsonPath = path.join(this.options.logDir, this.options.jsonLog);
    const mdPath = path.join(this.options.logDir, this.options.mdLog);
    await fs.writeFile(jsonPath, JSON.stringify(this.goals, null, 2));
    await fs.writeFile(mdPath, this.generateMarkdownLog());
    if (this.writerOrchestrator) {
      await this.writerOrchestrator.enqueueOutput('doc', this.generateMarkdownLog(), { type: 'planner', timestamp: new Date().toISOString() });
    }
  }

  generateMarkdownLog() {
    let md = '# PlannerOrchestrator Task Log\n\n';
    for (const goal of this.goals) {
      md += `- [${goal.status === 'completed' ? 'x' : ' '}] **${goal.title}** (ID: ${goal.id})\n`;
      md += `  - Status: ${goal.status}\n`;
      if (goal.details) md += `  - Details: ${goal.details}\n`;
      if (goal.updatedAt) md += `  - Updated: ${goal.updatedAt}\n`;
      if (goal.history && goal.history.length > 0) {
        md += '  - History:\n';
        for (const h of goal.history) {
          md += `    - [${h.timestamp}] ${h.status}${h.details ? ': ' + h.details : ''}\n`;
        }
      }
    }
    return md;
  }

  registerGoal(goalObj) {
    const id = goalObj.id || `goal_${Date.now()}_${Math.floor(Math.random()*10000)}`;
    const goal = {
      id,
      title: goalObj.title || 'Untitled Goal',
      status: goalObj.status || 'pending',
      details: goalObj.details || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ status: goalObj.status || 'pending', timestamp: new Date().toISOString(), details: goalObj.details || '' }]
    };
    this.goals.push(goal);
    this.goalIndex.set(id, goal);
    this.emitGoalEvent('goalRegistered', goal);
    this.saveLog();
    return id;
  }

  updateGoalStatus(goalId, status, details = '') {
    const goal = this.goalIndex.get(goalId);
    if (!goal) return false;
    goal.status = status;
    goal.details = details;
    goal.updatedAt = new Date().toISOString();
    goal.history.push({ status, timestamp: goal.updatedAt, details });
    this.emitGoalEvent('goalStatusUpdated', goal);
    this.saveLog();
    return true;
  }

  getGoals(filter = {}) {
    return this.goals.filter(goal => {
      for (const key in filter) {
        if (goal[key] !== filter[key]) return false;
      }
      return true;
    });
  }

  emitGoalEvent(type, payload) {
    this.emit(type, payload);
    if (this.writerOrchestrator) {
      this.writerOrchestrator.enqueueOutput('log', `[${type}] ${JSON.stringify(payload)}`, { type: 'planner', timestamp: new Date().toISOString() });
    }
    if (this.summarizerOrchestrator) {
      this.summarizerOrchestrator.enqueueSummary('planner', payload, { type });
    }
  }

  async finalize() {
    await this.saveLog();
    this.emit('finalized');
  }

  async cleanup() {
    await this.saveLog();
    this.emit('cleanup');
  }
}

module.exports = PlannerOrchestrator; 