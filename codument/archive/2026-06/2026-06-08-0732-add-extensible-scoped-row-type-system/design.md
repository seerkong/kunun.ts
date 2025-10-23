# 设计：ExtensibleScopedRowType 类型系统迁移

## 目标

把 ExtensibleScopedRowType 的类型系统迁移到当前 TypeScript 项目中，同时保持当前 RuntimeInterpreter 的 untyped 默认执行模型。类型系统应成为可独立使用的编译期/检查期能力，也可由宿主在执行前显式启用。

## 方案概览

迁移按层推进：

1. 审计 ExtensibleScopedRowType 类型系统的文档、代码、测试和语法假设，建立迁移矩阵。
2. 新增 TypeScript 类型系统模型：type AST、type symbols、type scope/type environment、diagnostics。
3. 基于当前 parser AST 做 parser-to-type lowering，不改变 parser token 或 container profile。
4. 实现 binder/checker：row type、class/trait、generic/type param、source-qualified member、effect signature/handler。
5. 提供可选 RuntimeInterpreter 集成：调用方可选择先 type check 再执行，默认 eval 不启用类型检查。
6. 用 ExtensibleScopedRowType 的非解释器类型系统测试作为迁移基线，并补充 TypeScript 项目中的回归测试。

## 关键决策

- `:::` 是类型系统来源限定的唯一语法表示。当前 parser 已把它解析为 `KnWord.SourceQualifier`，类型系统只消费该 AST 信息。
- `::` 继续表示逻辑执行上下文中的 ContainerSubscript，不承载类型来源限定。
- `.:` 继续表示 slot/static subscript，不作为类型来源限定，避免 `com.example.ClassA.b` 这类 namespace/member projection 歧义。
- 类型系统是可选能力。普通 RuntimeInterpreter 脚本不应因为类型系统引入而改变行为或性能基线。
- typed effect system 应建在当前 untyped effect runtime 的语义之上，先验证静态 signature/handler 覆盖，再考虑类型驱动执行期约束。

## 模块边界

- `lib/TypeSystem/`：类型模型、scope/environment、binder、checker、diagnostic 和 public API。
- `lib/RuntimeInterpreter/`：只增加可选 type-check integration/hook，不承载核心类型推导逻辑。
- `lib/Converter/` 与 `lib/Model/`：原则上只复用已有 AST 表示；只有发现 AST 缺少 ExtensibleScopedRowType 类型系统必要信息时，才做最小兼容补充。
- `__tests__/Resource/TypeSystem/` 与 `__tests__/Case/TypeSystem*.test.ts`：新增类型系统迁移测试。

## 风险与缓解

- 风险：ExtensibleScopedRowType 类型系统依赖 C# 侧 AST 细节，TypeScript AST 形状不完全一致。缓解：先实现 parser-to-type lowering 适配层，不把 C# 结构直接硬移植到 RuntimeInterpreter。
- 风险：typed effect system 与当前 workflow/effect checkpoint runtime 混淆。缓解：typed effect 只做静态 signature/handler 检查；workflow checkpoint 仍属于 runtime effect 能力。
- 风险：默认执行引入 type checking 会破坏现有测试或性能。缓解：所有 type checking 入口显式 opt-in，并增加默认 untyped 回归测试。

## 验证策略

- 编译：`npm run compile`。
- Parser 回归：现有 Kon/Knl/Kjson parser tests 继续通过，尤其是 `:::`、`::`、`.:`。
- 类型系统测试：覆盖 row/class/trait/generic/source qualifier/typed effect 的 positive 与 negative cases。
- Runtime 回归：RuntimeInterpreter 全量测试继续通过，默认执行不触发类型检查。
- Codument：`codument validate add-extensible-scoped-row-type-system --strict`。

## Gap Follow-up Scope

gap-loop 后继续把 ExtensibleScopedRowType 中仍未迁移的类型系统能力收敛到当前 track，按以下边界推进：

