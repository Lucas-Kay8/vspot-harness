import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { getRunJsonPath, getRunDir, getStoryPath } from '../../utils/paths';
import { StateManager } from '../../state/manager';
import { AuditLogger } from '../../audit/logger';

export function reportCommand(options: { run?: string; format?: string }) {
  const runId = options.run || process.env.VSPOT_RUN_ID;
  const format = options.format || 'markdown';

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

  console.log(pc.blue(`⚡ 正在生成运行环境 [${runId}] 的审计报告 (${format})...`));

  // 分析事件
  const stateChanges = events.filter(e => e.type === 'state.changed');
  const commands = events.filter(e => e.type === 'command.finished');
  
  // 查找最近一次门禁校验事件以解析 Gate 结果
  const gitDiffEvent = events.reverse().find(e => e.type === 'git.diff.captured');
  const changedFiles: string[] = gitDiffEvent?.changed_files || [];
  const passedGates: string[] = gitDiffEvent?.passed_gates || [];
  const failedGates: string[] = gitDiffEvent?.failed_gates || [];

  if (format === 'sarif') {
    // 构造标准的 SARIF 安全合规漏洞映射
    const sarifRules = [
      {
        id: "VSPOT-SCOPE",
        name: "ScopeGate",
        shortDescription: { text: "文件变更超出 Story 允许的范围" }
      },
      {
        id: "VSPOT-PERMISSIONS",
        name: "PermissionGate",
        shortDescription: { text: "修改敏感路径未获得授权" }
      },
      {
        id: "VSPOT-TESTS",
        name: "TestGate",
        shortDescription: { text: "测试未运行成功，或遭遇 TOCTOU 绕过攻击" }
      },
      {
        id: "VSPOT-BUILD",
        name: "BuildGate",
        shortDescription: { text: "项目构建未运行成功，或遭遇 TOCTOU 绕过攻击" }
      },
      {
        id: "VSPOT-APPROVALS",
        name: "ApprovalGate",
        shortDescription: { text: "敏感操作缺少有效的数字签名审批" }
      },
      {
        id: "VSPOT-AUDIT",
        name: "AuditGate",
        shortDescription: { text: "审计日志完整性校验失败（哈希链断裂或篡改）" }
      }
    ];

    const results: any[] = [];

    // 根据 failedGates 生成 results
    for (const gate of failedGates) {
      let ruleId = "VSPOT-AUDIT";
      let msgText = `门禁 [${gate}] 验证失败。`;
      
      if (gate === 'scope') {
        ruleId = "VSPOT-SCOPE";
        msgText = `文件变更超出了 Story 的范围（scope）。`;
      } else if (gate === 'permissions') {
        ruleId = "VSPOT-PERMISSIONS";
        msgText = `修改敏感路径未获得授权，缺少人工审批文件。`;
      } else if (gate === 'tests') {
        ruleId = "VSPOT-TESTS";
        const hasToctou = events.some(e => e.type === 'git.diff.captured' && e.failed_gates && e.failed_gates.includes('tests') && 
          events.some(evt => evt.type === 'command.finished' && evt.command && (evt.command.includes('test') || evt.command.includes('jest'))));
        msgText = hasToctou 
          ? `检测到潜在的 TOCTOU 时间差漏洞规避：有文件在测试成功后被二次篡改。` 
          : `未检测到成功运行的测试记录。`;
      } else if (gate === 'build') {
        ruleId = "VSPOT-BUILD";
        msgText = `未检测到成功运行的项目构建记录，或在构建后有二次修改。`;
      } else if (gate === 'approvals') {
        ruleId = "VSPOT-APPROVALS";
        msgText = `检测到越权或被拦截的敏感命令执行（无数字签名审批）。`;
      } else if (gate === 'audit') {
        ruleId = "VSPOT-AUDIT";
        msgText = `审计日志完整性校验失败：哈希链条发生断裂或日志行被篡改。`;
      }

      results.push({
        ruleId,
        message: {
          text: msgText
        },
        level: "error",
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: ".vspotharness/config.yaml"
              }
            }
          }
        ]
      });
    }

    // 针对每个被拦截的敏感命令，生成额外的 results
    const blockedCommands = events.filter(e => e.type === 'command.finished' && e.result === 'approval_pending');
    for (const cmd of blockedCommands) {
      results.push({
        ruleId: "VSPOT-APPROVALS",
        message: {
          text: `敏感命令被拦截：命令 "${cmd.command}" 执行被策略拦截，因为缺少所有者的有效私钥签名审批。`
        },
        level: "error",
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: "package.json"
              }
            }
          }
        ]
      });
    }

    const sarifReport = {
      $schema: "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0-rtm.5.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "VSPOT Harness",
              version: "0.1.0",
              informationUri: "https://github.com/Lucas-Kay8/vspot-harness",
              rules: sarifRules
            }
          },
          results
        }
      ]
    };

    const reportPath = path.join(runDir, 'report.sarif');
    fs.writeFileSync(reportPath, JSON.stringify(sarifReport, null, 2), 'utf8');
    console.log(pc.green(`✔ SARIF 审计报告生成成功: ${path.relative(process.cwd(), reportPath)}`));
    return;
  }

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
| ${passedGates.map(g => `\`${g}\` | ✅ PASS | 验证通过`).join('\n| ')}
| ${failedGates.map(g => `\`${g}\` | ❌ FAIL | 验证失败，请排查`).join('\n| ')}

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
