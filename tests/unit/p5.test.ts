import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { PolicyEngine } from '../../src/policy/engine';
import { reportCommand } from '../../src/cli/commands/report';
import { verifyCommand } from '../../src/cli/commands/verify';
import { StateManager } from '../../src/state/manager';
import { AuditLogger } from '../../src/audit/logger';

function runP5Tests() {
  console.log('🧪 开始运行 VSPOT Harness P5 安全与生态单元测试...');

  const originalCwd = process.cwd();
  const tempDir = path.resolve(__dirname, '../temp-p5-run');

  try {
    // ----------------------------------------------------
    // Test 1: 验证 Harness 自身策略防篡改
    // ----------------------------------------------------
    const templatePolicyPath = path.resolve(__dirname, '../../templates/policy.yaml');
    const engine = new PolicyEngine(templatePolicyPath);

    // 正常路径写入：应该由默认策略决定
    const normalResult = engine.evaluateFileAccess('src/index.ts', 'write');
    console.assert(normalResult.decision === 'require_approval', 'Test 1.1 Failed: default should be require_approval');

    // 核心资产路径写入：强制拦截为 require_approval (harness-self-protection)
    const harnessResult1 = engine.evaluateFileAccess('.vspotharness/config.yaml', 'write');
    console.assert(harnessResult1.decision === 'require_approval', 'Test 1.2 Failed: config.yaml should be require_approval');
    console.assert(harnessResult1.ruleId === 'harness-self-protection', 'Test 1.3 Failed: ruleId should be harness-self-protection');

    const harnessResult2 = engine.evaluateFileAccess('.vspotharness/stories/STORY-101/story.yaml', 'write');
    console.assert(harnessResult2.decision === 'require_approval', 'Test 1.4 Failed: story.yaml should be require_approval');
    console.assert(harnessResult2.ruleId === 'harness-self-protection', 'Test 1.5 Failed: story.yaml ruleId mismatch');

    // 运行时例外路径写入：不应该触发 harness-self-protection
    const runLogsResult = engine.evaluateFileAccess('.vspotharness/runs/run-123/events.jsonl', 'write');
    console.assert(runLogsResult.ruleId !== 'harness-self-protection', 'Test 1.6 Failed: runs/ logs should not be locked');
    console.log('✅ Test 1 Passed: Harness 自身策略防篡改拦截验证成功。');

    // ----------------------------------------------------
    // 初始化临时工作区
    // ----------------------------------------------------
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 拷贝策略文件到临时目录
    const tempHarnessDir = path.join(tempDir, '.vspotharness');
    fs.mkdirSync(tempHarnessDir, { recursive: true });
    fs.copyFileSync(templatePolicyPath, path.join(tempHarnessDir, 'config.yaml'));

    // 拷贝 Schema 文件到临时目录 (paths.ts 会在 process.cwd() / schemas 里寻找)
    const tempSchemasDir = path.join(tempDir, 'schemas');
    fs.mkdirSync(tempSchemasDir, { recursive: true });
    fs.copyFileSync(
      path.resolve(__dirname, '../../schemas/harness-policy.schema.json'),
      path.join(tempSchemasDir, 'harness-policy.schema.json')
    );
    fs.copyFileSync(
      path.resolve(__dirname, '../../schemas/story.schema.json'),
      path.join(tempSchemasDir, 'story.schema.json')
    );
    fs.copyFileSync(
      path.resolve(__dirname, '../../schemas/run-event.schema.json'),
      path.join(tempSchemasDir, 'run-event.schema.json')
    );
    fs.copyFileSync(
      path.resolve(__dirname, '../../schemas/approval.schema.json'),
      path.join(tempSchemasDir, 'approval.schema.json')
    );

    // 切换当前目录到临时目录
    process.chdir(tempDir);

    // 在临时工作区初始化本地 Git 仓库以获取真实的 Git Diff
    execSync('git init && git config user.name "test" && git config user.email "test@example.com" && git config commit.gpgsign false', { stdio: 'ignore' });

    // 模拟 Story 资产
    const stateManager = new StateManager();
    const storyPath = path.join(tempHarnessDir, 'stories/STORY-P5/story.yaml');
    fs.mkdirSync(path.dirname(storyPath), { recursive: true });
    fs.writeFileSync(storyPath, `
story_id: STORY-P5
title: P5 Test Story
status: IN_PROGRESS
scope:
  include:
    - src/**/*
  exclude: []
`, 'utf8');

    // 写入初始的待修改代码文件，作为基线一部分
    const codeFile = path.join(tempDir, 'src/api.ts');
    fs.mkdirSync(path.dirname(codeFile), { recursive: true });
    fs.writeFileSync(codeFile, 'console.log("initial");', 'utf8');

    // 提交基线并获取 Commit Hash
    execSync('git add . && git commit -m "initial commit"', { stdio: 'ignore' });
    const baselineCommit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

    // 模拟 Run 实例
    const runId = 'run-p5-test';
    const runJsonPath = path.join(tempHarnessDir, 'runs', runId, 'run.json');
    fs.mkdirSync(path.dirname(runJsonPath), { recursive: true });
    const runData = {
      run_id: runId,
      story_id: 'STORY-P5',
      baseline_commit: baselineCommit,
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString()
    };
    fs.writeFileSync(runJsonPath, JSON.stringify(runData, null, 2), 'utf8');

    // 模拟修改的代码文件 (产生真实的 Git diff)
    fs.writeFileSync(codeFile, 'console.log("hello");', 'utf8');

    // ----------------------------------------------------
    // Test 2: 验证 SARIF 安全合规报告生成
    // ----------------------------------------------------
    const logger = new AuditLogger(path.join(tempHarnessDir, 'runs', runId));
    logger.logEvent('run.started', { story_id: 'STORY-P5' });
    logger.logEvent('command.finished', { command: 'rm -rf /', exit_code: 1, result: 'approval_pending' });
    logger.logEvent('git.diff.captured', {
      changed_files: ['src/api.ts'],
      passed_gates: ['scope'],
      failed_gates: ['permissions', 'tests']
    });

    reportCommand({ run: runId, format: 'sarif' });

    const sarifPath = path.join(tempHarnessDir, 'runs', runId, 'report.sarif');
    console.assert(fs.existsSync(sarifPath) === true, 'Test 2.1 Failed: report.sarif should exist');
    
    const sarif = JSON.parse(fs.readFileSync(sarifPath, 'utf8'));
    console.assert(sarif.version === '2.1.0', 'Test 2.2 Failed: version should be 2.1.0');
    console.assert(sarif.runs[0].results.length > 0, 'Test 2.3 Failed: results should not be empty');
    
    // 检查是否包含 permissions 失败规则
    const hasPermissionRule = sarif.runs[0].results.some((r: any) => r.ruleId === 'VSPOT-PERMISSIONS');
    console.assert(hasPermissionRule === true, 'Test 2.4 Failed: should report VSPOT-PERMISSIONS result');
    console.log('✅ Test 2 Passed: SARIF 安全合规报告序列化生成校验成功。');

    // ----------------------------------------------------
    // Test 3: 验证 TOCTOU 时间差漏洞校验拦截
    // ----------------------------------------------------
    // 模拟 mock 退出以拦截 verify 最终结果
    const originalExit = process.exit;
    let exitCode: number | null = null;
    process.exit = (code?: string | number | null | undefined): never => {
      exitCode = code as number;
      throw new Error('exit_called');
    };

    // 场景 A: 测试成功完成时间 T1 (比如 10秒前) 
    // 修改文件发生时间 T2 (现在，T2 > T1)
    // 此时应当触发 TOCTOU 警告拦截 (退出码应该是 5 且测试门禁失败)
    const t1 = new Date(Date.now() - 10000).toISOString();
    
    // 重建审计日志，使测试完成时间为 t1
    fs.rmSync(path.join(tempHarnessDir, 'runs', runId, 'events.jsonl'), { force: true });
    const loggerA = new AuditLogger(path.join(tempHarnessDir, 'runs', runId));
    loggerA.logEvent('run.started', { story_id: 'STORY-P5' });
    loggerA.logEvent('command.finished', { command: 'npm test', exit_code: 0, ts: t1 });

    // 强制修改 src/api.ts 的 mtime 为当前时间 (现在)
    const now = new Date();
    fs.utimesSync(codeFile, now, now);

    try {
      verifyCommand({ run: runId, ci: true });
    } catch (err: any) {
      if (err.message !== 'exit_called') throw err;
    }

    console.assert(exitCode === 5, `Test 3.1 Failed: should exit with 5 on TOCTOU, got: ${exitCode}`);
    
    // 校验事件日志，核查是否记录了 tests 失败门禁
    const eventsA = loggerA.getEvents();
    const diffEvtA = eventsA.find(e => e.type === 'git.diff.captured');
    console.assert(diffEvtA?.failed_gates.includes('tests') === true, 'Test 3.2 Failed: tests should fail on TOCTOU');

    // 场景 B: 修改文件发生时间 T2 (10秒前)，而测试成功完成时间 T3 (现在，T3 > T2)
    // 此时 TOCTOU 校验应该通过
    const t2 = new Date(Date.now() - 10000);
    fs.utimesSync(codeFile, t2, t2); // 修改文件 mtime 为 10 秒前

    const t3 = new Date().toISOString(); // 测试时间为现在
    fs.rmSync(path.join(tempHarnessDir, 'runs', runId, 'events.jsonl'), { force: true });
    const loggerB = new AuditLogger(path.join(tempHarnessDir, 'runs', runId));
    loggerB.logEvent('run.started', { story_id: 'STORY-P5' });
    loggerB.logEvent('command.finished', { command: 'npm test', exit_code: 0, ts: t3 });
    // 模拟构建事件也在现在成功
    loggerB.logEvent('command.finished', { command: 'npm run build', exit_code: 0, ts: t3 });

    exitCode = null;
    try {
      verifyCommand({ run: runId, ci: true });
    } catch (err: any) {
      if (err.message !== 'exit_called') throw err;
    }

    // 应该因为 permissions 未满足（缺少 config.yaml 的审批或者其他敏感操作）而返回 5，但是 tests 和 build 门禁应当 PASS
    const eventsB = loggerB.getEvents();
    const diffEvtB = eventsB.find(e => e.type === 'git.diff.captured');
    console.assert(diffEvtB?.passed_gates.includes('tests') === true, 'Test 3.3 Failed: tests should pass when run after edits');
    console.assert(diffEvtB?.passed_gates.includes('build') === true, 'Test 3.4 Failed: build should pass when run after edits');
    console.log('✅ Test 3 Passed: TOCTOU 时间差漏洞校验拦截与通过测试成功。');

    // 恢复退出函数
    process.exit = originalExit;

  } finally {
    // 恢复目录与清理
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  console.log('\n🎉 所有 VSPOT Harness P5 安全与生态单元测试全部成功通过！');
}

runP5Tests();