1. **C3/MRO 与继承规则**：class MRO 应改为 C3 linearization；`virtual`、`override`、`final`、`inherit`、real inheritance、trait implementation 的 row materialization 和冲突诊断应与 ExtensibleScopedRowType 对齐。
2. **Projection parity**：`TypeProjection` 对 class、row、trait 的合法性检查应支持 trait view；投影后的成员解析必须限制在 target view 中，尤其是 trait projection 不能暴露 trait 外成员。
3. **Stack-shaped checker**：checker 应保留多输出栈形状，并检查 source-level function/method call composition，不只检查最后一个表达式的单值返回。
4. **Typed effect diagnostics**：effect declaration 应支持 operation signature；handler application 应报告 unknown handler、handler 不影响 residual effects、closed boundary residual effects，并支持多 handler 消除完整 residual row。
5. **Generic parity**：generic row/class/function 应在 binder 和 checker 中闭环处理 type arguments、arity、row spread parameter constraints，以及 generic function signature metadata。
6. **Typed runtime context**：新增独立 typed runtime bridge，迁移 `KonTypedRuntimeContext` 的 object creation、prototype field hydration、typed field read/write、projection read/write、getter/setter prototype resolution；RuntimeInterpreter 默认 untyped 行为保持不变。
7. **Access modifiers**：模型已保留 `public/protected/private/internal`，后续 checker/runtime bridge 应在成员访问边界上执行最小可验证约束。

这些 follow-up 不重新设计 parser，不改变 RuntimeInterpreter 默认执行策略；typed runtime bridge 是显式使用的独立 API。

## Full ESRT Runtime Gap Follow-up

进一步对比 ExtensibleScopedRowType 后，当前 track 继续覆盖 ESRT typed runtime/type-system 的剩余差异：

1. **Typed method dispatch**：`KonTypedRuntimeContext` 应支持按 typed rows 调用 prototype method，包括 projection 到 class origin、projection 到 trait top implementation、trait view 外 method 拒绝。
2. **Effect scope runtime dispatch**：typed runtime context 应提供 effect scope，并在同名 method 存在多个 effect-context candidate 时按 active effect row 选择实现。
3. **Kon value conversion boundary**：typed runtime bridge 应提供 Kon value read/write API，支持 primitive Kon value 和 object-like value，拒绝不支持的结构化值。
4. **Real parent storage**：typed object 应 materialize real base parent storage，以便后续 class-origin storage、projection 和 typed runtime object graph 与 ESRT 对齐。
5. **Generic class/function 与 perform operation 后续闭环**：当前已覆盖 generic row、generic function metadata 和 effect row/handler；后续继续补 generic class/function instantiation 与 typed perform operation signature 的 checker/runtime 闭环。

### Deferred Boundaries

以下能力仍作为后续 track 的明确边界，不在本轮继续硬塞进当前实现：

- **Generic class/function instantiation**：当前 parser/binder 可保留 generic function metadata，并可检查 generic row use；但 generic class symbol、generic function call type-argument inference/application、concrete output stack substitution 需要独立设计调用语法和实例化缓存。
- **Typed perform operation signature**：当前 typed effect 已覆盖 effect row、handler、residual diagnostics 与 runtime scope dispatch；但 `(perform ...)` 的 operation name、argument stack、resume/result stack 如何在 source checker 与 RuntimeInterpreter effect opcode 间共享，需要单独设计 typed perform lowering。

本轮只在当前 track 中记录上述边界，避免把未完整设计的 generic/perform 语义做成半隐式行为。

## P15-P17 Gap 升级与补齐策略

后续对比 ExtensibleScopedRowType 后，以下能力从“后续边界”升级为当前 track 的高优实现 gap：

1. **Generic class/function instantiation 与 type argument application**：generic row 已可实例化，generic function metadata 已保存；但 source checker 尚未把显式 type arguments 或可推断 type arguments 应用到 generic function call，generic class type reference 也没有可复用的 instantiated class/row view。
2. **Typed perform operation signature 闭环**：effect declaration 中的 `op` 已可绑定为 row member，但 checker 尚未识别 `(perform #Effect |args...|)` 或 `(perform #op |args...|)` 的参数栈、返回栈和 residual effect；RuntimeInterpreter 的 perform opcode 也未共享 typed operation signature。
3. **Script-level typed runtime execution bridge**：当前 RuntimeInterpreter 仅提供 opt-in static type check；KonTypedRuntimeContext 是显式 API。ExtensibleScopedRowType 的 `EvaluateTypedBlockSync` 风格脚本级 typed class/new/slot/method/property/projection 执行路径尚未迁移。
4. **Typed runtime effect permission enforcement**：当前 typed runtime context 支持 active effect row 选择 contextual method；C# `ExecutionContext.Invoke` 还会拒绝未被 active effect scope 许可的 effectful method 调用。
5. **Typed runtime value/model parity**：当前 TS typed runtime storage 使用 `any`，缺少 C# `Value`/`ObjectValue`/`ProjectedObjectValue` 风格的显式 typed value boundary。短期以轻量 discriminated runtime value adapter 补齐 primitive/list/map/object/function/projected-object 边界，避免继续把所有值都当作无结构 `any`。
6. **Negative diagnostic parity**：补齐 C# binder 中已经固定的负例，例如 postfix field type annotation 不应静默降级。在当前 TS parser 中该语法已无法进入 binder，因此以 parser-level rejection 测试固定边界。

