const { TaskRouter, handlers, middleware } = require('../task-router');
const TaskOrchestrator = require('../task-orchestrator');
const TaskLifecycleManager = require('../task-lifecycle-manager');
const path = require('path');
const fs = require('fs').promises;

describe('Task System', () => {
  let taskRouter;
  let taskOrchestrator;
  let lifecycleManager;
  
  beforeEach(async () => {
    // Initialize components with test paths
    const testDir = path.join(__dirname, '../../test-data');
    await fs.mkdir(testDir, { recursive: true });
    
    taskRouter = new TaskRouter();
    taskOrchestrator = new TaskOrchestrator({
      taskLogPath: path.join(testDir, 'test-task-log.json'),
      finalizationPlanPath: path.join(testDir, 'test-plan.md')
    });
    lifecycleManager = new TaskLifecycleManager({
      archiveDir: path.join(testDir, 'archives'),
      contextDir: path.join(testDir, 'context')
    });
    
    // Initialize components
    await Promise.all([
      taskOrchestrator.initialize(),
      lifecycleManager.initialize()
    ]);
  });
  
  afterEach(async () => {
    // Cleanup test data
    await fs.rm(path.join(__dirname, '../../test-data'), { recursive: true, force: true });
  });
  
  describe('TaskRouter', () => {
    it('should register and execute task handlers', async () => {
      const testHandler = jest.fn().mockResolvedValue({ status: 'success' });
      taskRouter.registerHandler('test', testHandler);
      
      const task = {
        taskId: 'test_001',
        type: 'test',
        description: 'Test task'
      };
      
      const result = await taskRouter.routeTask(task);
      expect(testHandler).toHaveBeenCalledWith(task);
      expect(result.status).toBe('success');
    });
    
    it('should execute middleware chain', async () => {
      const middleware1 = jest.fn().mockImplementation(ctx => ({ ...ctx, step1: true }));
      const middleware2 = jest.fn().mockImplementation(ctx => ({ ...ctx, step2: true }));
      
      taskRouter.registerMiddleware(middleware1);
      taskRouter.registerMiddleware(middleware2);
      
      const task = {
        taskId: 'test_002',
        type: 'test',
        description: 'Test task'
      };
      
      await taskRouter.routeTask(task);
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
    });
  });
  
  describe('TaskLifecycleManager', () => {
    it('should archive completed tasks', async () => {
      const task = {
        taskId: 'test_003',
        description: 'Test task',
        status: 'completed'
      };
      
      const archive = await lifecycleManager.archiveTask(task, 'test completion');
      expect(archive.task).toEqual(task);
      expect(archive.reason).toBe('test completion');
    });
    
    it('should maintain task context', async () => {
      const context = {
        type: 'test_context',
        data: { key: 'value' }
      };
      
      const contextId = await lifecycleManager.addContext(context);
      expect(contextId).toBeDefined();
      
      const relevantContext = lifecycleManager.getRelevantContext({
        taskId: 'test_004',
        tags: ['test']
      });
      expect(relevantContext).toBeDefined();
    });
  });
  
  describe('TaskOrchestrator', () => {
    it('should process tasks in order', async () => {
      const tasks = [
        {
          taskId: 'test_005',
          description: 'Test task 1',
          status: 'planned',
          priority: 'high'
        },
        {
          taskId: 'test_006',
          description: 'Test task 2',
          status: 'planned',
          priority: 'medium'
        }
      ];
      
      // Add tasks to orchestrator
      for (const task of tasks) {
        await taskOrchestrator.createTask(task.description, {
          priority: task.priority
        });
      }
      
      // Get tasks to process
      const tasksToProcess = await taskOrchestrator.getTasks({
        status: ['planned']
      });
      
      expect(tasksToProcess.length).toBe(2);
      expect(tasksToProcess[0].priority).toBe('high');
    });
  });
}); 