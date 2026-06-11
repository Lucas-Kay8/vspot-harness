import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { getHarnessDir, getConfigPath, getStoriesDir, getRunsDir, getApprovalsDir } from '../../utils/paths';
import { generateOwnerKeyPair } from '../../utils/crypto';

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

  // 3. 生成密钥对并写入 .gitignore 保护规则
  const pubKeyPath = path.join(harnessDir, 'owner_key.pub');
  const privKeyPath = path.join(harnessDir, 'owner_key');

  if (!fs.existsSync(pubKeyPath) || !fs.existsSync(privKeyPath)) {
    try {
      console.log(pc.blue('⚡ 正在为您自动生成人类所有者（Owner）非对称加密密钥对...'));
      const keypair = generateOwnerKeyPair();
      fs.writeFileSync(pubKeyPath, keypair.publicKey, 'utf8');
      fs.writeFileSync(privKeyPath, keypair.privateKey, 'utf8');
      fs.chmodSync(privKeyPath, 0o600);
      console.log(pc.green('✔ 已生成加密密钥对，并配置了安全访问权限。'));
    } catch (e: any) {
      console.error(pc.red(`❌ 生成密钥对失败: ${e.message}`));
    }
  }

  // 自动将私钥追加至 .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  try {
    let gitignoreContent = '';
    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    }
    
    if (!gitignoreContent.includes('owner_key')) {
      const lineToAppend = '\n# VSPOT Harness Private Key\n.vspotharness/owner_key\n.vspotharness/cache/\n';
      fs.appendFileSync(gitignorePath, lineToAppend, 'utf8');
      console.log(pc.green('✔ 已自动向 .gitignore 追加私钥与缓存忽略规则。'));
    }
  } catch (e: any) {
    console.warn(pc.yellow(`⚠ 无法更新 .gitignore: ${e.message}，请手动进行配置以免泄露私钥。`));
  }

  console.log(pc.cyan('\n🎉 VSPOT Harness 初始化完成！'));
}