实现顺序：

- 先补 checker 与 binder 的静态能力：generic function application、perform operation signature、负例 diagnostic。
- 再补 KonTypedRuntimeContext 的运行期能力：effect permission enforcement、typed value adapter、method body/prototype dispatch 的 C# 行为差异。
- 最后接入 RuntimeInterpreter 的显式 typed execution entrypoint，保持默认 untyped 行为不变。

## P18 Typed Runtime Integration 深化

再次对比 ExtensibleScopedRowType 的 C# `EvaluateTypedBlockSync` 与 `KonTypedRuntimeContext` 后，当前 track 继续收敛以下差异：

1. **完整解释器上的 typed runtime bridge**：C# 入口是在完整解释器 runtime 上安装 `TypedRuntimeContext`，再执行脚本块；TS round 6 引入的 `KonTypedBlockEvaluator` 是轻量 evaluator，只覆盖 typed class/new/slot/property/method/projection 的核心路径。本轮应把 `RuntimeInterpreter.EvaluateTypedBlockSync` 改为完整 RuntimeInterpreter 执行，并在 property/method/new hooks 中接入 typed runtime context。
2. **无显式类型字段默认值**：C# typed runtime integration 支持 `(field #count = 10)` 这种 Kon 默认字段语法；TS binder 目前只识别 `knot.Name`，应补充从 field metadata 读取成员名，并把缺省类型按 `Any` 处理。
3. **运行期 `inherit` forwarding**：row materialization 已识别 `inherit`，但 C# `ExecutionContext` 会在运行期为 inherit method 建立转发到 base implementation 的 placeholder。TS typed runtime dispatch 应在 inherit member 没有当前 origin prototype implementation 时查找后续 base implementation。
4. **Kon value / typed object boundary**：C# `KonTypedObject` 是 `KnNode`，`ReadKonField/WriteField` 明确转换 Kon node 与 runtime `Value`。TS 先保持 JS value 表示，但 typed runtime context 必须能读取 RuntimeObject prototype 的 field/method，并让 typed object 穿过完整解释器 property/method 调度。
5. **typed block 静态检查边界**：`KonTypeChecker` 仍主要检查 top-level `fn`。本轮不把 class body 全量静态检查做成半成品，但必须保证 typed block runtime parity 通过 C# 脚本级场景覆盖。

实现顺序：

- 先补 binder 对 field metadata name 和 method attr-before-inout 的解析，保证 C# 风格脚本能进入类型系统。
- 再把 typed runtime context 的 prototype 访问改为 duck-typed RuntimeObject/plain-object 双兼容，并补 inherit forwarding。
- 最后让 `EvaluateTypedBlockSync` 使用完整 RuntimeInterpreter 执行脚本，跳过纯 type/trait 声明，保留 class 声明用于生成 runtime prototype。

## P19 Interpreter-backed Type Computation 与剩余 P0/P1 Gap

再次对比 ExtensibleScopedRowType 后，之前遗漏了一个 P0 级设计差异：C# 版类型系统的 typed runtime 计算以 `RowTypeSystem.Core.Runtime.ExecutionContext` 承载 method dispatch、projection、effect permission、typed value 等运行期语义；TypeScript 版虽然已经让 `EvaluateTypedBlockSync` 复用完整 `RuntimeInterpreter` 执行 typed block，但 `KonTypeBinder`、`KonTypeChecker` 和 `TypeSystem` 的 row/class/generic/effect 计算仍主要是 host TypeScript 直接逻辑。

本轮把“类型计算复用解释器能力”明确为当前 track 的 P0 gap。由于直接把 binder/checker 全量改成语言内脚本会引入过大风险，采用渐进式解释器后端：

