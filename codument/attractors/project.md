# kunun.ts

## 项目概述

kunun 语言的 TypeScript 实现：受 Lisp 与 Forth 启发的实验性语言，包含解析器（Knl/Kon/Kjson 三种语法 profile）、基于 depa-actor 双栈 VM 的 RuntimeInterpreter（fiber/continuation/checkpoint）、以及可选的 row/effect 类型系统。

## 技术栈

- **运行时与工具链：** bun（workspaces / bun test / bun build）+ TypeScript 5.4（`tsc --noEmit` 类型检查）。
- **仓库结构：** bun workspaces 多包，根为 private workspace 根（`kunun-workspace`），源码全部在 `packages/*/lib`，测试在 `packages/*/__tests__`。
- **包边界：**
  - `kunun-core`（Model/Util/Algo/StateManagement/TaskQueue，强连通块）
  - `kunun-converter`（解析器/格式化器）→ 依赖 core
  - `kunun-runtime`（RuntimeInterpreter/HostSupport + depa-actor）→ 依赖 core、converter；定义 `TypeSystemBridge` 钩子，**禁止静态 import type-system**
  - `kunun-type-system` → 依赖 core、converter、runtime；实现并注册 bridge（包 index 导入即注册）
  - `kunun`（总包）→ re-export 语言 packages，导入即可 typed 执行；`npm run dist` 产出 ESM+CJS
- **跨包导入约定：** 必须用包名（如 `kunun-core/Model/KnKnot`），由根 `tsconfig.json` paths 解析（bun 原生读取 paths，无需 node_modules 软链）；禁止 `../../..` 相对路径穿透包边界。
- **依赖：** `depa-actor@0.2.0` 通过 package registry 解析，仅由 `kunun-runtime` 声明；仓库不依赖机器绝对路径或缺失的本地 tarball。
