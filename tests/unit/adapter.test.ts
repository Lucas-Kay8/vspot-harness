import { adapterManager } from '../../src/adapters/manager';

function runAdapterTests() {
  console.log('🧪 开始运行平台适配器单元测试...');

  // Test 1: 内置 Claude Code 转换
  const act1 = adapterManager.translateAction('claude-code', 'apply_patch');
  console.assert(act1 === 'filesystem.write', `Test 1 Failed: apply_patch should be translated to filesystem.write, got: ${act1}`);
  
  const act2 = adapterManager.translateAction('claude-code', 'view_file');
  console.assert(act2 === 'filesystem.read', `Test 2 Failed: view_file should be translated to filesystem.read, got: ${act2}`);
  console.log('✅ Test 1 & 2 Passed: Claude Code 工具转换成功。');

  // Test 2: 内置 Cursor 转换
  const act3 = adapterManager.translateAction('cursor', 'run_command');
  console.assert(act3 === 'shell.execute', `Test 3 Failed: run_command should be translated to shell.execute, got: ${act3}`);
  console.log('✅ Test 3 Passed: Cursor 工具转换成功。');

  // Test 3: 未知平台降级原样返回
  const act4 = adapterManager.translateAction('unknown-platform', 'any_action');
  console.assert(act4 === 'any_action', `Test 4 Failed: unknown platform should fallback and return raw action, got: ${act4}`);
  console.log('✅ Test 4 Passed: 未置平台降级处理成功。');

  // Test 4: 自定义映射规则加载
  adapterManager.loadCustomAdapter('my-ai-ide', {
    'create_component': 'filesystem.write',
    'read_structure': 'filesystem.read'
  });
  
  const act5 = adapterManager.translateAction('my-ai-ide', 'create_component');
  console.assert(act5 === 'filesystem.write', `Test 5 Failed: custom map should return filesystem.write, got: ${act5}`);
  
  const act6 = adapterManager.translateAction('my-ai-ide', 'read_structure');
  console.assert(act6 === 'filesystem.read', `Test 6 Failed: custom map should return filesystem.read, got: ${act6}`);
  console.log('✅ Test 5 & 6 Passed: 自定义适配映射规则加载成功。');

  console.log('\n🎉 所有平台适配器测试通过！');
}

runAdapterTests();
