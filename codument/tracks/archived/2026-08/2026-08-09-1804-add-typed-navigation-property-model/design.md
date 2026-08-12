# Design: typed navigation property model

## 上下文

Kunun 当前同时存在三类相近但不同的概念：

- class `field`：存储型 value member，已进入 type-system row；
- runtime `prop`：getter/setter accessor，runtime 可执行，但 binder 不建立 property row member；
- top-level `relation`：schema/ontology edge，不是 class navigation property。

本 track 只补全第二类在类型系统中的静态、programmatic 表达，不改变 top-level relation 的独立用途。

## 方案概览

1. Public member kind
   - 新增 `RowMemberKind = Field | Property | Method | Spread`。
   - `RowMember.Kind` 是 canonical discriminator。
   - 保留 `IsMethod`，并新增 `IsField`、`IsProperty`、`IsSpreadParameter` 派生查询。
   - 保持 `RowMember` 第五个 boolean `IsMethod` 位置参数；`Kind` 进入 options。未显式 kind 的 method/non-method 分别默认为 Method/Field，options 中矛盾的 kind 与 boolean 必须拒绝。
   - `WithType`、`WithEffectContext`、effective-access、generic substitution、trait forwarding 和 inheritance row rebuild 必须同时保留 Kind、Metadata、Access 与 EffectContext。

2. Typed property source syntax
   - canonical typed property 只接受 `firstTypePrefix` 显式类型，例如 `(!Shop prop #shop)`；本 track 不定义第二种 property type contract。
   - collection property 使用普通 Kunun type reference，例如 `(!List<Shop> prop #orders)`；core 只保留类型结构，不解释 ORM cardinality。
   - 现有 `(prop #data get ... set ...)` 若无显式类型，继续走 accessor/runtime 路径，不凭 getter body 猜测 schema 类型。

3. Binding
   - property 只允许出现在 class 和 trait body；普通 `type` row、schema 与 mixin 中的 `prop` 产生稳定 diagnostic，不能因共享 `BindMember` 而被误收。
   - class/trait binding 的 member context 显式允许 `prop` 分支。
   - 只有存在 `firstTypePrefix` 时才建立 typed property member；缺失类型不静默建成 `Any` field。
   - property 使用 `ReadTypeMetadata` 保留 prefix annotations、config 和 source metadata。

4. Code-first authority
   - programmatic API 使用 `RowMemberBuilder.Property(origin, name, type, ...)`。
   - caller 继续通过 `TypeSystem.DefineClass` 建 class；不新增第二套 class builder graph。
   - 同一模型的 source binding 与 programmatic construction 必须在 name、kind、type、access、qualifier 和 metadata 上结构等价。

5. Typed runtime/checker compatibility
   - property 是 value member，静态 member read/write resolution 与 field 同类，但保持独立 kind。
   - class storage field enumeration、constructor defaults 和 field-only projections不得把 property 当 field。
   - typed property 的声明类型约束 getter 返回值和 setter value 参数。显式 `get_x` / `set_x` method signature 如存在，也必须与 property 类型兼容；property type 是 schema authority。
   - typed property 自身携带 inline `get` / `set` body 时，runtime 必须直接注册并调用这些 accessor；不得要求 caller 额外声明同名或 `get_x` / `set_x` 影子 Method member 才能执行。
   - 若同时存在显式伴生 getter/setter Method，其 signature 只是实现侧 contract：getter 的唯一返回类型、setter 的 value 输入类型必须与 Property 类型兼容；不兼容时 checker 产生稳定 diagnostic，且不得用 Method signature 覆盖 Property 类型。
   - accessor-only property 没有 typed member 时继续使用现有 getter/setter method signature 检查。
   - typed property 可以是 model-only。缺少 getter/setter 时，type binding 合法；一旦 runtime 执行尝试读取或写入，必须抛出 property-specific missing-accessor error，不得回退读取 field storage。

6. Kind compatibility and resolution
   - Field 只结构满足 Field；Property 只结构满足 Property；Method 只结构满足 Method。
   - 保留现有 Field 满足零参数单返回 Method 的 legacy slot adaptation；Property 不参与该 adaptation。
   - Spread 只用于 row expansion，不参与普通同名 member compatibility。
   - slot access 只选择 non-method value members，receiver call 只选择 Method。
   - 同一 class/trait origin 内不允许 Field/Property/Method 同名；binder 产生 diagnostic。
   - inheritance 中同名 override/inherit 必须保持 member kind；跨 kind replacement 明确失败。
   - member identity/de-duplication 包含 Kind，且 row construction 对同名跨 kind 冲突执行显式检查。

## 决策摘要

- property 是 class member，不是 field alias，也不是 schema relation primitive。
- typed property 必须显式声明类型；不从 accessor body 或 storage field 推断。
- Kunun core 保留任意 metadata，但 ORM 语义由外部 annotation package解释。
- 现有 public boolean compatibility 保留，canonical 新 API 使用 member kind。

## 风险 / 权衡

- 许多现有路径用 `!member.IsMethod` 代表 field；必须逐处分类为 value-member 或 storage-field 判断。
- runtime-only accessor 与 typed navigation property 共用 `prop` 关键字；显式类型是稳定 admission boundary。
- collection target 可能只是未解析 `TypeReferenceSymbol`；这是合法 symbolic reference，不应强制导入目标 class 后才能建模。

## 兼容性设计

- 旧 field/method constructors 和 tests 不要求立即改写。
- accessor-only property 继续运行。
- top-level relation/schema ontology API 保持不变。
- 下游应迁移到 `Kind` / `IsProperty`，不再用 `!IsMethod` 推断 storage field。
- public constructor 保留第五个 boolean 参数，避免现有 caller 发生机械破坏；新 code-first caller 使用 RowMemberBuilder。

## 迁移计划

1. 添加 characterization 与 member-kind tests。
2. 实现 member kind 和 builder。
3. 实现 typed property binding 与 metadata preservation。
4. 实现 kind compatibility、同名/继承冲突、typed inline accessor runtime 和伴生 method signature compatibility。
5. 审计 typed contexts 中 field-only、value-member 与 model-only property runtime checks。
6. 添加 source/programmatic equivalence 和全量验证。
