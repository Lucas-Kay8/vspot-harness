#!/bin/bash
set -e

echo "🧪 开始运行 VSPOT Harness 命令行集成测试 (P4 密码学安全升级)..."

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
echo "1. 测试 init 命令与非对称密钥对生成..."
node "$BASE_DIR/bin/vspotharness.js" init

if [ ! -d ".vspotharness" ] || [ ! -f ".vspotharness/config.yaml" ]; then
  echo "❌ Error: init 命令未正确创建 .vspotharness 目录或 config.yaml"
  exit 1
fi

if [ ! -f ".vspotharness/owner_key" ] || [ ! -f ".vspotharness/owner_key.pub" ]; then
  echo "❌ Error: init 未能自动生成 owner_key 公私钥对"
  exit 1
fi
echo "✔ init 与非对称加密密钥生成验证成功"

# 初始化本地沙盒 Git 仓库，确保 git 状态完全独立
git init
git config user.name "sandbox"
git config user.email "sandbox@example.com"
git config commit.gpgsign false
git add .
git commit -m "initial commit"


# 2. 运行 run start (STORY-101: 违规与拦截测试)
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

# 4. 运行 exec 与密码学审批验签拦截测试
echo "----------------------------------------"
echo "4. 测试 exec 包装执行与非对称验签拦截..."

# 4.1 测试直接允许的命令
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

# 4.3 拦截测试 (写入无数字签名的伪造审批 JSON，由于启用了公钥防伪造，预期依然拦截返回 3)
echo "4.3 测试无签名审批防伪造拦截..."
mkdir -p ".vspotharness/approvals"
cat <<EOF > .vspotharness/approvals/APR-unsigned.json
{
  "approval_id": "APR-unsigned",
  "story_id": "STORY-101",
  "run_id": "$RUN_ID_101",
  "decision": "approved",
  "commands": ["echo *"],
  "approver": "owner",
  "issued_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

set +e
node "$BASE_DIR/bin/vspotharness.js" exec -- echo "Unsigned Hello"
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 3 ]; then
  echo "❌ Error: 无签名审批文件预期仍被安全防御拦截返回 3，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ 无签名审批防伪造拦截验证成功"

# 4.4 使用 CLI sign 命令签署正规审批文件，并重新执行
echo "4.4 使用公私钥进行审批数字签署..."
node "$BASE_DIR/bin/vspotharness.js" sign \
  --story STORY-101 \
  --run "$RUN_ID_101" \
  --commands "echo *" \
  --private-key ".vspotharness/owner_key"

# 再次执行，此时由于有了带合法非对称签名的审批，预期应该成功放行
node "$BASE_DIR/bin/vspotharness.js" exec -- echo "Hello VSPOT Signed Approval"

# 4.5 绝对拦截禁止命令
set +e
node "$BASE_DIR/bin/vspotharness.js" exec -- rm -rf src
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 4 ]; then
  echo "❌ Error: exec 禁止命令预期退出码为 4，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ exec 密码学验签及拦截验证成功"

# 5. 运行 verify 门禁完整性审计测试
echo "----------------------------------------"
echo "5. 测试 verify 门禁完整性拦截与日志防篡改校验..."
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

# 补全 test 和 build 成功执行
node "$BASE_DIR/bin/vspotharness.js" exec -- npm test
node "$BASE_DIR/bin/vspotharness.js" exec -- npm run build

# 5.1 篡改审计日志内容（人为修改 events.jsonl 第一行数据），测试 verify 门禁是否会报审计防篡改失败
echo "5.1 模拟非法篡改审计日志内容..."
EVENTS_FILE=".vspotharness/runs/$RUN_ID_101/events.jsonl"
node -e "
const fs = require('fs');
const lines = fs.readFileSync('$EVENTS_FILE', 'utf8').split('\n').filter(Boolean);
const eventObj = JSON.parse(lines[0]);
eventObj.actor = 'hacker'; // 篡改 actor
lines[0] = JSON.stringify(eventObj);
fs.writeFileSync('$EVENTS_FILE', lines.join('\n') + '\n', 'utf8');
"

set +e
node "$BASE_DIR/bin/vspotharness.js" verify
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 5 ]; then
  echo "❌ Error: 日志被篡改，verify 预期返回审计完整性失败退出码 5，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ 审计日志篡改哈希链检验拦截验证成功 (退出码: 5)"

# 6. 测试完全合规通过流与 CI 输出 (STORY-102)...
echo "----------------------------------------"
echo "6. 测试完全合规通过流与 CI 输出 (STORY-102)..."

# 将当前沙盒工作区状态全部 commit，作为 STORY-102 的干净基线 Commit
git add .
git commit -m "baseline commit for story-102" || true

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

