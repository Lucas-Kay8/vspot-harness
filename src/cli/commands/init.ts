import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { getHarnessDir, getConfigPath, getStoriesDir, getRunsDir, getApprovalsDir } from '../../utils/paths';

export function initCommand(options: { force?: boolean }) {
  const harnessDir = getHarnessDir();
  const configPath = getConfigPath();
  const storiesDir = getStoriesDir();
  const runsDir = getRunsDir();
  const approvalsDir = getApprovalsDir();

  console.log(pc.blue('⚡ 正在初始化 VSPOT Harness...'));

  // 创建目录
  const dirs = [harnessDir, storiesDir, runsDir, approvalsDir];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(pc.green(`✔ 已创建目录: ${path.relative(process.cwd(), dir)}`));
    }
  }

  // 复制策略模板
  const templatePath = path.resolve(__dirname, '../../../templates/policy.yaml');
  
  if (fs.existsSync(configPath) && !options.force) {
    console.log(pc.yellow(`⚠ 配置文件已存在: ${path.relative(process.cwd(), configPath)}。使用 --force 参数可覆盖。`));
  } else {
    if (fs.existsSync(templatePath)) {
      fs.copyFileSync(templatePath, configPath);
      console.log(pc.green(`✔ 已生成策略配置文件: ${path.relative(process.cwd(), configPath)}`));
    } else {
      // 降级，如果模板不存在，直接写入一个默认内容
      const defaultYaml = `version: 1
defaults:
  unknown_action: require_approval
  unknown_external_system: deny
scope:
  max_changed_files: 10
  outside_scope: require_approval
paths:
  - id: secrets
    match:
      - ".env"
      - ".env.*"
      - "**/credentials.*"
      - "**/*.pem"
    read: deny
    write: deny
commands:
  - id: destructive-shell
    match:
      - "rm -rf **"
      - "git reset --hard **"
    decision: deny
gates:
  required:
    - scope
    - permissions
    - tests
    - build
    - approvals
    - audit
`;
      fs.writeFileSync(configPath, defaultYaml, 'utf8');
      console.log(pc.green(`✔ 已生成默认策略配置文件: ${path.relative(process.cwd(), configPath)}`));
    }
  }

  console.log(pc.cyan('\n🎉 VSPOT Harness 初始化完成！'));
  console.log(pc.white(`请确保在您的项目 .gitignore 中添加以下条目：`));
  console.log(pc.yellow(`  .vspotharness/cache/`));
}
