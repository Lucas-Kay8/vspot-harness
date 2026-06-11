# Failure Taxonomy (故障分类学)

## 🎯 目的 (Purpose)
This file defines common AI execution failure types and recommended responses.
本文件定义了常见的 AI 执行故障类型及推荐的应对措施。

## 💥 故障类型 (Failure Types)

### 1. Context Failure (上下文缺失故障)
The agent lacks necessary information.
智能体缺乏必要的信息。

**Examples (示例):**
- missing PRD (缺少 PRD)
- unclear story (故事描述不清晰)
- incomplete architecture (架构设计不完整)
- unknown API contract (未知的 API 契约)

**Recommended response (推荐响应):**
- stop execution (停止执行)
- request missing context (请求缺失的上下文)
- update story readiness checklist (更新故事就绪检查单)

### 2. Scope Failure (范围溢出故障)
The agent modifies files outside the intended scope.
智能体修改了预期范围之外的文件。

**Examples (示例):**
- unrelated refactor (无关的重构)
- touching unrelated modules (触碰了无关模块)
- changing public APIs unnecessarily (不必要地更改了公共 API)

**Recommended response (推荐响应):**
- revert unrelated changes (撤销无关的更改)
- update execution log (更新执行日志)
- request approval if broader change is needed (如果确实需要扩大更改范围，请求审批)

### 3. Permission Failure (权限越界故障)
The agent attempts an approval-required or forbidden action.
智能体尝试执行需要审批或被禁止的操作。

**Examples (示例):**
- modifying auth logic (修改鉴权逻辑)
- changing payment flow (更改支付流程)
- editing production config (编辑生产环境配置)
- adding dependency without approval (未经批准添加依赖)

**Recommended response (推荐响应):**
- stop execution (停止执行)
- document reason (记录原因)
- request human approval (请求人工审批)

### 4. Tool Failure (工具执行故障)
A tool or command fails.
工具或命令执行失败。

**Examples (示例):**
- test command fails (测试命令失败)
- build fails (构建失败)
- package install fails (包安装失败)
- external API unavailable (外部 API 不可用)

**Recommended response (推荐响应):**
- classify failure (对故障进行分类)
- retry only if safe (仅在安全的情况下重试)
- document output (记录输出日志)
- fix root cause if within scope (如果根本原因在当前范围内，则修复它)

### 5. Verification Failure (验证未通过故障)
Implementation does not pass required gates.
代码实现未通过所需的验证关卡。

**Examples (示例):**
- tests fail (测试未通过)
- build fails (构建未通过)
- acceptance criteria not met (未满足验收标准)
- lint/typecheck error (代码风格/类型检查错误)

**Recommended response (推荐响应):**
- do not mark done (不要标记为完成)
- fix issue (修复问题)
- rerun verification (重新运行验证)
- update execution log (更新执行日志)

### 6. Reasoning Failure (逻辑推理故障)
The agent misunderstands the task.
智能体误解了任务。

**Examples (示例):**
- implements wrong feature (实现了错误的功能)
- ignores acceptance criteria (忽略了验收标准)
- makes unsupported assumptions (做出了无根据的假设)

**Recommended response (推荐响应):**
- stop (停止)
- restate task (重述任务)
- compare against story (对照故事内容)
- correct implementation (纠正代码实现)

### 7. Security Failure (安全漏洞故障)
The agent introduces or touches security-sensitive logic incorrectly.
智能体错误地引入或触碰了安全敏感逻辑。

**Examples (示例):**
- weak auth check (弱鉴权检查)
- exposed secret (暴露了密钥)
- bypassed permission check (绕过了权限检查)
- insecure token handling (不安全的 Token 处理)

**Recommended response (推荐响应):**
- stop immediately (立即停止)
- mark high risk (标记为高风险)
- require human review (强制要求人工审查)
- add security-specific tests (添加专门的安全测试)

### 8. State Failure (状态追踪故障)
The agent loses track of progress.
智能体丢失了进度状态。

**Examples (示例):**
- repeats previous step (重复上一步骤)
- forgets test status (忘记了测试状态)
- marks task complete prematurely (过早将任务标记为完成)

**Recommended response (推荐响应):**
- update story-state.json (更新 story-state.json)
- reconstruct execution log (重建执行日志)
- resume from latest verified step (从最新验证过的步骤恢复)
