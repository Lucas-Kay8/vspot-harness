import * as fs from 'fs';
import pc from 'picocolors';
import { getConfigPath } from '../../utils/paths';
import { PolicyEngine, Decision } from '../../policy/engine';

export function checkCommand(options: {
  action?: string;
  file?: string;
  command?: string;
  json?: boolean;
}) {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    console.error(pc.red(`❌ 找不到配置文件 config.yaml，请先执行 vspotharness init`));
    process.exit(2);
  }

  let engine: PolicyEngine;
  try {
    engine = new PolicyEngine(configPath);
  } catch (err: any) {
    console.error(pc.red(`❌ 加载策略文件失败: ${err.message}`));
    process.exit(2);
  }

  const action = options.action || 'edit';
  const isJson = options.json || false;

  // 1. 文件访问评估
  if (action === 'read' || action === 'edit' || options.file) {
    if (!options.file) {
      console.error(pc.red(`❌ 评估文件访问时必须指定 --file 参数`));
      process.exit(2);
    }

    const mode = action === 'read' ? 'read' : 'write';
    const result = engine.evaluateFileAccess(options.file, mode);

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(pc.blue(`📋 评估结果 (文件操作: ${mode}, 目标: ${options.file}):`));
      const formattedDecision = formatDecision(result.decision);
      console.log(`  决策: ${formattedDecision}`);
      console.log(`  原因: ${result.reason}`);
      if (result.approver) {
        console.log(`  需要审批人: ${pc.yellow(result.approver)}`);
      }
    }

    process.exit(getExitCode(result.decision));
  }

  // 2. 命令执行评估
  if (action === 'run' || options.command) {
    if (!options.command) {
      console.error(pc.red(`❌ 评估命令时必须指定 --command 参数`));
      process.exit(2);
    }

    const result = engine.evaluateCommand(options.command);

    if (isJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(pc.blue(`📋 评估结果 (执行命令: ${options.command}):`));
      const formattedDecision = formatDecision(result.decision);
      console.log(`  决策: ${formattedDecision}`);
      console.log(`  原因: ${result.reason}`);
      if (result.approver) {
        console.log(`  需要审批人: ${pc.yellow(result.approver)}`);
      }
    }

    process.exit(getExitCode(result.decision));
  }

  console.error(pc.red(`❌ 未能识别评估类型，请提供 --file 或 --command。`));
  process.exit(2);
}

function formatDecision(decision: Decision): string {
  switch (decision) {
    case 'allow':
      return pc.green('ALLOW (允许)');
    case 'deny':
      return pc.red('DENY (禁止)');
    case 'require_approval':
      return pc.yellow('REQUIRE_APPROVAL (需要审批)');
    case 'needs_review':
      return pc.magenta('NEEDS_REVIEW (需要人工审查)');
    default:
      return decision;
  }
}

function getExitCode(decision: Decision): number {
  switch (decision) {
    case 'allow':
      return 0;
    case 'require_approval':
      return 3;
    case 'deny':
      return 4;
    case 'needs_review':
      return 5;
    default:
      return 2;
  }
}
