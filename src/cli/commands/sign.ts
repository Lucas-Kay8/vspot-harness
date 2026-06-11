import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { getApprovalsDir } from '../../utils/paths';
import { signApproval } from '../../utils/crypto';

export function signCommand(options: {
  story?: string;
  run?: string;
  commands?: string;
  resources?: string;
  decision?: string;
  approver?: string;
  privateKey?: string;
}) {
  const storyId = options.story;
  if (!storyId) {
    console.error(pc.red('❌ 缺少 Story ID，签署审批时必须提供 --story 参数。'));
    process.exit(2);
  }

  // 默认私钥路径
  const defaultPrivKeyPath = path.join(process.cwd(), '.vspotharness', 'owner_key');
  const privateKeyPath = options.privateKey || defaultPrivKeyPath;

  if (!fs.existsSync(privateKeyPath)) {
    console.error(pc.red(`❌ 找不到所有者私钥文件: ${privateKeyPath}`));
    console.error(pc.gray('   💡 修复建议: 确认私钥是否存在，或通过 --private-key 参数传入正确路径。'));
    process.exit(2);
  }

  let privateKeyPem: string;
  try {
    privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
  } catch (e: any) {
    console.error(pc.red(`❌ 读取私钥失败: ${e.message}`));
    process.exit(2);
  }

  // 参数拆分
  const commands = options.commands
    ? options.commands.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  const resources = options.resources
    ? options.resources.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const approvalId = `APR-SIGNED-${Date.now()}`;
  const approvalData: Record<string, any> = {
    approval_id: approvalId,
    story_id: storyId,
    run_id: options.run || undefined,
    decision: options.decision || 'approved',
    commands,
    resources,
    approver: options.approver || 'owner',
    issued_at: new Date().toISOString()
  };

  // 生成非对称加密签名
  let signature: string;
  try {
    signature = signApproval(approvalData, privateKeyPem);
    approvalData.signature = signature;
  } catch (err: any) {
    console.error(pc.red(`❌ 密码学数字签名计算失败: ${err.message}`));
    process.exit(2);
  }

  // 保存审批 JSON 文件
  const approvalsDir = getApprovalsDir();
  if (!fs.existsSync(approvalsDir)) {
    fs.mkdirSync(approvalsDir, { recursive: true });
  }

  const destPath = path.join(approvalsDir, `${approvalId}.json`);
  fs.writeFileSync(destPath, JSON.stringify(approvalData, null, 2), 'utf8');

  console.log(pc.green(`✔ 审批记录签署成功，已生成文件: ${path.relative(process.cwd(), destPath)}`));
  console.log(pc.white('\n==================== 签署的审批内容 ===================='));
  console.log(pc.cyan(JSON.stringify(approvalData, null, 2)));
  console.log(pc.white('======================================================'));
}
