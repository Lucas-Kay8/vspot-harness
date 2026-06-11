import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import pc from 'picocolors';
import { minimatch } from 'minimatch';
import { getConfigPath, getRunJsonPath, getRunDir, getApprovalsDir } from '../../utils/paths';
import { PolicyEngine } from '../../policy/engine';
import { StateManager } from '../../state/manager';
import { AuditLogger } from '../../audit/logger';
import { verifyApprovalSignature } from '../../utils/crypto';

function findValidApproval(approvalsDir: string, storyId: string, runId: string, command: string): any | null {
  if (!fs.existsSync(approvalsDir)) return null;
  
  const pubKeyPath = path.join(process.cwd(), '.vspotharness', 'owner_key.pub');
  let publicKeyPem: string | null = null;
  if (fs.existsSync(pubKeyPath)) {
    try {
      publicKeyPem = fs.readFileSync(pubKeyPath, 'utf8');
    } catch (e) {}
  }

  const files = fs.readdirSync(approvalsDir);
  const now = new Date();

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const p = path.join(approvalsDir, file);
      const approval = JSON.parse(fs.readFileSync(p, 'utf8'));

      // 0. 若系统公钥存在，进行密码学签名防伪造校验
      if (publicKeyPem) {
        if (!approval.signature || !verifyApprovalSignature(approval, approval.signature, publicKeyPem)) {
          continue; // 签名不存在或验证失败，拒绝信任该文件
        }
      }

      // 1. 检查 story_id 匹配
      if (approval.story_id !== storyId) continue;
      // 2. 检查 run_id 匹配 (如果审批文件绑定了特定的 run_id 且不为空的话)
      if (approval.run_id && approval.run_id !== runId) continue;
      // 3. 检查决策
      if (approval.decision !== 'approved' && approval.decision !== 'approved_with_changes') continue;
      // 4. 检查是否过期
      if (approval.expires_at && new Date(approval.expires_at) < now) continue;

      // 5. 检查命令覆盖范围
      let cmdMatch = false;
      if (approval.commands && Array.isArray(approval.commands)) {
        for (const pattern of approval.commands) {
          if (minimatch(command.trim(), pattern, { dot: true, matchBase: true }) || pattern === '*') {
            cmdMatch = true;
            break;
          }
        }
      }

      if (cmdMatch) {
        return approval;
      }
    } catch (e) {
      // 忽略无效 JSON 文件
    }
  }
  return null;
}

export function execCommand(commandArgs: string[], options: { run?: string }) {
  const runId = options.run || process.env.VSPOT_RUN_ID;
  if (!runId) {
    console.error(pc.red(`❌ 缺少 Run ID。请使用 --run 参数或指定 VSPOT_RUN_ID 环境变量。`));
    process.exit(2);
  }

  const runJsonPath = getRunJsonPath(runId);
  const runDir = getRunDir(runId);
  if (!fs.existsSync(runJsonPath)) {
    console.error(pc.red(`❌ 找不到当前运行实例记录: ${runId}，请先执行 vspotharness run start`));
    process.exit(2);
  }

  // 加载运行上下文和策略
  const stateManager = new StateManager();
  const runState = stateManager.loadRun(runJsonPath);
  
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    console.error(pc.red(`❌ 找不到策略配置文件 config.yaml`));
    process.exit(2);
  }

  let engine: PolicyEngine;
  try {
    engine = new PolicyEngine(configPath);
  } catch (err: any) {
    console.error(pc.red(`❌ 策略配置校验失败: ${err.message}`));
    process.exit(2);
  }

  const fullCommand = commandArgs.join(' ');
  const logger = new AuditLogger(runDir);

  // 1. 评估命令策略
  const decisionResult = engine.evaluateCommand(fullCommand);

  if (decisionResult.decision === 'deny') {
    console.error(pc.red(`❌ 执行被策略禁止!`));
    console.error(pc.red(`  规则ID: ${decisionResult.ruleId || 'unknown'}`));
    console.error(pc.red(`  原因: ${decisionResult.reason}`));
    
    logger.logEvent('command.finished', {
      command: fullCommand,
      result: 'denied',
      exit_code: 4,
      reason: decisionResult.reason
    });
    process.exit(4);
  }

  if (decisionResult.decision === 'require_approval') {
    // 检查审批记录
    const approvalsDir = getApprovalsDir();
    const approval = findValidApproval(approvalsDir, runState.story_id, runId, fullCommand);

    if (!approval) {
      console.error(pc.yellow(`⚠ 执行该命令需要人工审批!`));
      console.error(pc.white(`  命令: ${fullCommand}`));
      console.error(pc.white(`  原因: ${decisionResult.reason}`));
      console.error(pc.white(`  所需审批人: ${decisionResult.approver || '任何维护者'}`));
      console.log(pc.cyan(`\n请生成审批 JSON 写入 approvals/ 目录中，内容类似：`));
      console.log(pc.yellow(JSON.stringify({
        approval_id: `APR-${Date.now()}`,
        story_id: runState.story_id,
        run_id: runId,
        decision: "approved",
        commands: [fullCommand],
        approver: decisionResult.approver || "owner",
        issued_at: new Date().toISOString()
      }, null, 2)));

      logger.logEvent('command.finished', {
        command: fullCommand,
        result: 'approval_pending',
        exit_code: 3,
        reason: 'Missing valid approval'
      });
      process.exit(3);
    } else {
      console.log(pc.green(`✔ 审批通过: 已找到审批记录 [${approval.approval_id}]，授权人: ${approval.approver}`));
    }
  }

  // 2. 正常允许或已批准执行命令
  console.log(pc.gray(`$ ${fullCommand}`));
  
  // 建立证据输出文件
  const evidenceDir = path.join(runDir, 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  const timestamp = Date.now();
  const safeCmdName = fullCommand.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
  const evidenceFileName = `cmd-${timestamp}-${safeCmdName}-out.txt`;
  const evidencePath = path.join(evidenceDir, evidenceFileName);
  const evidenceWriteStream = fs.createWriteStream(evidencePath);

  // 用 spawn 运行 Shell 命令，确保支持管道与通配
  const child = spawn(fullCommand, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    evidenceWriteStream.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
    evidenceWriteStream.write(data);
  });

  child.on('close', (code) => {
    evidenceWriteStream.end();
    const exitCode = code ?? 0;

    // 记录事件
    logger.logEvent('command.finished', {
      command: fullCommand,
      result: exitCode === 0 ? 'success' : 'failed',
      exit_code: exitCode,
      evidence: path.relative(process.cwd(), evidencePath)
    });

    if (exitCode !== 0) {
      console.log(pc.red(`❌ 命令执行失败，退出码: ${exitCode}`));
    }
    process.exit(exitCode);
  });
}