1. 新增 `KonTypeComputationRuntime`，在 `RuntimeInterpreter` 上注册 type-system host operations，作为类型计算 kernel。
2. `TypeSystem` 的核心构造与判断入口通过该 kernel 调度：define row、define generic row、instantiate generic row/class、define class、merge row、subtyping、type compatibility。
3. kernel 内部保留 direct/core implementation，避免 runtime host operation 回调造成递归；但 public type-system 入口的计算路径必须经过 `RuntimeInterpreter.callHostFunction`，让类型计算具备可替换、可追踪、可解释器化的边界。
4. `KonTypeBinder`/`KonTypeChecker` 继续负责 AST lowering 与诊断编排，但底层 type construction/subtyping 不再直接散落在 binder/checker 内。

同一轮还补齐新对比得到的 P0/P1 差异：

- **Class body static checking（P0）**：当前 checker 主要检查 top-level `fn` body。应补充 class method、property getter/setter、constructor body 的最小静态检查，先覆盖 `self` typed slot、return stack、setter input、方法体缺失字段等 C# typed runtime scripts 已覆盖的路径。
- **Access modifier static constraints（P1）**：模型和 runtime context 已保存/使用 `public/protected/private/internal`，checker 还需要在 projection 和 external source-level member access 上拒绝 non-public 成员。
- **Subtyping parity tests（P1）**：C# `SubtypingTests` 中 closed target row、row tail subtype、function effect row compatibility、field satisfies getter-shaped row requirement 应在 TS 测试中逐项固定。
- **Negative diagnostic parity（P1）**：C# binder 对 unsupported effect postfix/base reference metadata/type body invalid item 等诊断更明确；TS 版应补充不会静默注册错误成员的测试与必要诊断。

实现顺序：

- 先建立 interpreter-backed type computation kernel，并用 focused tests 证明 `TypeSystem` public API 经过 RuntimeInterpreter host dispatch。
- 再扩展 checker 对 class body/access modifier 的静态检查。
- 最后补齐 C# subtyping/negative diagnostics 对齐测试与全量验证。

## P20 Core Typed Runtime API Parity

再次对比 ExtensibleScopedRowType 后，当前 TS 版本已经覆盖主要 row/generic/effect/class 语义，但仍存在一组更偏 core runtime API 形态和 typed value 边界的差异。本轮继续在当前 track 内收敛这些 gap：

1. **ClassDefinition / MethodBody / MethodBuilder core model**：C# `TypeSystem.DefineClass` 返回并保存 `ClassDefinition(Type, Methods)`，`ExecutionContext` 可直接从类型系统 core 读取 method body。TS 当前只保存 `ClassTypeSymbol`，`methodBodies` 参数未形成可查询 class definition。应新增轻量 `ClassDefinition`、`MethodBody`、`MethodBuilder`，并让 `TypeSystem.RequireClass` 可返回 class definition，同时保持 `RequireClassSymbol` API 不变。
2. **Typed runtime value metadata**：C# runtime value 都携带 `TypeSymbol`。TS 已有 `TypedRuntimeValue.kind`，但未携带类型。应给 typed runtime value 增加可选 `type?: TypeSymbol`，对象/投影对象使用 class rows/projection rows，primitive 使用 registry primitive type，避免继续把 runtime typed value 仅当作 opaque JS value。
3. **Typed runtime globals**：C# `ExecutionContext` 提供 `GetGlobal/SetGlobal`。TS `KonTypedRuntimeContext` 应补充同名全局存储 API，用 typed runtime value 保存并返回原始 JS/Kon 值，支持业务侧把它作为独立 typed runtime context 使用。
4. **Core runtime API facade**：C# 提供 `InvokeWithProjection(instance, targetTypeName, memberName)`。TS 已能 `Project + Invoke`，但缺少同构 facade。应增加等价 helper，便于迁移 C# 测试和业务代码。
5. **Runtime access modifier parity tests**：TS runtime 已有 `IsAccessible` 规则，但缺少 private/protected/internal 的运行期专项测试。本轮补齐 class projection origin-specified access 的测试，固定 runtime 行为。

这些改动不改变 parser，不改变 RuntimeInterpreter 默认 untyped 行为，也不要求把 typed block evaluator 重写成 C# 的 `ExecutionContext`。本轮目标是补齐核心类型运行时 API 与数据边界，让后续如需继续迁移 C# ExecutionContext 能以同构模型推进。

## P21 Typed ExecutionContext Core Parity

再次对比 ExtensibleScopedRowType 的 `RowTypeSystem.Core.Runtime.ExecutionContext` 后，当前剩余差异集中在 typed runtime core 的实现形态，而不是静态 row/generic/effect 规则：