# 切换 Run Env
export VSPOT_RUN_ID="$RUN_ID_102"

# 动态扩展 STORY-102 的 scope
node -e "
const fs = require('fs');
const yaml = require('js-yaml');
const p = '.vspotharness/stories/STORY-102/story.yaml';
const story = yaml.load(fs.readFileSync(p, 'utf8'));
story.scope.include = ['**/*'];
fs.writeFileSync(p, yaml.dump(story), 'utf8');
"

# 使用 CLI sign 工具，为 STORY-102 签署修改文件的审批（ resources: * ）
node "$BASE_DIR/bin/vspotharness.js" sign \
  --story STORY-102 \
  --run "$RUN_ID_102" \
  --resources "*" \
  --private-key ".vspotharness/owner_key"

# 执行测试和构建
node "$BASE_DIR/bin/vspotharness.js" exec -- npm test
node "$BASE_DIR/bin/vspotharness.js" exec -- npm run build

# 执行验证 (使用 --ci 模式测试，没有违规且哈希链完好，预期返回 0)
node "$BASE_DIR/bin/vspotharness.js" verify --ci
echo "✔ STORY-102 verify --ci 合规流验证成功 (退出码: 0)"

# 6.1 测试 Harness 自身策略防篡改 (P5.1)
echo "6.1 测试 Harness 自身策略防篡改..."
# 备份策略配置文件
cp .vspotharness/config.yaml .vspotharness/config.yaml.bak
# 故意修改策略配置文件
echo "# Tampered by Agent" >> .vspotharness/config.yaml

set +e
node "$BASE_DIR/bin/vspotharness.js" verify --ci
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 5 ]; then
  echo "❌ Error: 篡改自身策略配置后 verify 应该失败返回 5，实际为 $EXIT_CODE"
  exit 1
fi
# 还原策略文件
mv .vspotharness/config.yaml.bak .vspotharness/config.yaml
echo "✔ Harness 自身策略防篡改拦截验证成功"

# 6.2 测试防 TOCTOU 时间差漏洞校验 (P5.2)
echo "6.2 测试防 TOCTOU 时间差漏洞校验..."
# 故意修改一个外部受监管的变动文件内容以产生真实的 Git Diff 并更新其 mtime
# 暂停 1 秒以制造时间差
sleep 1
echo "" >> package.json

# 此时运行 verify，应该因为 TOCTOU 校验失败而阻断
set +e
node "$BASE_DIR/bin/vspotharness.js" verify --ci
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 5 ]; then
  echo "❌ Error: 检测到 TOCTOU 二次修改时 verify 应当拦截失败返回 5，实际为 $EXIT_CODE"
  exit 1
fi
echo "✔ TOCTOU 时间差篡改成功拦截"

# 重新运行测试与构建以更新测试证据时间，此时 verify 应当恢复通过
node "$BASE_DIR/bin/vspotharness.js" exec -- npm test
node "$BASE_DIR/bin/vspotharness.js" exec -- npm run build
node "$BASE_DIR/bin/vspotharness.js" verify --ci
echo "✔ TOCTOU 再次运行测试后自动恢复通过验证成功"

# 7. 运行 report 生成报告
echo "----------------------------------------"
echo "7. 测试 report 审计报告生成与 SARIF 导出..."
node "$BASE_DIR/bin/vspotharness.js" report --format sarif

REPORT_FILE_102=".vspotharness/runs/$RUN_ID_102/report.md"
SARIF_FILE_102=".vspotharness/runs/$RUN_ID_102/report.sarif"

if [ ! -f "$REPORT_FILE_102" ]; then
  echo "❌ Error: STORY-102 审计报告(Markdown)未生成"
  exit 1
fi

if [ ! -f "$SARIF_FILE_102" ]; then
  echo "❌ Error: STORY-102 审计报告(SARIF)未生成"
  exit 1
fi

# 检查 SARIF 内部结构是否合法
node -e "
const fs = require('fs');
const sarif = JSON.parse(fs.readFileSync('$SARIF_FILE_102', 'utf8'));
if (sarif.version !== '2.1.0' || !sarif.runs || sarif.runs.length === 0) {
  process.exit(1);
}
"
if [ $? -ne 0 ]; then
  echo "❌ Error: 导出的 SARIF 文件格式不合规"
  exit 1
fi

echo "✔ report 与 SARIF 验证成功"

# 8. 运行 doctor 诊断
echo "----------------------------------------"
echo "8. 测试 doctor 命令..."
node "$BASE_DIR/bin/vspotharness.js" doctor
echo "✔ doctor 验证成功"

echo "========================================"
echo "🎉 VSPOT Harness P5 命令行集成测试全部通过！"
echo "========================================"
cd "$BASE_DIR"
