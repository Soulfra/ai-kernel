const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuthManager {
  constructor(options = {}) {
    this.options = {
      dataDir: path.join(process.cwd(), 'data', 'auth'),
      ...options
    };
  }

  async initialize() {
    await fs.mkdir(this.options.dataDir, { recursive: true });
  }

  generateUUID() {
    return crypto.randomUUID();
  }

  async createUser(preferences = {}) {
    const userId = this.generateUUID();
    const userData = {
      id: userId,
      created: new Date().toISOString(),
      preferences: {
        tone: preferences.tone || 'neutral',
        style: preferences.style || 'default',
        ...preferences
      },
      metadata: {
        lastLogin: new Date().toISOString(),
        projectCount: 0
      }
    };

    await this.saveUserData(userId, userData);
    return userId;
  }

  async createProject(userId, projectName) {
    const projectId = this.generateUUID();
    const projectData = {
      id: projectId,
      name: projectName,
      created: new Date().toISOString(),
      owner: userId,
      metadata: {
        lastUpdated: new Date().toISOString(),
        interactionCount: 0
      }
    };

    await this.saveProjectData(projectId, projectData);
    await this.updateUserProjectCount(userId);
    return projectId;
  }

  async saveUserData(userId, data) {
    const filePath = path.join(this.options.dataDir, 'users', `${userId}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async saveProjectData(projectId, data) {
    const filePath = path.join(this.options.dataDir, 'projects', `${projectId}.json`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async getUserData(userId) {
    const filePath = path.join(this.options.dataDir, 'users', `${userId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async getProjectData(projectId) {
    const filePath = path.join(this.options.dataDir, 'projects', `${projectId}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async updateUserProjectCount(userId) {
    const userData = await this.getUserData(userId);
    if (userData) {
      userData.metadata.projectCount++;
      await this.saveUserData(userId, userData);
    }
  }

  async updateUserPreferences(userId, preferences) {
    const userData = await this.getUserData(userId);
    if (userData) {
      userData.preferences = { ...userData.preferences, ...preferences };
      await this.saveUserData(userId, userData);
    }
  }

  async logInteraction(projectId, interaction) {
    const projectData = await this.getProjectData(projectId);
    if (projectData) {
      projectData.metadata.interactionCount++;
      projectData.metadata.lastUpdated = new Date().toISOString();
      await this.saveProjectData(projectId, projectData);
    }
  }
}

module.exports = AuthManager; 