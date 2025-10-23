# 设计：bun workspaces 多包拆分

## 上下文

- 单包项目，`lib/` 八个顶层模块，依赖关系实测（见 `analysis/findings.md`）：Model/Util/Algo/StateManagement 构成强连通块；Converter、HostSupport 依赖方向干净；RuntimeInterpreter ↔ TypeSystem 循环。
- TypeSystem → RuntimeInterpreter 是既定长期决策（interpreter-backed type computation），不可反转。
- runtime 对 TypeSystem 的使用集中在 `RuntimeInterpreter.ts`：import 一处（第 24 行），使用点为 `TypeCheckingResult` 类型、`KonTypeChecker.CheckSource`、`KonTypedRuntimeContext.BindSource`、`instanceof KonTypedObject` 守卫、typed prototype 实例化。
- 测试为 mocha 全局风格 + node assert，bun test 原生兼容。

## 方案概览

1. **包布局**
   - `packages/core` → `kunun-core`：`Model/`、`Util/`、`Algo/`、`StateManagement/`、`TaskQueue.ts`；入口 re-export 与原 `lib/index.ts` 对应部分一致
   - `packages/converter` → `kunun-converter`：`Converter/`
   - `packages/runtime` → `kunun-runtime`：`RuntimeInterpreter/`、`HostSupport/`、新增 `TypeSystemBridge.ts`；声明 `depa-actor` 依赖
   - `packages/type-system` → `kunun-type-system`：`TypeSystem/`、bridge 实现 `RuntimeTypeSystemBridge.ts` 与 `registerTypeSystemBridge()` 导出
   - `packages/kunun` → `kunun`：总包（由 `@symtable/kunun` 改名，BREAKING），re-export 全部子包公共 API，模块加载时调用 `registerTypeSystemBridge()`
   - 各子包内部结构保持 `lib/` + `__tests__/`，包内相对导入不变，跨包导入改为包名导入

2. **TypeSystemBridge 解环设计**
   - runtime 侧定义（结构化类型，不 import type-system）：
     ```ts
     // packages/runtime/lib/RuntimeInterpreter/TypeSystemBridge.ts
     export interface TypeCheckingResultLike {
       Success: boolean;
       Diagnostics: any[];
       Binding?: any;
     }
     export interface TypeSystemBridge {
       CheckSource(source: string): TypeCheckingResultLike;
       BindSource(source: string): any;
       IsTypedObject(target: any): boolean;
       InstantiateTypedPrototype(runtime: any, prototype: any, args: any[]): any;
     }
     export function RegisterTypeSystemBridge(bridge: TypeSystemBridge): void;
     export function GetTypeSystemBridge(): TypeSystemBridge | undefined;
     ```
   - `RuntimeInterpreter.ts` 删除第 24 行 import；`TypeCheckSource`/`BindSource`/`IsTypedObject`/typed 实例化改为经 `GetTypeSystemBridge()` 分派；接口形状以实现期实测的全部使用点为准（上述清单为最小集，迁移时如发现遗漏使用点须同步扩展接口并记录到 findings.md）
   - 未注册 bridge：untyped 路径完全不触碰 bridge；opt-in typed 入口抛出 `Error('TypeSystem bridge not registered. Import kunun or call registerTypeSystemBridge() from kunun-type-system.')`
   - type-system 包：`registerTypeSystemBridge()` 用真实 `KonTypeChecker`/`KonTypedRuntimeContext`/`KonTypedObject` 实现接口并调用 runtime 的注册函数；总包入口顶层执行注册，保证"导入总包即可用"
   - `onTypeChecked` 回调与 `TypeCheckingResult` 在 runtime 公共签名中改用 `TypeCheckingResultLike`；总包层面 re-export type-system 的精确类型，消费方类型体验不降级

