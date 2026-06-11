import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { getRunJsonPath, getRunDir, getStoryPath } from '../../utils/paths';
import { StateManager } from '../../state/manager';
import { AuditLogger } from '../../audit/logger';

export function reportCommand(options: { run?: string }) {
  const runId = options.run || process.env.VSPOT_RUN_ID;
  if (!runId) {
    console.error(pc.red(`❌ 缺少 Run ID。请使用 --run 参数或指定 VSPOT_RUN_ID 环境变量。`));
    process.exit(2);
  }

  const runJsonPath = getRunJsonPath(runId);
  const runDir = getRunDir(runId);
  if (!fs.existsSync(runJsonPath)) {
    console.error(pc.red(`❌ 找不到运行实例记录: ${runId}`));
    process.exit(2);
  }

  const stateManager = new StateManager();
  const runState = stateManager.loadRun(runJsonPath);
  const storyPath = getStoryPath(runState.story_id);
  const story = stateManager.loadStory(storyPath);

  const logger = new AuditLogger(runDir);
  const events = logger.getEvents();

  console.log(pc.blue(`⚡ 正在生成运行环境 [${runId}] 的审计报告...`));

  // 分析事件
  const stateChanges = events.filter(e => e.type === 'state.changed');
  const commands = events.filter(e => e.type === 'command.finished');
  
  // 查找最近一次门禁校验事件以解析 Gate 结果
  const gitDiffEvent = events.reverse().find(e => e.type === 'git.diff.captured');
  const changedFiles: string[] = gitDiffEvent?.changed_files || [];
  const passedGates: string[] = gitDiffEvent?.passed_gates || [];
  const failedGates: string[] = gitDiffEvent?.failed_gates || [];

  // 构建 Markdown 内容
  const reportContent = `# VSPOT Harness 执行审计报告

## 1. 任务基本信息
- **Story ID:** \`${runState.story_id}\`
- **任务标题:** ${story.title || 'N/A'}
- **任务状态:** \`${story.status}\` (运行结束状态)
- **风险等级:** \`${story.risk?.level || 'low'}\` (原因: ${story.risk?.reasons?.join(', ') || 'N/A'})

## 2. 运行实例元数据
- **Run ID:** \`${runState.run_id}\`
- **Git 基线 Commit:** \`${runState.baseline_commit}\`
- **运行状态:** \`${runState.status}\`
- **开始时间:** \`${runState.started_at}\`
- **结束时间:** \`${runState.ended_at || 'N/A'}\`

## 3. 门禁验证结果 (Verification Gates)
| 门禁项 | 状态 | 描述 |
| :--- | :---: | :--- |
${passedGates.map(g => `| \`${g}\` | ✅ PASS | 验证通过 |`).join('\n')}
${failedGates.map(g => `| \`${g}\` | ❌ FAIL | 验证失败，请排查 |`).join('\n')}

## 4. 文件变更记录 (Git Diff)
共修改了 **${changedFiles.length}** 个文件：
${changedFiles.length === 0 ? '- *无文件修改记录*' : changedFiles.map(f => `- \`${f}\``).join('\n')}

## 5. 命令行执行历史
共执行了 **${commands.length}** 个命令：
| 执行时间 | 命令 | 退出码 | 执行结果 | 证据路径 |
| :--- | :--- | :---: | :---: | :--- |
${commands.map(c => {
  const time = new Date(c.ts).toLocaleTimeString();
  const status = c.result === 'success' ? '✅ 成功' : c.result === 'denied' ? '🚫 策略拦截' : c.result === 'approval_pending' ? '⚠ 缺少审批' : '❌ 失败';
  return `| \`${time}\` | \`${c.command}\` | \`${c.exit_code}\` | ${status} | ${c.evidence ? `[\`证据\`](${c.evidence})` : 'N/A'} |`;
}).join('\n')}

## 6. 状态迁移历史
| 变迁时间 | 源状态 | 目标状态 | 触发原因 |
| :--- | :---: | :---: | :--- |
${stateChanges.reverse().map(s => {
  const time = new Date(s.ts).toLocaleTimeString();
  return `| \`${time}\` | \`${s.from}\` | \`${s.to}\` | ${s.reason || 'N/A'} |`;
}).join('\n')}

---
*报告由 VSPOT Harness CLI 自动生成。*
`;

  const reportPath = path.join(runDir, 'report.md');
  fs.writeFileSync(reportPath, reportContent, 'utf8');

  console.log(pc.green(`✔ 审计报告生成成功: ${path.relative(process.cwd(), reportPath)}`));
}
