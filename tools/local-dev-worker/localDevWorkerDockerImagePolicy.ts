import {
  LOCAL_DEV_WORKER_DEFAULT_DOCKER_IMAGE_POLICY,
  type LocalDevWorkerDockerImagePolicy,
} from './localDevWorkerDockerContainerPolicy.ts';

export type LocalDevWorkerDockerImagePolicyDecision = 'allow' | 'deny';

export interface LocalDevWorkerDockerImagePolicyResult {
  decision: LocalDevWorkerDockerImagePolicyDecision;
  rejectionCodes: string[];
  warnings: string[];
}

const SHELL_METACHARACTERS = [';', '&&', '||', '|', '>', '<', '`', '$('];

function hasShellMetacharacter(value: string) {
  return SHELL_METACHARACTERS.some((token) => value.includes(token));
}

function hasWhitespace(value: string) {
  return /\s/.test(value);
}

function hasPrivateRegistryPrefix(image: string) {
  const firstSegment = image.split('/')[0] ?? '';

  return (
    image.includes('/') &&
    (firstSegment.includes('.') ||
      firstSegment.includes(':') ||
      firstSegment === 'localhost')
  );
}

function hasTag(image: string) {
  const lastSegment = image.split('/').pop() ?? '';

  return lastSegment.includes(':');
}

export function evaluateLocalDevWorkerDockerImagePolicy(input: {
  image: string;
  policy?: LocalDevWorkerDockerImagePolicy;
}): LocalDevWorkerDockerImagePolicyResult {
  const policy = input.policy ?? LOCAL_DEV_WORKER_DEFAULT_DOCKER_IMAGE_POLICY;
  const image = input.image.trim();
  const rejectionCodes: string[] = [];
  const warnings: string[] = [];

  if (!image || hasWhitespace(image)) {
    rejectionCodes.push('image_invalid_format');
  }

  if (hasShellMetacharacter(image)) {
    rejectionCodes.push('image_shell_metacharacter_denied');
  }

  if (image.includes('@sha256:')) {
    rejectionCodes.push('image_digest_denied');
  }

  if (!hasTag(image)) {
    rejectionCodes.push('image_untagged_denied');
  }

  if (image.endsWith(':latest')) {
    rejectionCodes.push('image_latest_tag_denied');
  }

  if (hasPrivateRegistryPrefix(image)) {
    rejectionCodes.push('image_private_registry_denied');
  }

  if (policy.blockedImages.includes(image)) {
    rejectionCodes.push('image_blocked');
  }

  if (!policy.allowedImages.includes(image)) {
    rejectionCodes.push('image_not_allowlisted');
  }

  if (policy.requirePinnedDigest) {
    warnings.push('image_digest_required_in_future');
  }

  return {
    decision: rejectionCodes.length === 0 ? 'allow' : 'deny',
    rejectionCodes:
      rejectionCodes.length === 0
        ? ['image_allowed']
        : [...new Set(rejectionCodes)],
    warnings,
  };
}