3. **bun 工具链**
   - 根 `package.json`：`"workspaces": ["packages/*"]`，private: true；scripts：`test` → `bun test`、`typecheck` → `tsc --noEmit`、`dist` → 总包内 `bun build`、`lint` 暂保留 tslint（不在本 track 替换）
   - 根 `tsconfig.json`：保留现有宽松编译选项，`paths` 增加 `"kunun-core": ["packages/core/lib"]` 等逐包映射与 `"kunun": ["packages/kunun/lib"]`，include 改为 `packages/*/lib`、`packages/*/__tests__`
   - 子包 `package.json`：`main/types` 指向 `lib/index.ts`（workspace 内直接消费 TS 源码，bun 原生支持）；仅总包配置 build 产物（ESM + CJS，external 留空全量打包，target node）
   - 测试：bun test 自动注入 describe/it 全局，node assert 不变；删除 mocha/ts-node/.mocharc.yml/vite/rimraf/`vite.config.ts`/`build/`

4. **迁移顺序（与 plan.xml phase 对应）**
   - 先在现有单包布局上切换 bun 工具链（bun install + bun test 跑通 234 用例），建立绿色基线
   - 再拆 core + converter（无环部分），每步全量测试
   - 然后做 bridge 解环并拆 runtime + type-system
   - 最后建总包、dist 构建、清理与文档

## 影响范围与修改点（Impact）

- 受影响的文件/模块：`lib/**` 全部迁移；`RuntimeInterpreter.ts` 重构类型检查接入点；`__tests__/Case/**` 按归属迁移（Parser/Formatter/KonParserSyntax/LowCodeParser/StringLiteral* → converter；RuntimeInterpreter* → runtime；TypeSystem* → type-system；TaskQueue → core）；根 `package.json`/`tsconfig.json`；删除 `vite.config.ts`、`build/`、`.mocharc.yml`
- `codument/attractors/project.md` 补充技术栈记录；README 开发指引更新

## 决策摘要

- 详见 `decisions.md`
- 当前关键结论：5 包拆分 + bridge 解环（用户已确认）；工具链全面迁 bun（用户已确认）；dist 改 ESM+CJS 放弃 UMD（用户已确认）；子包命名 `kunun-*`、总包改名 `kunun`（用户已确认，BREAKING）；子包不发布 npm；校验 gap-loop every_phase、提交 manual（用户已确认）

## 风险 / 权衡

- bridge 接口形状可能遗漏 runtime 对 TypeSystem 的隐性使用点 → 以 TypeSystem 全部 65 个专项测试 + 234 全量测试为安全网；发现遗漏即扩展接口
- bun test 与 mocha 的细微语义差异（timeout、done 回调、钩子顺序）→ 迁移基线 phase 单独验证，逐个修复
- `depa-actor` 为本地 file: 依赖，bun install 解析行为与 yarn 可能不同 → P1 基线阶段首先验证
- 消费方若依赖 UMD 产物会破坏 → proposal 已标 BREAKING，由用户在评审时把关
- tslint 已废弃且与新布局可能不兼容 → 本 track 仅调整路径或暂时跳过，替换 linter 留作后续 track

## 兼容性设计

- 总包 `kunun` 导出面与原 `lib/index.ts` 完全一致（含 `Model`、`NodeHelper`、`KnConverter`、`RuntimeInterpreter`、`TypeSystem` 等命名空间导出）；包名变更为 BREAKING，消费方更新依赖名即可
- runtime 默认 untyped 行为零变化；裸用 `kunun-runtime` 即等价于"无类型系统的 kunun"

## 迁移计划

- 每个 phase 结束保持全量测试绿色，可独立回滚（git 按 phase 提交）
- 回滚策略：任一 phase 失败可 revert 到上一 phase 检查点，单包布局在 P2 之前完整保留

## 待解决问题

- VSCode `launch.json` 调试配置适配 bun（不阻塞本 track，完成后提示用户）
- 后续是否将 tslint 替换为 oxlint/biome（另行 track）
