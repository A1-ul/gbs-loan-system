// GBS Enterprise Framework - DevOps Docker Container Manager
class DockerManager {
  getContainerSpecs() {
    return {
      service: 'gbs-loan-api',
      image: 'gbs-loan-system:latest',
      baseImage: 'node:20-alpine',
      exposedPorts: [5000],
      healthCheck: {
        path: '/api/v1/health',
        interval: '15s',
        timeout: '5s',
        retries: 3,
      },
      restartPolicy: 'unless-stopped',
    };
  }

  getContainerStatus() {
    return {
      status: 'UP',
      uptime: process.uptime(),
      memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      activeWorkers: 4,
    };
  }
}

module.exports = new DockerManager();
