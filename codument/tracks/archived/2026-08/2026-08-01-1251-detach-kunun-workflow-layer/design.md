# Design

删除边界以迁移清单和独立 KWF 归档证据为准。两个 workflow package、dynamic workflow skill、examples 与三项 KWF behavior registry 已由 KWF 拥有；Kunun umbrella 不再 re-export workflow DSL。

`finch-resource-diagnosis` 是混合所有权：通用 `capped-probe.sh` 与 parser/runtime runaway 方法保留，依赖 workflow-host 的 Codex workflow 脚本和章节删除，因为对应能力已迁为 KWF 的专属 skill。

lockfile 删除 workflow workspace 节点和相关 workspace dependency。Kunun runtime 原 manifest 指向仓库中不存在的本地 `depa-actor` tarball；detach 同步将其规范化为公开 `0.2.0`，恢复 Kunun 自身的独立安装能力。验证聚焦 remaining language packages；静态扫描确认 core/runtime 不 import KWF 或 ZenFS。
