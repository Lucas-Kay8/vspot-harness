import * as path from 'path';

export function getHarnessDir(): string {
  return path.join(process.cwd(), '.vspotharness');
}

export function getConfigPath(): string {
  return path.join(getHarnessDir(), 'config.yaml');
}

export function getStoriesDir(): string {
  return path.join(getHarnessDir(), 'stories');
}

export function getStoryPath(storyId: string): string {
  return path.join(getStoriesDir(), storyId, 'story.yaml');
}

export function getRunsDir(): string {
  return path.join(getHarnessDir(), 'runs');
}

export function getRunDir(runId: string): string {
  return path.join(getRunsDir(), runId);
}

export function getRunJsonPath(runId: string): string {
  return path.join(getRunDir(runId), 'run.json');
}

export function getApprovalsDir(): string {
  return path.join(getHarnessDir(), 'approvals');
}
