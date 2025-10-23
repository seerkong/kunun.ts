# 决策：workspace 包边界与依赖方向（Durable / 长期项目决策）

- **日期：** 2026-06-10
- **状态：** confirmed
- **标记：** Durable / 长期项目决策，归档时提升到 `decision://workspace-package-boundaries`

## 决策

项目采用 bun workspaces 五包结构，包依赖方向为有向无环且长期不可违反：

```
kunun-core        （Model/Util/Algo/StateManagement/TaskQueue，强连通块，不再细拆）
   ↑
kunun-converter   （Parser/Formatter/SyntaxConfig）
   ↑
kunun-runtime     （RuntimeInterpreter/HostSupport + depa-actor；定义 TypeSystemBridge 接口）
   ↑
kunun-type-system （TypeSystem；实现并注册 TypeSystemBridge）
   ↑
kunun             （总包 re-export，导入即自动注册 bridge；由 @symtable/kunun 改名）
```

## 约束（未来修改必须遵守）

1. `kunun-runtime` 不得静态 import `kunun-type-system`；runtime 需要类型系统能力时只能扩展 `TypeSystemBridge` 接口。
2. `TypeSystem → RuntimeInterpreter`（interpreter-backed type computation）方向保留，与既有长期决策一致。
3. 新增模块时先确定包归属，跨包导入必须用包名（`kunun-*`），禁止 `../../../packages/...` 相对路径穿透包边界。
4. `depa-actor` 依赖仅声明在 `kunun-runtime`。
5. 总包导出面是公共 API 契约，删减导出属 BREAKING 变更，需走 track。

## 理由

- 包边界由 bun workspace + package.json 依赖声明强制，违例在 install/typecheck 阶段即暴露。
- bridge 注入保持 runtime 可独立使用（裸 untyped 解释器），类型系统按需挂载。
