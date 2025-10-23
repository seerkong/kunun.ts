# 变更：登记 kunun 语言实现缺陷（parser-syntax / runtime-interpreter）

## 背景和动机 (Context And Why)

在编写 kunun 语言手册（`skill/reference/` + `skill/dynamic-workflow/`）期间，对全代码库做了深读 + 对抗式验证（数百个示例对真实 parser/runtime 实跑）。过程中暴露出一批实现缺陷与 broken 功能：有的返回错误结果、有的让 parser 崩溃、有的静默吞掉输入而不报错。这些问题分散在 `parser-syntax` 与 `runtime-interpreter` 两个 capability，缺乏统一登记，容易在后续开发中被重复踩坑（本次写手册时即多次踩中）。

本 track 把这些缺陷**集中登记为状态真源**，并为每个缺陷预置 TDD 修复任务，但**不立即实现**——获批后可按优先级择机 `codument-implement`。

## "要做"和"不做" (Goals / Non-Goals)

**目标:**
- 把 8 个已复现缺陷登记为 `parser-syntax` / `runtime-interpreter` 的行为增量（期望行为 + given/when/then，含当前错误现状）。
- 为每个缺陷预置「失败测试 + 修复」的 TDD 任务对，附优先级与验收。
- 为已正确的相邻行为加 regression guard（bare/infix 逻辑、`Concat` 二参、正常 block 求值）。
- 顺带登记 converter / HostSupport 死代码清理。

**非目标:**
- 不在本 track 立即修复（这是登记型 track，实现延后）。
- 不改 parser 语法 surface（除非修复 D2/D3 必需）。
- 不在此处决定 D3/D5/D6 的最终语义口径（留实现期决策，见 `analysis/findings.md` Open Questions）。
- 不触碰类型系统（type-system）相关行为。

## 变更内容（What Changes）

登记以下缺陷（均已实测复现，详见 `analysis/findings.md`）：

- **D1（P0，runtime-interpreter）** colon 前缀逻辑运算 `(:and a b)`/`(:or a b)` 返回错误布尔（`(:and true true)`→`false`）。
- **D4（P0，runtime-interpreter）** `Concat` 三参及以上丢值（`(Concat "a" "b" "c")`→`"c"`）。
- **D2（P1，parser-syntax）** `^` 后缀在 EOF 处 parser 崩溃（`Parse("a^")`→`End of stream`）。
- **D3（P1，parser-syntax）** 连字符 head/symbol 静默截断（`#foo-bar`→`#`；`(foo-bar 1 2)` 丢 `-bar`）。
- **D6（P1，runtime-interpreter）** `EvalBlockSourceSync` 与 `ExecSync` 对顶层 `$` 宏行为不一致（block 抛 `End of stream`）。
- **D8（P1，runtime-interpreter）** 未知前缀词静默 no-op（`(totallyUnknownWord 1 2)`→`2`，不报错）。
- **D5（P2，runtime-interpreter）** `<` 死循环 / `>` 抛错、失败模式不一致；缺 `!=`/`not`。
- **D7（P2，hygiene）** converter 死代码（`lib/Lexer.ts`、`lib/Token.ts`、`Common/Token.ts`、`Common/IndexStream.ts`）与部分 HostSupport 死代码清理。

> 其中 D1、D4、D8 涉及**可观察行为变化**（原来「静默错误/无错」变为「正确/报错」），实现时按 **BREAKING** 谨慎评估对既有脚本的影响。

## 影响范围（Impact）

- 受影响的能力（behaviors）：`parser-syntax`（D2/D3 + 死代码）、`runtime-interpreter`（D1/D4/D5/D6/D8 + 死代码）。
- 受影响的代码（实现期）：
  - `packages/converter/lib/KnParserV1.ts`（D2 suffix-complement、D3 hyphen head、D6 `$` 路由相关）
  - `packages/converter/lib/Lexer/Lexer.ts`（D3）
  - `packages/runtime/lib/RuntimeInterpreter/RuntimeInterpreter.ts`（D1 逻辑分派、D6 block/node 入口、D8 未知 head）
  - `packages/runtime/lib/HostSupport/StringFunctions.ts`（D4 `Concat`）
  - 死代码文件删除（D7）
- 测试：每缺陷新增失败测试到对应包的 `__tests__/`。
