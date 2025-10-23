# Decisions

## Usage
- 决策记录

### 1. 【P0】depa-actor 依赖方式
- 选项：A) vendor 进仓库 B) 发布 npm C) git 依赖
- 评估：npm registry 仅有 0.1.2（本地需要 0.2.0，发布权在用户）；git 远端 0.2.0 推送与构建状态不可确认；vendor tgz 完全自包含。
- 最终决策：A —— `npm pack` 产出 vendor/depa-actor-0.2.0.tgz，kunun-runtime 以相对 file: 路径引用
- 决策理由：零网络/发布依赖，fresh clone 即可复现；未来 0.2.x 发布 npm 后可平滑切换。
- 状态：confirmed（2026-06-11）
