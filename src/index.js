const { spawn } = require('child_process');
const logger = require('./utils/logger');

class ProcessManager {
  constructor() {
    this.processes = [];
  }

  spawn(name, script, args = [], env = {}) {
    logger.info(`Starting ${name}...`);

    const proc = spawn('node', [script, ...args], {
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });

    proc.on('error', (error) => {
      logger.error(`${name} error:`, error);
    });

    proc.on('exit', (code, signal) => {
      logger.warn(`${name} exited:`, { code, signal });
      
      // Restart on unexpected exit
      if (code !== 0 && code !== null) {
        logger.info(`Restarting ${name} in 5 seconds...`);
        setTimeout(() => {
          this.spawn(name, script, args, env);
        }, 5000);
      }
    });

    this.processes.push({ name, process: proc });
    return proc;
  }

  async stopAll() {
    logger.info('Stopping all processes...');
    
    for (const { name, process } of this.processes) {
      logger.info(`Stopping ${name}...`);
      process.kill('SIGTERM');
    }

    // Wait for processes to exit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function main() {
  const manager = new ProcessManager();

  logger.info('=================================');
  logger.info('IoT Data Collection System');
  logger.info('=================================');

  // Start MQTT Subscriber
  manager.spawn('MQTT Subscriber', './src/mqtt-subscriber.js');

  // Start History Workers
  const historyWorkers = parseInt(process.env.WORKER_HISTORY_INSTANCES) || 4;
  for (let i = 1; i <= historyWorkers; i++) {
    manager.spawn(
      `History Worker #${i}`,
      './src/workers/history-worker.js',
      [],
      { WORKER_ID: i }
    );
  }

  // Start Realtime Workers
  const realtimeWorkers = parseInt(process.env.WORKER_REALTIME_INSTANCES) || 2;
  for (let i = 1; i <= realtimeWorkers; i++) {
    manager.spawn(
      `Realtime Worker #${i}`,
      './src/workers/realtime-worker.js',
      [],
      { WORKER_ID: i }
    );
  }

  // Start DLQ History Worker
  manager.spawn('DLQ History Worker', './src/workers/dlq-history-worker.js');

  // Start System Monitor
  manager.spawn('System Monitor', './src/monitoring/monitor.js');

  // Start Health Dashboard
  manager.spawn('Health Dashboard', './src/dashboard/server.js');

  logger.info('=================================');
  logger.info('All services started successfully');
  logger.info('=================================');

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received, initiating graceful shutdown...`);
    await manager.stopAll();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Run main
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
