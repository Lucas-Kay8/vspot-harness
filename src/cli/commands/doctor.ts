import * as fs from 'fs';
import { execSync } from 'child_process';
import pc from 'picocolors';
import { getConfigPath } from '../../utils/paths';
import { PolicyEngine } from '../../policy/engine';

export function doctorCommand() {
  console.log(pc.blue('⚡ 正在诊断 VSPOT Harness 执行环境...\n'));
  let success = true;

  // 1. 检查策略配置文件
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    console.log(pc.red(`❌ [策略配置] 找不到 config.yaml 文件 (${configPath})`));
    console.log(pc.gray('   💡 修复建议: 运行 `vspotharness init` 来初始化项目。'));
    success = false;
  } else {
    try {
      new PolicyEngine(configPath);
      console.log(pc.green(`✔ [策略配置] config.yaml 文件完好，并通过 JSON Schema 验证。`));
    } catch (err: any) {
      console.log(pc.red(`❌ [策略配置] config.yaml 文件校验失败: ${err.message}`));
      success = false;
    }
  }

  // 2. 检查 Git 环境
  try {
    const gitVer = execSync('git --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    console.log(pc.green(`✔ [Git环境] 运行环境支持 Git (版本: ${gitVer})。`));
  } catch (e) {
    console.log(pc.red(`❌ [Git环境] 系统中未找到 Git 命令行或执行出错。`));
    console.log(pc.gray('   💡 修复建议: 安装 Git 并确保它在当前用户的 PATH 路径下。'));
    success = false;
  }

  // 3. 检查敏感文件状态
  if (fs.existsSync('.env')) {
    console.log(pc.yellow(`⚠ [敏感文件] 项目根目录下存在 .env 敏感文件。`));
    try {
      // 检查 .gitignore 里是否有 .env
      const gitignorePath = '.gitignore';
      if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        if (gitignoreContent.includes('.env')) {
          console.log(pc.green(`   ✔ .env 已在 .gitignore 中忽略。`));
        } else {
          console.log(pc.red(`   ❌ .env 未被 .gitignore 忽略！这存在密钥泄漏风险。`));
          console.log(pc.gray('      💡 修复建议: 在 .gitignore 中添加 `.env`。'));
          success = false;
        }
      }
    } catch (e) {}
  }

  console.log(pc.white('\n===================================================='));
  if (success) {
    console.log(pc.green(`🎉 VSPOT Harness 诊断成功！环境一切正常。`));
  } else {
    console.log(pc.red(`❌ 诊断发现问题，请根据上方建议进行调整后再运行。`));
  }
  console.log(pc.white('===================================================='));

  process.exit(success ? 0 : 2);
}
