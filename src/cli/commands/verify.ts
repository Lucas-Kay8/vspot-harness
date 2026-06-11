import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import pc from 'picocolors';
import { minimatch } from 'minimatch';
import { getRunJsonPath, getRunDir, getStoryPath, getConfigPath, getApprovalsDir } from '../../utils/paths';
import { StateManager, StoryStatus } from '../../state/manager';
import { AuditLogger, AuditEvent } from '../../audit/logger';
import { PolicyEngine } from '../../policy/engine';

interface GateResult {
  name: string;
  passed: boolean;
  status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  message: string;
}

function getChangedFiles(baselineCommit: string): string[] {
  try {
    let cmd = 'git diff --name-only';
    if (baselineCommit && baselineCommit !== 'none') {
      cmd = `git diff --name-only ${baselineCommit}`;
    }
    const output = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (!output) return [];
    return output.split('\n').map((f: string) => f.trim()).filter(Boolean);
  } catch (e) {
    try {
      const output = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (!output) return [];
      return output
        .split('\n')
        .map((line: string) => line.substring(3).trim())
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }
}

function hasValidApprovalForFile(approvalsDir: string, storyId: string, runId: string, filePath: string): boolean {
  if (!fs.existsSync(approvalsDir)) return false;
  const files = fs.readdirSync(approvalsDir);
  const now = new Date();

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const p = path.join(approvalsDir, file);
      const approval = JSON.parse(fs.readFileSync(p, 'utf8'));

      if (approval.story_id !== storyId) continue;
      if (approval.run_id && approval.run_id !== runId) continue;
      if (approval.decision !== 'approved' && approval.decision !== 'approved_with_changes') continue;
      if (approval.expires_at && new Date(approval.expires_at) < now) continue;

      if (approval.resources && Array.isArray(approval.resources)) {
        for (const pattern of approval.resources) {
          if (minimatch(filePath, pattern, { dot: true }) || pattern === '*') {
            return true;
          }
        }
      }
    } catch (e) {
      // 忽略损坏文件
    }
  }
  return false;
}

