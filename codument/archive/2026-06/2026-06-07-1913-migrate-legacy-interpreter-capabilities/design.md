# 设计：旧解释器能力迁移

## 目标

本 track 的目标是把旧解释器中仍然有价值、且不依赖旧 table 对象系统的运行时能力迁移到新 RuntimeInterpreter。迁移完成后，新解释器应当成为业务侧优先使用的解释器基座，并具备删除旧解释器代码的前置条件。

## async/fiber 与 workflow checkpoint 的关系

旧异步 host / timer / fiber 能力和新的 workflow checkpoint 都涉及暂停与恢复，但它们不是同一个语义层级。

相同点：

- 都需要保存未完成的 continuation。
- 都依赖 instruction stack、operand stack、当前 fiber、环境和控制帧等状态。
- 都不能依赖 JavaScript 调用栈保留未来要执行的代码位置。
- 都要求恢复时能把外部结果注入到后续执行位置。

差异点：

- 旧 async/fiber 是解释器内部的低层暂停恢复与调度能力，可用于普通业务运行时。
- workflow checkpoint 是 coding-agent workflow 扩展的安全点机制，偏 durable、host-orchestrated、显式 checkpoint。
- 旧 async/fiber 不要求只能在 workflow safe-point 停止；它可以作为 timer、host callback、fiber yield 等调度原语出现。
- workflow checkpoint 可以复用底层 continuation/fiber 快照原则，但不应替代旧 async/fiber 语义。

因此，本 track 迁移旧 async/fiber 时应复用新 RuntimeInterpreter 的指令栈和 fiber 状态模型，但保持它作为低层运行时能力独立存在。

## 迁移范围

### 必须迁移

- `await_host_fn` 风格异步 host 调用。
- `set_timeout` / `set_interval` 风格 timer 调度。
- 旧 scheduler opcodes 对应语义：
  - 当前 fiber 转 idle。
  - 当前 fiber 转 suspended。
  - 唤醒多个 fiber。
  - yield 到 parent 并改变当前 fiber 状态。
  - yield 到指定 fiber 并改变当前 fiber 状态。
  - finalize fiber。
- `MakeFuncSync` 的 reusable 行为。
- 旧语法糖和小能力：
  - `func` 作为 `fn` 兼容别名。
  - `do` / `main` 块包装。
  - `--`、`+=`、`-=`、`*=`、`/=`。
  - `def_to`、`set_to`、`save_operands`。
  - JS interop 兼容别名，如 `js_call` / `js_apply`，在不破坏新 host bridge 的前提下映射到新实现。
  - 常用 host alias，如 `Writeln`、`append`、`>=`、`<=`、`console`、`clear_interval`。

### 不迁移

- 旧 table 对象系统。
- 类型系统。
- 旧解释器内部实现结构本身。

## 链式赋值兼容

当前语法中 `=` 已用于数据表示：

- map key-value 分隔符。
- knot metadata 分隔符。
- 配置对象字段。
- workflow 配置字段。
- parser 配置中的 value flag。

因此不能把 `=` 提升为通用赋值 infix。兼容策略是：

- 只在 knot chain 表达式层识别明确目标的赋值。
- 支持 `target.:field = value`。
- 支持 `target.:field := value`。
- 赋值目标必须是可写链式访问目标，例如属性访问或下标访问。
- map、metadata、configuration、in/out table 等数据上下文仍按数据语法解析。
- 推荐新代码继续使用显式 `set`/`set_to` 或当前运行时已有的对象写入能力；链式 `=`/`:=` 主要用于旧脚本兼容。

## 实现路线

1. 从旧解释器读取 async/timer/fiber 和 scheduler 行为，建立 RuntimeInterpreter 对应 opcode 或 runtime operation。
2. 在 RuntimeState 中补齐 fiber state transition、wake、yield、finalize、timer handle、host async result 注入等基础能力。
3. 在 RuntimeInterpreter prefix/infix expander 中增加兼容语法入口，并保持指令栈展开实现。
4. 为 `MakeFuncSync` 增加 reusable 兼容选项，避免每次 host 调用都错误复用或错误丢失运行时状态。
5. 补充 RuntimeInterpreter 脚本资源和测试，优先覆盖行为而不是复刻旧内部结构。
6. 形成旧解释器删除前检查清单。真正删除旧解释器代码应在迁移测试稳定后执行，必要时另开清理 track。

## 风险与防护

- `=` 语义污染风险：通过限制到链式目标表达式规避。
- async/timer 测试不稳定风险：测试中应使用 mock clock 或显式可控 host promise，而不是依赖真实 wall clock。
- fiber 调度顺序漂移风险：测试需要覆盖 runnable/suspended/finalized 状态转换和 deterministic resume 顺序。
- interop alias 污染风险：别名应映射到新 host bridge，而不是恢复旧全局 registry 依赖。