1. **一等 typed ExecutionContext**：C# 版以 `ExecutionContext` 统一承载 `Instantiate/CreateObject/Project/ReadField/WriteField/Invoke/PushEffectScope/GetGlobal/SetGlobal`。TS 版 `KonTypedRuntimeContext` 已覆盖部分外部行为，但内部仍偏 prototype bridge。应新增 `KonTypedExecutionContext`，作为同构 core runtime API。
2. **Value 层级与 method row implementation**：C# 版所有 typed runtime 值都经由 `Value` 层级，并用 `ObjectValue.Rows` 保存 `RowImplementation(FunctionValue)`。TS 应补齐 `IntValue/StringValue/BoolValue/ListValue/MapValue/AnyValue/FunctionValue/ObjectValue/ProjectedObjectValue/RowImplementation/FieldStorage/InvocationContext`，让 method body 可从 `ClassDefinition.Methods` 直接驱动 dispatch。
3. **`Instantiate` 与 `CreateObject` 拆分**：`Instantiate` 应 materialize 字段、method row implementation、trait forwarding、inherit forwarding、real parent storage；`CreateObject` 只构造字段对象。这样保留 C# API 语义，也避免破坏现有 prototype bridge。
4. **KonTypedRuntimeContext core facade**：现有 `KonTypedRuntimeContext` 应持有 core execution context，并暴露 `Instantiate`、core globals 与 projection invocation 的桥接能力；原 `CreateObject(prototype)`、prototype dispatch 和 typed block bridge 行为继续兼容。
5. **Kn/Kon value conversion parity**：TS 仍不引入 C# `KnNode` 继承模型，但 typed execution context 需要提供明确 `ToTypedValue/FromTypedValue` 边界，支持 primitive/list/map/object/projected-object/function/any 的 value wrapping，作为后续更精确 KnNode bridge 的基础。

本轮仍不改变 parser，不改 RuntimeInterpreter 默认 untyped 路径。目标是把 C# typed runtime core 的可迁移形态落到 TS 中，并让业务侧可以选择使用完整 core context 或现有 prototype bridge。

## P22 Final API And Projection Parity

再次对比 C# 测试名和 public API 后，当前 track 继续收敛最后一组偏“API/测试同构”的缺口：

1. **source-level row projection checker**：C# 明确覆盖 merged row projection 到 source row 后限制成员视图。TS `TypeProjection` core 已支持 row-to-row projection，但 checker 需要把 projection target 作为表达式输出类型传播，确保后续 `~`/`.:` member lookup 使用 target view。
2. **origin-specific ExecutionContext API**：C# 公开 `Invoke(instance, memberName, origin)`、`ReadField(instance, memberName, origin?)`、`WriteField(instance, memberName, value, origin?)`。TS core context 内部已有 origin dispatch，应补同构 public facade，便于迁移 C# 测试和业务代码。
3. **Kon value boundary parity in TS terms**：本项目没有 C# `KnInt64/KnString/KnBoolean/KnNull/KnObject/KnArray` 类层级，因此不引入虚假的 C# node 类名。TS 侧以 JS primitive、`KnUnorderedMap`、`KnUndefined` 和 wrapper objects 固定当前 Kon node 边界：primitive 往返、object-like value 保持引用或 map shape，unsupported array 继续拒绝。
4. **builder/helper API parity**：补 `MethodBuilder.FromLambda(owner, name, signature, body, qualifier, access)` 和 `TypeRegistry.CreateFunctionType(..., effectRow)` 兼容入口，降低 C# 测试迁移时的样板代码。
5. **invalid binding executable context boundary**：固定 `KonTypedRuntimeContext.BindSource` invalid declarations 不创建可执行 context 的行为。

这些改动不新增语言语法，不改变 RuntimeInterpreter 默认 untyped 路径，只补齐与 ExtensibleScopedRowType 类型系统迁移相关的剩余 API 和 checker 行为。

## P23 TS API/Model Shape Parity

再次对比 ExtensibleScopedRowType 的类型系统实现后，未发现新的 P0/P1 类型语义缺口；剩余差异集中在 public API 和 TS/C# 模型形态：

