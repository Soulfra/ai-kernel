const fs = require('fs');
const path = require('path');
const DocumentationOrchestrator = require('./documentation-orchestrator');

class TaskManager {
    constructor(rootDir) {
        this.rootDir = rootDir;
        this.taskLogPath = path.join(rootDir, 'project_meta/task_logs/documentation_tasks.json');
        this.orchestrator = new DocumentationOrchestrator(rootDir);
        this.tasks = this.loadTasks();
    }

    loadTasks() {
        try {
            const data = fs.readFileSync(this.taskLogPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading tasks:', error);
            return {
                metadata: {
                    version: '1.0.0',
                    lastUpdated: new Date().toISOString(),
                    totalTasks: 0,
                    completedTasks: 0,
                    activeTasks: 0
                },
                tasks: []
            };
        }
    }

    saveTasks() {
        try {
            this.updateMetadata();
            fs.writeFileSync(this.taskLogPath, JSON.stringify(this.tasks, null, 2));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    updateMetadata() {
        const metadata = this.tasks.metadata;
        metadata.lastUpdated = new Date().toISOString();
        metadata.totalTasks = this.tasks.tasks.length;
        metadata.completedTasks = this.tasks.tasks.filter(task => task.status === 'completed').length;
        metadata.activeTasks = this.tasks.tasks.filter(task => task.status === 'in-progress').length;
    }

    async createTask(task) {
        const taskId = `doc_${String(this.tasks.metadata.totalTasks + 1).padStart(3, '0')}`;
        const newTask = {
            taskId,
            ...task,
            status: 'planned',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            progress: 0,
            dependencies: task.dependencies || [],
            subtasks: task.subtasks || [],
            notes: []
        };

        this.tasks.tasks.push(newTask);
        this.tasks.metadata.totalTasks++;
        this.tasks.metadata.lastUpdated = new Date().toISOString();
        await this.saveTasks();

        return taskId;
    }

    async updateTask(taskId, updates) {
        const task = this.tasks.tasks.find(t => t.taskId === taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);

        Object.assign(task, updates, { lastUpdated: new Date().toISOString() });
        await this.saveTasks();

        return task;
    }

    async addSubtask(taskId, subtask) {
        const task = this.tasks.tasks.find(t => t.taskId === taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);

        const subtaskId = `${taskId}_${String(task.subtasks.length + 1).padStart(2, '0')}`;
        const newSubtask = {
            subtaskId,
            ...subtask,
            status: 'planned',
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            progress: 0
        };

        task.subtasks.push(newSubtask);
        await this.saveTasks();

        return subtaskId;
    }

    async addNote(taskId, note) {
        const task = this.tasks.tasks.find(t => t.taskId === taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);

        task.notes.push({
            timestamp: new Date().toISOString(),
            content: note
        });

        await this.saveTasks();
    }

    async updateProgress(taskId, progress) {
        const task = this.tasks.tasks.find(t => t.taskId === taskId);
        if (!task) throw new Error(`Task ${taskId} not found`);

        task.progress = progress;
        if (progress === 100) {
            task.status = 'completed';
            this.tasks.metadata.completedTasks++;
        }

        await this.saveTasks();
    }

    async generateTasksFromAnalysis() {
        const analysis = await this.orchestrator.orchestrate();
        
        // Create tasks for each gap
        for (const gap of analysis.coverage.details.gaps) {
            await this.createTask({
                type: 'documentation',
                category: gap.type,
                name: gap.name,
                description: gap.recommendation,
                priority: 'high',
                estimatedEffort: 'medium',
                dependencies: [],
                subtasks: [
                    {
                        description: 'Analyze current documentation',
                        estimatedEffort: 'small'
                    },
                    {
                        description: 'Create enhancement plan',
                        estimatedEffort: 'small'
                    },
                    {
                        description: 'Implement documentation updates',
                        estimatedEffort: 'medium'
                    },
                    {
                        description: 'Review and validate changes',
                        estimatedEffort: 'small'
                    }
                ]
            });
        }

        // Create tasks for quality improvements
        if (analysis.quality.readability.score < 0.8) {
            await this.createTask({
                type: 'quality',
                category: 'readability',
                name: 'Improve Documentation Readability',
                description: 'Enhance overall documentation readability',
                priority: 'medium',
                estimatedEffort: 'large',
                dependencies: [],
                subtasks: [
                    {
                        description: 'Review current writing style',
                        estimatedEffort: 'small'
                    },
                    {
                        description: 'Create style guide',
                        estimatedEffort: 'medium'
                    },
                    {
                        description: 'Apply style improvements',
                        estimatedEffort: 'large'
                    }
                ]
            });
        }

        // Create tasks for structure improvements
        if (analysis.structure.hierarchy.depth > 4) {
            await this.createTask({
                type: 'structure',
                category: 'hierarchy',
                name: 'Optimize Documentation Structure',
                description: 'Reduce documentation hierarchy depth',
                priority: 'medium',
                estimatedEffort: 'large',
                dependencies: [],
                subtasks: [
                    {
                        description: 'Analyze current structure',
                        estimatedEffort: 'small'
                    },
                    {
                        description: 'Design new structure',
                        estimatedEffort: 'medium'
                    },
                    {
                        description: 'Implement restructuring',
                        estimatedEffort: 'large'
                    }
                ]
            });
        }
    }

    async generateTaskReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTasks: this.tasks.metadata.totalTasks,
                completedTasks: this.tasks.metadata.completedTasks,
                activeTasks: this.tasks.metadata.activeTasks,
                plannedTasks: this.tasks.tasks.filter(t => t.status === 'planned').length
            },
            byType: {},
            byCategory: {},
            byPriority: {},
            nextTasks: this.tasks.tasks
                .filter(t => t.status === 'planned')
                .filter(t => {
                    if (!t.dependencies || t.dependencies.length === 0) return true;
                    return t.dependencies.every(depId => {
                        const depTask = this.tasks.tasks.find(dt => dt.taskId === depId);
                        return depTask && depTask.status === 'completed';
                    });
                })
                .map(t => ({
                    taskId: t.taskId,
                    name: t.name,
                    description: t.description,
                    priority: t.priority
                }))
        };

        // Aggregate by type
        this.tasks.tasks.forEach(task => {
            if (!report.byType[task.type]) {
                report.byType[task.type] = {
                    total: 0,
                    completed: 0,
                    active: 0
                };
            }
            report.byType[task.type].total++;
            if (task.status === 'completed') report.byType[task.type].completed++;
            if (task.status === 'in-progress') report.byType[task.type].active++;
        });

        // Aggregate by category
        this.tasks.tasks.forEach(task => {
            if (!report.byCategory[task.category]) {
                report.byCategory[task.category] = {
                    total: 0,
                    completed: 0,
                    active: 0
                };
            }
            report.byCategory[task.category].total++;
            if (task.status === 'completed') report.byCategory[task.category].completed++;
            if (task.status === 'in-progress') report.byCategory[task.category].active++;
        });

        // Aggregate by priority
        this.tasks.tasks.forEach(task => {
            if (!report.byPriority[task.priority]) {
                report.byPriority[task.priority] = {
                    total: 0,
                    completed: 0,
                    active: 0
                };
            }
            report.byPriority[task.priority].total++;
            if (task.status === 'completed') report.byPriority[task.priority].completed++;
            if (task.status === 'in-progress') report.byPriority[task.priority].active++;
        });

        return report;
    }

    async saveTaskReport() {
        const report = await this.generateTaskReport();
        const reportPath = path.join(
            path.dirname(this.taskLogPath),
            'reports',
            `task-report-${new Date().toISOString().split('T')[0]}.json`
        );
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }
}

// Export the class
module.exports = TaskManager;

// If run directly
if (require.main === module) {
    const taskManager = new TaskManager(process.cwd());
    taskManager.generateTasksFromAnalysis()
        .then(() => taskManager.saveTaskReport())
        .then(() => console.log('Task generation and report complete!'))
        .catch(error => console.error('Error:', error));
} 