import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';

export type StoryStatus =
  | 'DRAFT'
  | 'READY'
  | 'IN_PROGRESS'
  | 'CODE_COMPLETE'
  | 'APPROVAL_PENDING'
  | 'VERIFYING'
  | 'FIXING'
  | 'READY_FOR_REVIEW'
  | 'REVIEW_FAILED'
  | 'APPROVED'
  | 'DONE'
  | 'BLOCKED';

export interface StoryState {
  story_id: string;
  title?: string;
  status: StoryStatus;
  acceptance_criteria?: string[];
  technical_context?: string;
  scope?: {
    include?: string[];
    exclude?: string[];
  };
  risk?: {
    level?: 'low' | 'medium' | 'high' | 'critical';
    reasons?: string[];
  };
  created_at?: string;
  updated_at?: string;
}

export interface RunState {
  run_id: string;
  story_id: string;
  baseline_commit: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  started_at: string;
  ended_at?: string;
}

const ALLOWED_TRANSITIONS: Record<StoryStatus, StoryStatus[]> = {
  DRAFT: ['READY'],
  READY: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['CODE_COMPLETE', 'BLOCKED', 'APPROVAL_PENDING'],
  APPROVAL_PENDING: ['IN_PROGRESS', 'BLOCKED'],
  CODE_COMPLETE: ['VERIFYING'],
  VERIFYING: ['READY_FOR_REVIEW', 'FIXING', 'BLOCKED'],
  FIXING: ['VERIFYING', 'APPROVAL_PENDING', 'BLOCKED'],
  READY_FOR_REVIEW: ['APPROVED', 'REVIEW_FAILED'],
  REVIEW_FAILED: ['FIXING'],
  APPROVED: ['DONE'],
  BLOCKED: ['READY', 'IN_PROGRESS', 'FIXING', 'APPROVAL_PENDING'],
  DONE: []
};

export class StateManager {
  private ajv: Ajv;
  private storySchema: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    
    // 加载 story schema
    const schemaPath = path.resolve(__dirname, '../../schemas/story.schema.json');
    if (fs.existsSync(schemaPath)) {
      this.storySchema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    }
  }

  /**
   * 加载并校验 story.yaml
   */
  public loadStory(storyPath: string): StoryState {
    if (!fs.existsSync(storyPath)) {
      throw new Error(`Story 状态文件不存在: ${storyPath}`);
    }

    const content = fs.readFileSync(storyPath, 'utf8');
    const parsed = yaml.load(content) as any;

    if (this.storySchema) {
      const validate = this.ajv.compile(this.storySchema);
      const valid = validate(parsed);
      if (!valid) {
        const errors = validate.errors
          ? validate.errors.map(e => `${e.instancePath} ${e.message}`).join(', ')
          : '未知 Schema 错误';
        throw new Error(`Story 文件格式错误: ${errors}`);
      }
    }

    return parsed as StoryState;
  }

  /**
   * 保存 story.yaml
   */
  public saveStory(storyPath: string, story: StoryState): void {
    story.updated_at = new Date().toISOString();
    
    // 校验
    if (this.storySchema) {
      const validate = this.ajv.compile(this.storySchema);
      const valid = validate(story);
      if (!valid) {
        const errors = validate.errors
          ? validate.errors.map(e => `${e.instancePath} ${e.message}`).join(', ')
          : '未知 Schema 错误';
        throw new Error(`保存失败，Story 不符合 Schema 规范: ${errors}`);
      }
    }

    const dir = path.dirname(storyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = yaml.dump(story);
    fs.writeFileSync(storyPath, content, 'utf8');
  }

  /**
   * 变更 Story 状态并验证合法性
   */
  public transitionStoryStatus(storyPath: string, targetStatus: StoryStatus): StoryState {
    const story = this.loadStory(storyPath);
    const currentStatus = story.status;

    if (currentStatus === targetStatus) {
      return story;
    }

    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    // 允许任何状态跳到 BLOCKED
    if (targetStatus !== 'BLOCKED' && !allowed.includes(targetStatus)) {
      throw new Error(`非法的状态转换：不允许从 [${currentStatus}] 转换为 [${targetStatus}]`);
    }

    story.status = targetStatus;
    this.saveStory(storyPath, story);
    return story;
  }

  /**
   * 读取 run.json
   */
  public loadRun(runJsonPath: string): RunState {
    if (!fs.existsSync(runJsonPath)) {
      throw new Error(`Run 记录不存在: ${runJsonPath}`);
    }
    const content = fs.readFileSync(runJsonPath, 'utf8');
    return JSON.parse(content) as RunState;
  }

  /**
   * 保存 run.json
   */
  public saveRun(runJsonPath: string, runState: RunState): void {
    const dir = path.dirname(runJsonPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(runJsonPath, JSON.stringify(runState, null, 2), 'utf8');
  }
}
