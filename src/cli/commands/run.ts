import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import pc from 'picocolors';
import { getStoryPath, getRunDir, getRunJsonPath, getStoriesDir } from '../../utils/paths';
import { StateManager, StoryState, RunState } from '../../state/manager';
import { AuditLogger } from '../../audit/logger';

function getGitCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch (e) {
    return 'none';
  }
}

export function runStartCommand(storyId: string) {
  const storyPath = getStoryPath(storyId);
  const stateManager = new StateManager();

  console.log(pc.blue(`⚡ 正在为 Story [${storyId}] 启动运行环境...`));

  let story: StoryState = {} as any;

  // 1. 加载或创建 story.yaml
  if (!fs.existsSync(storyPath)) {
    console.log(pc.yellow(`⚠ 未找到 Story 配置文件: ${path.relative(process.cwd(), storyPath)}`));
    console.log(pc.blue(`正在为您自动生成模板 Story 文件...`));
    
    story = {
      story_id: storyId,
      title: `Story ${storyId}`,
      status: 'READY',
      acceptance_criteria: ['待填写验收标准...'],
      scope: {
        include: ['src/**/*'],
        exclude: []
      },
      risk: {
        level: 'low',
        reasons: ['默认低风险']
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    stateManager.saveStory(storyPath, story);
    console.log(pc.green(`✔ 已生成 Story 模板，请检查并配置范围(scope): ${path.relative(process.cwd(), storyPath)}`));
  } else {
    try {
      story = stateManager.loadStory(storyPath);
      console.log(pc.green(`✔ 已成功加载 Story: ${story.title || storyId}`));
    } catch (err: any) {
      console.error(pc.red(`❌ 加载 Story 失败: ${err.message}`));
      process.exit(2);
    }
  }

  // 2. 检查当前状态是否可变更为 IN_PROGRESS
  try {
    stateManager.transitionStoryStatus(storyPath, 'IN_PROGRESS');
    console.log(pc.green(`✔ Story 状态已成功切换为: IN_PROGRESS`));
  } catch (err: any) {
    console.error(pc.red(`❌ 状态跳转错误: ${err.message}`));
    process.exit(2);
  }

  // 3. 生成 run_id
  const dateStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHmmss
  const runId = `run-${dateStr}`;
  const runDir = getRunDir(runId);
  const runJsonPath = getRunJsonPath(runId);

  // 4. 获取 Git 基线
  const baselineCommit = getGitCommit();
  if (baselineCommit === 'none') {
    console.log(pc.yellow(`⚠ 未检测到 Git 仓库或暂无 Commit，基线标记为 "none"`));
  } else {
    console.log(pc.green(`✔ 当前 Git 基线 Commit: ${baselineCommit}`));
  }

  // 5. 保存 run.json
  const runState: RunState = {
    run_id: runId,
    story_id: storyId,
    baseline_commit: baselineCommit,
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString()
  };

  stateManager.saveRun(runJsonPath, runState);
  console.log(pc.green(`✔ 已创建运行记录: ${path.relative(process.cwd(), runJsonPath)}`));

  // 6. 初始化事件审计日志
  const logger = new AuditLogger(runDir);
  logger.logEvent('run.started', {
    run_id: runId,
    story_id: storyId,
    baseline_commit: baselineCommit
  });

  logger.logEvent('state.changed', {
    story_id: storyId,
    from: story.status,
    to: 'IN_PROGRESS',
    reason: 'CLI run start'
  });

  console.log(pc.cyan(`\n🎉 运行环境启动成功！`));
  console.log(pc.white(`请在后续的命令中使用以下环境变量或参数指定此 Run ID：`));
  console.log(pc.yellow(`  VSPOT_RUN_ID=${runId}`));
  console.log(pc.white(`或者直接传递给命令行参数 --run ${runId}`));
}
