// GBS Enterprise Framework - DevOps Kubernetes Orchestration
class KubernetesManager {
  getClusterSpecs() {
    return {
      clusterName: 'gbs-enterprise-k8s',
      namespace: 'production',
      deployments: [
        { name: 'gbs-loan-api-deployment', replicas: 3, strategy: 'RollingUpdate' },
        { name: 'gbs-loan-frontend-deployment', replicas: 2, strategy: 'RollingUpdate' },
        { name: 'gbs-worker-supervisor', replicas: 2, strategy: 'Recreate' },
      ],
      ingress: {
        host: 'loans.gbs.local',
        tlsEnabled: true,
        rateLimitAnnotations: 'nginx.ingress.kubernetes.io/limit-rps: "100"',
      },
    };
  }
}

module.exports = new KubernetesManager();
