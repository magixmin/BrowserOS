import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CaptureContext } from '../src/capture/context'
import type { AgentContext } from '../src/agents/types'
import type { EvalConfig, Message, Task, TaskMetadata } from '../src/types'

export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aMcAAAAASUVORK5CYII='

export const DEFAULT_PAGE = {
  pageId: 1,
  targetId: 'target-1',
  tabId: 101,
  url: 'about:blank',
  title: 'Blank Page',
  isActive: true,
  isLoading: false,
  loadProgress: 100,
  isPinned: false,
  isHidden: false,
  windowId: 1,
  index: 0,
}

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    query_id: 'task-1',
    dataset: 'test-dataset',
    query: 'Open example.com and describe it',
    graders: [],
    metadata: {
      original_task_id: 'original-task-1',
    },
    ...overrides,
  }
}

export function createSingleEvalConfig(): EvalConfig {
  return {
    agent: {
      type: 'single',
      provider: 'openai',
      model: 'fake-model',
      apiKey: 'FAKE_KEY',
      supportsImages: true,
    },
    dataset: 'test-dataset',
    num_workers: 1,
    restart_server_per_task: false,
    browseros: {
      server_url: 'http://127.0.0.1:9110',
      base_cdp_port: 9010,
      base_server_port: 9110,
      base_extension_port: 9310,
      load_extensions: false,
      headless: true,
    },
    timeout_ms: 30_000,
  }
}

export function createOrchestratorEvalConfig(): EvalConfig {
  return {
    agent: {
      type: 'orchestrator-executor',
      orchestrator: {
        provider: 'openai',
        model: 'fake-orchestrator',
        apiKey: 'FAKE_KEY',
        maxTurns: 5,
      },
      executor: {
        provider: 'openai',
        model: 'fake-executor',
        apiKey: 'FAKE_KEY',
      },
    },
    dataset: 'test-dataset',
    num_workers: 1,
    restart_server_per_task: false,
    browseros: {
      server_url: 'http://127.0.0.1:9110',
      base_cdp_port: 9010,
      base_server_port: 9110,
      base_extension_port: 9310,
      load_extensions: false,
      headless: true,
    },
    timeout_ms: 30_000,
  }
}

export async function createOutputDir(prefix = 'browseros-eval-test-') {
  return mkdtemp(join(tmpdir(), prefix))
}

export async function cleanupOutputDir(outputDir: string | null): Promise<void> {
  if (!outputDir) return
  await rm(outputDir, { recursive: true, force: true })
}

export async function createAgentContext(
  config: EvalConfig,
  task: Task,
  outputDir: string,
): Promise<AgentContext> {
  const { capture, taskOutputDir } = await CaptureContext.create({
    serverUrl: config.browseros.server_url,
    outputDir,
    taskId: task.query_id,
    initialPageId: 1,
  })

  return {
    config,
    task,
    initialPageId: 1,
    outputDir,
    taskOutputDir,
    capture,
  }
}

export async function readMessages(taskOutputDir: string): Promise<Message[]> {
  const content = await readFile(join(taskOutputDir, 'messages.jsonl'), 'utf-8')
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Message)
}

export async function readMetadata(
  taskOutputDir: string,
): Promise<TaskMetadata> {
  const content = await readFile(join(taskOutputDir, 'metadata.json'), 'utf-8')
  return JSON.parse(content) as TaskMetadata
}

export async function screenshotExists(
  taskOutputDir: string,
  screenshotNumber: number,
): Promise<boolean> {
  try {
    await access(join(taskOutputDir, 'screenshots', `${screenshotNumber}.png`))
    return true
  } catch {
    return false
  }
}
