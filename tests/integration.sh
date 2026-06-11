#!/bin/bash
set -e

echo "🧪 开始运行 VSPOT Harness 命令行集成测试..."

# 准备沙盒测试目录
BASE_DIR=$(pwd)
SANDBOX_DIR="$BASE_DIR/examples/minimal-node"

if [ -d "$SANDBOX_DIR" ]; then
  echo "清理旧的沙盒目录..."
  rm -rf "$SANDBOX_DIR"
fi

mkdir -p "$SANDBOX_DIR"
cd "$SANDBOX_DIR"

# 1. 运行 init
echo "----------------------------------------"
echo "1. 测试 init 命令..."
node "$BASE_DIR/bin/vspotharness.js" init

if [ ! -d ".vspotharness" ] || [ ! -f ".vspotharness/config.yaml" ]; then
  echo "❌ Error: init 命令未正确创建 .vspotharness 目录或 config.yaml"
  exit 1
fi
echo "✔ init 验证成功"

# 2. 运行 run start (STORY-101: 违规流测试)
echo "----------------------------------------"
echo "2. 测试 run start 命令 (STORY-101)..."
node "$BASE_DIR/bin/vspotharness.js" run start STORY-101

# 精准抓取 STORY-101 的 Run ID
RUN_ID_101=$(node -e "
const fs = require('fs');
const path = require('path');
const runsDir = '.vspotharness/runs';
const runs = fs.readdirSync(runsDir);
for (const run of runs) {
  const p = path.join(runsDir, run, 'run.json');
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.story_id === 'STORY-101') {
      console.log(data.run_id);
      break;
    }
  }
}
")

echo "✔ STORY-101 运行环境启动成功 (Run ID: $RUN_ID_101)"
export VSPOT_RUN_ID="$RUN_ID_101"

# 3. 运行 check (静态评估)
echo "----------------------------------------"
echo "3. 测试 check 命令..."
node "$BASE_DIR/bin/vspotharness.js" check --action run --command "npm test"

set +e
node "$BASE_DIR/bin/vspotharness.js" check --action run --command "rm -rf src"
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 4 ]; then
  echo "❌ Error: check 禁止命令预期退出码为 4，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ check 验证成功"

# 4. 运行 exec 命令
echo "----------------------------------------"
echo "4. 测试 exec 包装执行命令..."

# 4.1 允许命令
node "$BASE_DIR/bin/vspotharness.js" exec -- npm test || true

# 4.2 拦截测试 (无审批)
set +e
node "$BASE_DIR/bin/vspotharness.js" exec -- echo "Hello"
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 3 ]; then
  echo "❌ Error: 缺失审批命令预期退出码为 3，实际为 $EXIT_CODE"
  exit 1
fi

# 4.3 写入审批并重新运行
mkdir -p ".vspotharness/approvals"
cat <<EOF > .vspotharness/approvals/APR-test.json
{
  "approval_id": "APR-test",
  "story_id": "STORY-101",
  "run_id": "$RUN_ID_101",
  "decision": "approved",
  "commands": ["echo *"],
  "approver": "owner",
  "issued_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
node "$BASE_DIR/bin/vspotharness.js" exec -- echo "Hello VSPOT Harness"

# 4.4 拦截禁止的命令
set +e
node "$BASE_DIR/bin/vspotharness.js" exec -- rm -rf src
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 4 ]; then
  echo "❌ Error: exec 禁止命令预期退出码为 4，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ exec 验证成功"

# 5. 运行 verify 评估违法拦截 (STORY-101 包含违规修改 package.json 且未批，且有被拦截命令)
echo "----------------------------------------"
echo "5. 测试 verify 门禁防御拦截行为..."
# 构造 package.json 变动触发超限
cat <<EOF > package.json
{
  "name": "mock-app",
  "scripts": {
    "test": "echo \"all tests passed\"",
    "build": "echo \"build success\""
  }
}
EOF

# 补全 test 和 build
node "$BASE_DIR/bin/vspotharness.js" exec -- npm test
node "$BASE_DIR/bin/vspotharness.js" exec -- npm run build

set +e
node "$BASE_DIR/bin/vspotharness.js" verify
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 5 ]; then
  echo "❌ Error: STORY-101 包含超限和越权命令，verify 预期失败返回 5，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ verify 门禁成功防御并拦截违规行为 (退出码: 5)"

# 6. 测试完全合规通过流 (STORY-102)
echo "----------------------------------------"
echo "6. 测试完全合规通过流 (STORY-102)..."
node "$BASE_DIR/bin/vspotharness.js" run start STORY-102

# 精准抓取 STORY-102 的 Run ID
RUN_ID_102=$(node -e "
const fs = require('fs');
const path = require('path');
const runsDir = '.vspotharness/runs';
const runs = fs.readdirSync(runsDir);
for (const run of runs) {
  const p = path.join(runsDir, run, 'run.json');
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.story_id === 'STORY-102') {
      console.log(data.run_id);
      break;
    }
  }
}
")
echo "STORY-102 Run ID: $RUN_ID_102"

# 切换 Run 环境
export VSPOT_RUN_ID="$RUN_ID_102"

# 动态扩展 STORY-102 的 scope 使其包含 package.json
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
const p = '.vspotharness/stories/STORY-102/story.yaml';
const story = yaml.load(fs.readFileSync(p, 'utf8'));
story.scope.include.push('package.json');
fs.writeFileSync(p, yaml.dump(story), 'utf8');
"

# 写入对 package.json 修改的审批
cat <<EOF > .vspotharness/approvals/APR-test-102.json
{
  "approval_id": "APR-test-102",
  "story_id": "STORY-102",
  "run_id": "$RUN_ID_102",
  "decision": "approved",
  "resources": ["package.json"],
  "approver": "owner",
  "issued_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# 执行测试和构建
node "$BASE_DIR/bin/vspotharness.js" exec -- npm test
node "$BASE_DIR/bin/vspotharness.js" exec -- npm run build

# 执行验证，没有违规，预期返回 0 (PASS)
node "$BASE_DIR/bin/vspotharness.js" verify
echo "✔ STORY-102 verify 完全合规流验证成功 (退出码: 0)"

# 7. 运行 report 生成报告
echo "----------------------------------------"
echo "7. 测试 report 审计报告生成..."
node "$BASE_DIR/bin/vspotharness.js" report

REPORT_FILE_102=".vspotharness/runs/$RUN_ID_102/report.md"
if [ ! -f "$REPORT_FILE_102" ]; then
  echo "❌ Error: STORY-102 审计报告未生成"
  exit 1
fi
echo "✔ report 验证成功"

# 8. 运行 doctor 诊断
echo "----------------------------------------"
echo "8. 测试 doctor 命令..."
node "$BASE_DIR/bin/vspotharness.js" doctor
echo "✔ doctor 验证成功"

echo "========================================"
echo "🎉 VSPOT Harness 命令行集成测试全部通过！"
echo "========================================"
cd "$BASE_DIR"
