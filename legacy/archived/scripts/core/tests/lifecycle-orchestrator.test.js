const LifecycleOrchestrator = require('../lifecycle-orchestrator');
const EventEmitter = require('events');

describe('LifecycleOrchestrator', () => {
  let planner, backup, writer, telemetry, lifecycle;
  beforeEach(() => {
    planner = { logLifecycleEvent: jest.fn() };
    backup = { ensureSafeBackup: jest.fn().mockResolvedValue() };
    writer = { generateOnboardingDocs: jest.fn().mockResolvedValue() };
    telemetry = { recordEvent: jest.fn().mockResolvedValue() };
    lifecycle = new LifecycleOrchestrator({}, { plannerOrchestrator: planner, backupOrchestrator: backup, writerOrchestrator: writer, telemetryManager: telemetry });
    jest.spyOn(lifecycle, 'emit');
  });

  test('resetSystem enforces backup, generates onboarding docs, logs events, emits', async () => {
    await lifecycle.resetSystem({ from: 'immutable', dryRun: false, approval: true });
    expect(backup.ensureSafeBackup).toHaveBeenCalledWith({ scope: 'full', dryRun: false, approval: true });
    expect(writer.generateOnboardingDocs).toHaveBeenCalled();
    expect(planner.logLifecycleEvent).toHaveBeenCalledWith('reset', expect.objectContaining({ from: 'immutable', dryRun: false }));
    expect(lifecycle.emit).toHaveBeenCalledWith('reset', expect.objectContaining({ from: 'immutable', dryRun: false }));
  });

  test('reviveSystem enforces backup, generates onboarding docs, logs events, emits', async () => {
    await lifecycle.reviveSystem({ from: 'backup', backupId: 'b1', dryRun: true, approval: false });
    expect(backup.ensureSafeBackup).toHaveBeenCalledWith({ scope: 'full', dryRun: true, approval: false });
    expect(writer.generateOnboardingDocs).toHaveBeenCalled();
    expect(planner.logLifecycleEvent).toHaveBeenCalledWith('revive', expect.objectContaining({ from: 'backup', backupId: 'b1', dryRun: true }));
    expect(lifecycle.emit).toHaveBeenCalledWith('revive', expect.objectContaining({ from: 'backup', backupId: 'b1', dryRun: true }));
  });

  test('onboard generates onboarding docs, logs events, emits', async () => {
    await lifecycle.onboard({ dryRun: true });
    expect(writer.generateOnboardingDocs).toHaveBeenCalled();
    expect(planner.logLifecycleEvent).toHaveBeenCalledWith('onboard', expect.objectContaining({ dryRun: true }));
    expect(lifecycle.emit).toHaveBeenCalledWith('onboard', expect.objectContaining({ dryRun: true }));
  });

  test('resetSystem propagates errors from backup', async () => {
    backup.ensureSafeBackup.mockRejectedValue(new Error('backup failed'));
    await expect(lifecycle.resetSystem({})).rejects.toThrow('backup failed');
  });
}); 