1. **KonTypedObject node shape**：C# `KonTypedObject` 继承 `KnNodeBase`。当前 TS 项目没有同构 `KnNodeBase` 层级，因此本轮不强造 C# 继承模型，而是在 `KonTypedObject` 上补 `_Type` 标记，使其能按 TS 现有 node-like 协议被识别。完整 KnNode 继承重塑不属于本 track。
2. **Bind(nodes) facade**：C# `KonTypedRuntimeContext.Bind(IEnumerable<KnNode>)` 可直接绑定 parser nodes。TS 已有 `BindSource` 和 binder `Bind(nodes)`，本轮补 `KonTypedRuntimeContext.Bind(nodes)` facade，降低迁移样板。
3. **C# overload-compatible execution API**：TS 已提供 `InvokeOrigin/ReadFieldOrigin/WriteFieldOrigin` 避免 JS overload 歧义。本轮在保持这些显式 API 的同时，让 `Invoke`、`ReadField`、`WriteField` 支持 C# 参数顺序的 origin overload 形态。
4. **Runtime value constructor ergonomics**：C# `IntValue/StringValue/BoolValue/ListValue/MapValue/AnyValue` 依赖 `RuntimeTypeRegistry`，构造时无需显式传 `TypeSystem`。TS 本轮增加 `KonTypedExecutionContext.InitializeRuntimeTypes(typeSystem)` 静态初始化边界，让 value constructor 可省略 `typeSystem`，但仍保留显式参数以避免多 TypeSystem 场景歧义。
5. **RowMember helper parity**：补 `RowMember.ShouldForward` 和 `EffectContextKey` getter，与 C# public shape 对齐，同时复用现有 row builder 逻辑。

这些补齐仍不改变 parser、不改变 RuntimeInterpreter 默认 untyped 路径；目标是让继续迁移 C# 测试和业务代码时，API friction 更小。

## P24 C# Public API Parity Tightening

用户明确希望 C# public API 也尽量同构。再次对比后，剩余差异仍不是类型系统语义缺口，而是 public API 形态和命名差异。本轮继续在当前 track 内收敛：

1. **`TypeSystem.DefineClass` 返回 `ClassDefinition`**：C# public API 返回 `ClassDefinition`。TS 早期为了方便直接返回 `ClassTypeSymbol`，本轮改为返回 `ClassDefinition`，并给 `ClassDefinition` 提供 `Name`、`Rows`、`MethodResolutionOrder` 等委托 getter，降低既有 TS 调用破坏；需要 class symbol 的调用应使用 `.Type` 或 `RequireClassSymbol`。
2. **Value-level typed runtime facade**：C# `KonTypedRuntimeContext.ReadField` 返回 `Value`，`WriteField` 接收 `Value` 或 `KnNode`。TS 现有外层 facade 已服务 JS-value bridge，因此不破坏 `ReadField/WriteField` 既有语义；新增 `ReadValueField`、`WriteValueField`、`WriteNodeField` 作为 C# value-level 对齐入口。
3. **`EffectHandlerBinding.ImplementationFunctionName` alias**：C# 字段名是 `ImplementationFunctionName`。TS 保留现有 `FunctionName`，同时新增同名 alias，避免迁移 C# 侧调用时需要重写字段名。
4. **诊断文案收敛**：`ApplyEffectHandler` unknown/no-op 与 `ValidateClosedEffectBoundary` 的 message 更贴近 C# 文案；诊断 code 不变。

不做：不把 TS 的 `KonTypedObject` 强行改成完整 C# `KnNodeBase` 继承层级，也不移除现有 JS-value bridge API。

## P25 KonTypedObject Node Model Parity

再次对比后，用户明确只收敛一个剩余 gap：C# `KonTypedObject : KnNodeBase`，而 TS 版此前只是 `_Type = Unknown` 的 node-like 标记。

当前 TS 项目没有统一 `KnNodeBase` 继承层级，现有 parser/model/formatter/runtime 都以 `_Type: KnNodeType` 作为节点协议。因此本轮采用 TS 模型中的同构修正：

1. 新增专用 `KnNodeType.KonTypedObject`，让 typed object 不再伪装成 `Unknown`。
2. `KonTypedObject` 暴露该专用 `_Type`，`KnNodeHelper.GetType` 可按普通节点识别。
3. formatter 对 typed object 给出稳定占位输出，避免 typed object 穿过格式化边界时报 unsupported type。
4. 不引入全局 `KnNodeBase` 重构；如果未来项目统一 KnNode 继承层级，再把 `KonTypedObject` 迁移到该基类。
