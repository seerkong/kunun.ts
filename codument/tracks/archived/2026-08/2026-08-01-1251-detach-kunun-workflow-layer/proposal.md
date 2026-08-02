# 解除 Kunun 的 KWF 上层所有权

独立 KWF 已通过 frozen install、typecheck、144-test suite、compiled binary 与 external-cwd smoke。Kunun 现在可以删除已迁移的 workflow-dsl、workflow-host、专属 skills/examples/behaviors 和 workspace/API 引用，同时继续拥有语言 core、converter、runtime、type system 与通用资源诊断能力。

本 track 不修改语言语义，不引入 ZenFS，也不改变 runtime 的通用 yield/job/checkpoint 机制。KWF 对 Kunun 的依赖保持单向；Kunun 不新增对 KWF 仓库、package 或路径的依赖。

