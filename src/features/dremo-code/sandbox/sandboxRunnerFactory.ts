import { DockerLocalDevSandboxRunner } from './dockerLocalDevSandboxRunner';
import { localDevSandboxConfig } from './localDevSandboxConfig';
import { DremoNoopSandboxRunner } from './sandboxRunner';
import type { DremoLocalDevSandboxConfig } from './localDevSandboxConfig';
import type {
  DremoSandboxProvider,
  DremoSandboxRunner,
} from './sandboxRunner';

export interface CreateDremoSandboxRunnerOptions {
  localDevConfig?: DremoLocalDevSandboxConfig;
}

export class DremoSandboxRunnerFactoryError extends Error {
  constructor(provider: string) {
    super(`Unsupported Dremo sandbox provider: ${provider}`);
    this.name = 'DremoSandboxRunnerFactoryError';
  }
}

export function createDremoSandboxRunner(
  provider: DremoSandboxProvider,
  options: CreateDremoSandboxRunnerOptions = {},
): DremoSandboxRunner {
  switch (provider) {
    case 'stub':
      return new DremoNoopSandboxRunner();
    case 'docker-local-dev':
      return new DockerLocalDevSandboxRunner(
        options.localDevConfig ?? localDevSandboxConfig,
      );
    case 'e2b':
    case 'daytona':
    case 'worker-pool':
      throw new DremoSandboxRunnerFactoryError(provider);
  }
}
