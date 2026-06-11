# BMad Method v6.8+ Integration Guide (BMad Method 整合指南)

The **VSPOT Harness** is designed to seamlessly integrate with the [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD). 
**VSPOT Harness** 旨在与 [BMad Method](https://github.com/bmad-code-org/BMAD-METHOD) (v6.8 及以上版本) 无缝集成。

While BMad Method solves "how AI plans software development", this Harness Extension solves "how AI safely executes the code".
如果说 BMad Method 解决了“AI 如何规划软件开发”，那么这个 VSPOT 治理框架则解决了“AI 如何安全地执行代码”。

---

## 📦 模块化封装与 Skill 机制

为了让 BMad 生态的智能体可以自动加载和理解治理入口，我们在 `adapters/bmad-v6/` 下打包了标准的扩展包：

1. **`manifest.json` (模块声明与映射)：**
   定义了元数据并建立了 BMad 流程规划产物（Artifacts）向 VSPOT 数据模型的直接映射：
   * `story.story_id` 🗺 `story_id`
   * `story.acceptance_criteria` 🗺 `acceptance_criteria`
   * `scope.include` 🗺 `files_likely_to_change`
   * `scope.exclude` 🗺 `out_of_scope_notes`

2. **`skills.json` (智能体 Skill 契约)：**
   向 BMad 智能体暴露了三个核心 Skill：
   * **`vspotharness-init`**：初始化 VSPOT 项目。
   * **`vspotharness-check`**：在具体工具操作（读/写/执行）前进行前置评估判定。
   * **`vspotharness-verify`**：执行质量与安全双重门禁校验。

---

## 🎭 智能体角色映射 (Agent Role Mapping)

| BMad Method Role | Harness Extension Responsibility |
| :--- | :--- |
| **PM Agent (Aria)** | Defines Stories and Acceptance Criteria. (定义用户故事和验收标准) |
| **Architect Agent (Archie)** | Provides Technical Context and Boundaries. (提供技术上下文和边界) |
| **Scrum Master (Scout)** | Orchestrates execution sequence and triggers Harness rules. (协调执行顺序并触发治理规则) |
| **Dev Agent (Devon)** | *Operates entirely inside the Harness.* Follows policies, logs execution, updates state. (*完全在治理框架内运行*。遵循策略，记录执行，更新状态。) |
| **QA Agent (Quinn)** | Runs verification gates, checks execution logs. (运行验证关卡，检查执行日志。) |
| **Human Owner (You)** | Reviews high-risk permission requests and final verification. (审查高风险的权限请求和最终验证。) |

---

## 🤖 智能体平台适配器 (Platform Adapter)

为了避免核心策略与具体的 IDE/平台工具链产生耦合，Harness 提供了 `translateAction` 机制。在开发智能体（如 Devon）使用特定工具时，可在 `check` 命令中使用 `--platform` 进行转换：

### 1. Claude Code 平台 (Anthropic)
指令映射契约：
* `view_file` / `grep` / `glob` ➡ 映射为 `filesystem.read`（读取文件）
* `edit_file` / `write_file` ➡ 映射为 `filesystem.write`（文件改动）
* `execute_command` ➡ 映射为 `shell.execute`（命令执行）

使用示例：
```bash
# 评估在 Claude Code 平台修改敏感文件的权限
vspotharness check --platform claude-code --action edit_file --file src/auth/callback.ts
```

### 2. Cursor / Aider 平台
指令映射契约：
* `read_file` ➡ 映射为 `filesystem.read`
* `write_file` / `edit_file` / `apply_patch` ➡ 映射为 `filesystem.write`
* `run_command` ➡ 映射为 `shell.execute`

使用示例：
```bash
# 评估在 Cursor 平台通过 Aider 运行命令的权限
vspotharness check --platform cursor --action run_command --command "rm -rf src"
```

---

## 🛡️ CI/CD 自动化集成 (Prevention)

提供 GitHub Actions 自动化门禁保护。您可以在项目 `.github/workflows/vspot-verify.yml` 中集成 `vspotharness verify --ci`。

在 CI 环境下运行：
1. **自动读取：** 从 `VSPOT_RUN_ID` 环境变量拉起运行实例数据。
2. **纯文本审计：** `--ci` 选项会自动剥离 ANSI 终端颜色，生成干净可读的 CI 日志。
3. **强制合并阻断：** 若有任何门禁 Gate 验证失败，将直接抛出退出码 5 迫使整个 GitHub Action 失败，结合**分支保护 (Branch Protection)** 可有效防止非合规或未经授权的修改并入主干。
