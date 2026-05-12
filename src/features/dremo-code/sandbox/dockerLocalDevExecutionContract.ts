import type {
  DremoSandboxCommandRequest,
  DremoSandboxCommandResult,
} from './sandboxRunner';

export const DOCKER_LOCAL_DEV_EXECUTION_CONTRACT = {
  status: 'deferred',
  browserBundleSafe: true,
  noProcessApiImports: true,
  requiredRuntime: 'separate-node-or-worker-process',
  fixedImage: 'node:22-alpine',
  networkMode: 'none',
  readOnlyFilesystem: true,
  noVolumeMounts: true,
  noDockerSocketMount: true,
  noHomeMount: true,
  noSecretInjection: true,
} as const;

export interface DockerLocalDevExecutionRequest {
  request: DremoSandboxCommandRequest;
  image: typeof DOCKER_LOCAL_DEV_EXECUTION_CONTRACT.fixedImage;
  networkMode: typeof DOCKER_LOCAL_DEV_EXECUTION_CONTRACT.networkMode;
  readOnlyFilesystem: true;
  noVolumeMounts: true;
  noDockerSocketMount: true;
  noHomeMount: true;
  noSecretInjection: true;
}

export interface DockerLocalDevExecutionAdapter {
  execute(
    request: DockerLocalDevExecutionRequest,
  ): Promise<DremoSandboxCommandResult>;
}
