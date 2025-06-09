const EventEmitter = require('events');
const path = require('path');
const {
  DocumentationHandler,
  TestHandler,
  MigrationHandler
} = require('./task-handlers');
const TelemetryManager = require('./telemetry-manager');

class TaskRouter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      handlers: new Map(),
      middleware: [],
      defaultHandler: null
    };
    
    // Initialize default handlers
    this.initializeDefaultHandlers();
    this.telemetryManager = new TelemetryManager();
  }

  initializeDefaultHandlers() {
    this.registerHandler('documentation', new DocumentationHandler());
    this.registerHandler('test', new TestHandler());
    this.registerHandler('migration', new MigrationHandler());
  }

  registerHandler(taskType, handler) {
    this.options.handlers.set(taskType, handler);
    handler.on('task:start', data => this.emit('task:start', data));
    handler.on('task:complete', data => this.emit('task:complete', data));
    handler.on('task:error', data => this.emit('task:error', data));
  }

  registerMiddleware(middleware) {
    this.options.middleware.push(middleware);
  }

  setDefaultHandler(handler) {
    this.options.defaultHandler = handler;
  }

  async routeTask(task) {
    const handler = this.options.handlers.get(task.type) || this.options.defaultHandler;
    if (!handler) {
      throw new Error(`No handler found for task type: ${task.type}`);
    }

    // Run middleware chain
    let context = { task };
    for (const middleware of this.options.middleware) {
      context = await middleware(context);
    }

    // Execute handler
    await this.telemetryManager.startSpan('TaskRouter.routeTask');
    const result = await handler.execute(context.task);
    this.emit('taskRouted', { task, result });
    await this.telemetryManager.endSpan('TaskRouter.routeTask');
    return result;
  }

  async validateTask(task) {
    const requiredFields = ['taskId', 'type', 'description'];
    const missingFields = requiredFields.filter(field => !task[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (!this.options.handlers.has(task.type) && !this.options.defaultHandler) {
      throw new Error(`No handler registered for task type: ${task.type}`);
    }

    await this.telemetryManager.recordMetric('task_validated', 1, { type: task.type });
  }
}

// Example middleware
const middleware = {
  logging: async (context) => {
    console.log(`Processing task: ${context.task.taskId}`);
    return context;
  },
  
  validation: async (context) => {
    // Add validation logic
    return context;
  },
  
  telemetry: async (context) => {
    // Add telemetry logic
    return context;
  }
};

module.exports = { TaskRouter, middleware }; 