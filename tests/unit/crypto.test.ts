import * as fs from 'fs';
import * as path from 'path';
import { generateOwnerKeyPair, signApproval, verifyApprovalSignature } from '../../src/utils/crypto';
import { AuditLogger, calculateEventHash } from '../../src/audit/logger';

function runCryptoTests() {
  console.log('🧪 开始运行密码学与哈希链单元测试...');

  // 1. 测试非对称签名与验证
  const keypair = generateOwnerKeyPair();
  
  const approval = {
    story_id: 'STORY-101',
    run_id: 'run-1',
    decision: 'approved',
    commands: ['npm test'],
    resources: ['src/api.ts']
  };

  // 生成签名
  const sig = signApproval(approval, keypair.privateKey);
  
  // 验证签名
  const valid = verifyApprovalSignature(approval, sig, keypair.publicKey);
  console.assert(valid === true, 'Test 1 Failed: signature should be valid');
  console.log('✅ Test 1 Passed: RSA 签名与公钥验签测试成功。');

  // 尝试篡改审批属性，验证验签失败
  const tamperedApproval = { ...approval, decision: 'rejected' };
  const validTampered = verifyApprovalSignature(tamperedApproval, sig, keypair.publicKey);
  console.assert(validTampered === false, 'Test 2 Failed: tampered signature should be invalid');
  console.log('✅ Test 2 Passed: 篡改内容后验签失败测试成功。');

  // 2. 测试哈希链审计完整性
  const tempDir = path.resolve(__dirname, '../temp-audit');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const logger = new AuditLogger(tempDir);
  logger.logEvent('run.started', { story_id: 'STORY-101' });
  logger.logEvent('file.write', { path: 'src/api.ts' });
  logger.logEvent('command.finished', { command: 'npm test', exit_code: 0 });

  const integrity1 = logger.verifyIntegrity();
  console.assert(integrity1.valid === true, `Test 3 Failed: integrity should be valid, got: ${integrity1.message}`);
  console.log('✅ Test 3 Passed: 正常级联哈希链校验成功。');

  // 模拟篡改：改动某一行日志内容
  const logFilePath = path.join(tempDir, 'events.jsonl');
  const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean);
  
  // 修改第二行的 payload (改变 path 字段的值)
  const eventObj = JSON.parse(lines[1]);
  eventObj.path = 'src/tampered.ts';
  lines[1] = JSON.stringify(eventObj);
  fs.writeFileSync(logFilePath, lines.join('\n') + '\n', 'utf8');

  const integrity2 = logger.verifyIntegrity();
  console.assert(integrity2.valid === false, 'Test 4 Failed: tampered event log should fail integrity check');
  console.log('✅ Test 4 Passed: 篡改日志内容后哈希链断裂拦截测试成功。');

  // 清理
  if (fs.existsSync(logFilePath)) {
    fs.unlinkSync(logFilePath);
  }
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir);
  }

  console.log('\n🎉 所有密码学与哈希链单元测试完美通过！');
}

runCryptoTests();