export function verifyCommand(options: { run?: string; ci?: boolean }) {
  const runId = options.run || process.env.VSPOT_RUN_ID;
  const isCi = options.ci || false;

  // 自定义 CI 无 ANSI 颜色的格式封装
  const colorGreen = (s: string) => isCi ? s : pc.green(s);
  const colorRed = (s: string) => isCi ? s : pc.red(s);
  const colorBlue = (s: string) => isCi ? s : pc.blue(s);
  const colorGray = (s: string) => isCi ? s : pc.gray(s);
  const colorWhite = (s: string) => isCi ? s : pc.white(s);
  const colorBold = (s: string) => isCi ? s : pc.bold(s);

  if (!runId) {
    console.error(colorRed(`❌ 缺少 Run ID。请使用 --run 参数或指定 VSPOT_RUN_ID 环境变量。`));
    process.exit(2);
  }

  const runJsonPath = getRunJsonPath(runId);
  const runDir = getRunDir(runId);
  if (!fs.existsSync(runJsonPath)) {
    console.error(colorRed(`❌ 找不到运行实例记录: ${runId}`));
    process.exit(2);
  }

  const stateManager = new StateManager();
  const runState = stateManager.loadRun(runJsonPath);
  const storyPath = getStoryPath(runState.story_id);
  const story = stateManager.loadStory(storyPath);

  const configPath = getConfigPath();
  const approvalsDir = getApprovalsDir();
  const logger = new AuditLogger(runDir);

  let policyEngine: PolicyEngine | null = null;
  if (fs.existsSync(configPath)) {
    try {
      policyEngine = new PolicyEngine(configPath);
    } catch (e) {}
  }

  // 状态转移到 VERIFYING
  try {
    stateManager.transitionStoryStatus(storyPath, 'VERIFYING');
    logger.logEvent('state.changed', {
      story_id: runState.story_id,
      from: story.status,
      to: 'VERIFYING',
      reason: 'CLI verify command'
    });
  } catch (err: any) {
    // 忽略非致命状态跳转错误
  }

  console.log(colorBlue(`⚡ 正在评估运行环境 [${runId}] 的安全与质量门禁 (Verification Gates)...`));

  const changedFiles = getChangedFiles(runState.baseline_commit);
  const events = logger.getEvents();
  const requiredGates = policyEngine?.getPolicy().gates?.required || ['scope', 'permissions', 'tests', 'build', 'approvals', 'audit'];
  
  const gateResults: GateResult[] = [];

  // 1. scope 门禁
  if (requiredGates.includes('scope')) {
    let passed = true;
    let message = '所有修改的文件均在 Story 允许的 scope 内。';
    const violations: string[] = [];

    if (story.scope) {
      const includePatterns = story.scope.include || [];
      const excludePatterns = story.scope.exclude || [];

      for (const file of changedFiles) {
        if (file.startsWith('.vspotharness/')) continue;

        let included = includePatterns.length === 0;
        for (const pattern of includePatterns) {
          if (minimatch(file, pattern, { dot: true })) {
            included = true;
            break;
          }
        }

        let excluded = false;
        for (const pattern of excludePatterns) {
          if (minimatch(file, pattern, { dot: true })) {
            excluded = true;
            break;
          }
        }

        if (!included || excluded) {
          violations.push(file);
          passed = false;
        }
      }
    }

    if (!passed) {
      message = `检测到变更超出了 Story 的范围（scope）。异常文件:\n    ` + violations.slice(0, 5).join('\n    ') + (violations.length > 5 ? ` ...等共 ${violations.length} 个文件` : '');
    }

    gateResults.push({
      name: 'scope',
      passed,
      status: passed ? 'PASS' : 'FAIL',
      message
    });
  }

  // 2. permissions 门禁
  if (requiredGates.includes('permissions')) {
    let passed = true;
    let message = '所有文件修改策略判定通过。';
    const violations: string[] = [];

    if (policyEngine) {
      for (const file of changedFiles) {
        if (file.startsWith('.vspotharness/')) continue;

        const accessResult = policyEngine.evaluateFileAccess(file, 'write');
        if (accessResult.decision === 'deny') {
          violations.push(`${file} (策略禁止)`);
          passed = false;
        } else if (accessResult.decision === 'require_approval') {
          const approved = hasValidApprovalForFile(approvalsDir, runState.story_id, runId, file);
          if (!approved) {
            violations.push(`${file} (缺少人工审批)`);
            passed = false;
          }
        }
      }
    }

    if (!passed) {
      message = `修改敏感路径未获得授权。未获批的文件变动:\n    ` + violations.join('\n    ');
    }

    gateResults.push({
      name: 'permissions',
      passed,
      status: passed ? 'PASS' : 'FAIL',
      message
    });
  }

  // 3. tests 门禁
  if (requiredGates.includes('tests')) {
    let passed = false;
    let message = '未检测到成功运行的测试记录。';

    const testFinishedEvents = events.filter(e => 
      e.type === 'command.finished' && 
      e.exit_code === 0 && 
      (e.command && (e.command.includes('test') || e.command.includes('jest') || e.command.includes('vitest')))
    );

    if (testFinishedEvents.length > 0) {
      passed = true;
      message = `检测到已成功运行测试命令: "${testFinishedEvents[0].command}"`;
    }

    gateResults.push({
      name: 'tests',
      passed,
      status: passed ? 'PASS' : 'FAIL',
      message
    });
  }

  // 4. build 门禁
  if (requiredGates.includes('build')) {
    let passed = false;
    let message = '未检测到成功运行的项目构建记录。';

    const buildFinishedEvents = events.filter(e => 
      e.type === 'command.finished' && 
      e.exit_code === 0 && 
      (e.command && e.command.includes('build'))
    );

    if (buildFinishedEvents.length > 0) {
      passed = true;
      message = `检测到已成功运行构建命令: "${buildFinishedEvents[0].command}"`;
    }

    gateResults.push({
      name: 'build',
      passed,
      status: passed ? 'PASS' : 'FAIL',
      message
    });
  }

  // 5. approvals 门禁
  if (requiredGates.includes('approvals')) {
    let passed = true;
    let message = '未发现越权执行命令的情况，所有敏感命令均已获得审批。';
    const unauthorizedCommands: string[] = [];

    if (policyEngine) {
      const execEvents = events.filter(e => e.type === 'command.finished' && e.result !== 'denied');
      for (const evt of execEvents) {
        const cmdDecision = policyEngine.evaluateCommand(evt.command || '');
        if (cmdDecision.decision === 'require_approval') {
          if (evt.result === 'approval_pending') {
            unauthorizedCommands.push(`[拦截] ${evt.command}`);
            passed = false;
          }
        }
      }
    }

    if (!passed) {
      message = `检测到越权或被拦截的敏感命令:\n    ` + unauthorizedCommands.join('\n    ');
    }

    gateResults.push({
      name: 'approvals',
      passed,
      status: passed ? 'PASS' : 'FAIL',
      message
    });
  }

  // 6. audit 审计门禁
  if (requiredGates.includes('audit')) {
    const passed = events.length > 0;
    gateResults.push({
      name: 'audit',
      passed,
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? `审计日志文件已成功建立，共记录 ${events.length} 个执行事件。` : '缺少有效的审计记录。'
    });
  }

  // 输出门禁判定结果
  console.log(colorWhite('\n==================== 门禁核对报告 ===================='));
  let allPassed = true;
  for (const gate of gateResults) {
    const statusStr = gate.passed ? colorGreen(`[${gate.status}]`) : colorRed(`[${gate.status}]`);
    console.log(`${statusStr} ${colorBold(gate.name)}`);
    console.log(`      ${colorGray(gate.message)}`);
    if (!gate.passed) {
      allPassed = false;
    }
  }
  console.log(colorWhite('===================================================='));

  // 记录状态转换
  let finalStatus: StoryStatus = 'FIXING';
  if (allPassed) {
    finalStatus = 'READY_FOR_REVIEW';
    console.log(colorGreen(`\n🎉 恭喜！所有门禁校验成功通过。`));
    console.log(colorWhite(`已自动将 Story 状态变更为: READY_FOR_REVIEW`));
  } else {
    console.log(colorRed(`\n❌ 门禁验证未全部通过，请按提示补齐测试、构建或审批证据。`));
    console.log(colorWhite(`已自动将 Story 状态变更为: FIXING`));
  }

  try {
    stateManager.transitionStoryStatus(storyPath, finalStatus);
    logger.logEvent('state.changed', {
      story_id: runState.story_id,
      from: 'VERIFYING',
      to: finalStatus,
      reason: 'verify result'
    });
  } catch (e) {}

  // 写入验证事件
  logger.logEvent('git.diff.captured', {
    changed_files: changedFiles,
    passed_gates: gateResults.filter(g => g.passed).map(g => g.name),
    failed_gates: gateResults.filter(g => !g.passed).map(g => g.name)
  });

  // 更新 run 状态
  runState.status = allPassed ? 'COMPLETED' : 'FAILED';
  runState.ended_at = new Date().toISOString();
  stateManager.saveRun(runJsonPath, runState);

  process.exit(allPassed ? 0 : 5);
}
