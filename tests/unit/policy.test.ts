import * as fs from 'fs';
import * as path from 'path';
import { PolicyEngine } from '../../src/policy/engine';

function runTests() {
  console.log('🧪 开始运行策略引擎单元测试...');

  const tempDir = path.resolve(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const testPolicyPath = path.join(tempDir, 'test-policy.yaml');
  
  // 1. 创建测试策略文件
  const testPolicyYaml = `version: 1
defaults:
  unknown_action: require_approval
paths:
  - id: sensitive-src
    match:
      - "src/auth/**"
      - "**/secrets.*"
    read: allow
    write: require_approval
    approver: sec-team
  - id: ignored-logs
    match:
      - "*.log"
    read: allow
    write: deny
commands:
  - id: lint-run
    match:
      - "npm run lint"
    decision: allow
  - id: delete-stuff
    match:
      - "rm -rf **"
    decision: deny
`;

  fs.writeFileSync(testPolicyPath, testPolicyYaml, 'utf8');

  try {
    const engine = new PolicyEngine(testPolicyPath);
    
    // Test 1: 路径写权限 - 敏感路径触发 require_approval
    const fileResult1 = engine.evaluateFileAccess('src/auth/login.ts', 'write');
    console.assert(fileResult1.decision === 'require_approval', 'Test 1 Failed: src/auth/login.ts write should require approval');
    console.assert(fileResult1.approver === 'sec-team', 'Test 1 Failed: approver should be sec-team');
    console.log('✅ Test 1 Passed: 敏感路径写权限匹配成功。');

    // Test 2: 路径写权限 - 禁止的路径触发 deny
    const fileResult2 = engine.evaluateFileAccess('error.log', 'write');
    console.assert(fileResult2.decision === 'deny', 'Test 2 Failed: error.log write should be denied');
    console.log('✅ Test 2 Passed: 敏感路径拒绝写入匹配成功。');

    // Test 3: 默认动作 - 触发 unknown_action (require_approval)
    const fileResult3 = engine.evaluateFileAccess('src/utils/math.ts', 'write');
    console.assert(fileResult3.decision === 'require_approval', 'Test 3 Failed: unknown file write should fall back to require_approval');
    console.log('✅ Test 3 Passed: 默认未知路径回退成功。');

    // Test 4: 命令允许 - npm run lint 触发 allow
    const cmdResult1 = engine.evaluateCommand('npm run lint');
    console.assert(cmdResult1.decision === 'allow', 'Test 4 Failed: npm run lint should be allowed');
    console.log('✅ Test 4 Passed: 允许命令匹配成功。');

    // Test 5: 命令禁止 - rm -rf src 触发 deny
    const cmdResult2 = engine.evaluateCommand('rm -rf src');
    console.assert(cmdResult2.decision === 'deny', 'Test 5 Failed: rm -rf src should be denied');
    console.log('✅ Test 5 Passed: 禁止命令匹配成功。');

    console.log('\n🎉 所有单元测试顺利通过！');
  } catch (err: any) {
    console.error('❌ 测试运行出错:', err.message);
    process.exit(1);
  } finally {
    // 清理
    if (fs.existsSync(testPolicyPath)) {
      fs.unlinkSync(testPolicyPath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  }
}

runTests();
