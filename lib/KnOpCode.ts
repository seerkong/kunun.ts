export enum KnOpCode {
    OpStack_LandSuccess = 'OpStack_LandSuccess',
    OpStack_LandFail = 'OpStack_LandFail',

    ValStack_PushFrame = 'ValStack_PushFrame',
    ValStack_PopFrameAndPushTopVal = 'ValStack_PopFrameAndPushTopVal',
    ValStack_PopFrameIgnoreResult = 'ValStack_PopFrameIgnoreResult',
    ValStack_PushValue = 'ValStack_PushValue',
    ValStack_PopValue = 'ValStack_PopValue',
    ValStack_Duplicate = 'ValStack_Duplicate',
    ValStack_IsTopValTrue = 'ValStack_IsTopValTrue',

    // 新增调用流程的环境树节点
    Env_DiveProcessEnv = 'Env_DiveProcessEnv',
    // 新增调用子代码块的环境树节点
    Env_DiveLocalEnv = 'Env_DiveLocalEnv',
    Env_Rise = 'Env_Rise',
    Env_ChangeEnvById = 'Env_ChangeEnvById',
    Env_Lookup = 'Env_Lookup',
    Env_DeclareGlobalVar = 'Env_DeclareGlobalVar',
    Env_DeclareLocalVar = 'Env_DeclareLocalVar',
    Env_SetGlobalEnv = 'Env_SetGlobalEnv',
    Env_SetLocalEnv = 'Env_SetLocalEnv',
    Env_BindEnvByMap = 'Env_BindEnvByMap',


    Ctrl_ApplyToFrameTop = 'Ctrl_ApplyToFrameTop',
    Ctrl_ApplyToFrameBottom = 'Ctrl_ApplyToFrameBottom',
    Ctrl_Jump = 'Ctrl_Jump',
    Ctrl_JumpIfFalse = 'Ctrl_JumpIfFalse',
    Ctrl_IterConditionPairs = 'Ctrl_IterConditionPairs',
    Ctrl_IterForEachLoop = 'Ctrl_IterForEachLoop',
    Ctrl_IterForLoop = 'Ctrl_IterForLoop',
    Ctrl_MakeContExcludeTopNInstruction = 'Ctrl_MakeContExcludeTopNInstruction',
    Ctrl_JsCall = 'Ctrl_JsCall',
    Ctrl_JsApply = 'Ctrl_JsApply',

    // 在runnable和suspend中间的一种状态，
    // 需要等待下一步命令（比如人的交互），但同时也是一种runnable的状态
    // 接收resume指令后，进入running状态
    Ctrl_CurrentFiberToIdle = 'Ctrl_CurrentFiberToIdle',
    // 挂起，等待其他流程结束、io、lock、sleep到期、等等情况。
    // 接收resume指令后，进入running状态
    Ctrl_CurrentFiberToSuspended = 'Ctrl_CurrentFiberToSuspended',
    // 唤醒多个fiber , memo 是个fiber id的array
    Ctrl_AwakenMultiFibers = 'Ctrl_AwakenMultiFibers',
    // 唤醒上级bpevent的fiber, 将自己这个fiber状态修改
    YieldToParentAndChangeCurrentFiberState = 'YieldToParentAndChangeCurrentFiberState',
    // 将当前流程设置到指定状态，resume 指定的fiber
    YieldToFiberAndChangeCurrentFiberState = 'YieldToFiberAndChangeCurrentFiberState',
    Ctrl_FinalizeFiber = 'Ctrl_FinalizeFiber',

    Node_RunNode = 'Node_RunNode',
    Node_RunLastVal = 'Node_RunLastVal',
    Node_MakeVector = 'Node_MakeVector',
    Node_MakeMap = 'Node_MakeMap',
    Node_IterOpenKnotNode = 'Node_IterOpenKnotNode',
    Node_MakeKnotNode = 'Node_MakeKnotNode',
    Node_MakeKnotChain = 'Node_MakeKnotChain',
    Node_IterEvalKnotClause = 'Node_IterEvalKnotClause',
    Node_RunBlock = 'Node_RunBlock',
    Node_MakeUnquote = 'Node_MakeUnquote',
    Node_RunGetProperty = 'Node_RunGetProperty',
    Node_RunSetProperty = 'Node_RunSetProperty',
    Node_RunGetSubscript = 'Node_RunGetSubscript',
    Node_RunSetSubscript = 'Node_RunSetSubscript',
    Node_RunMakeSubscript = 'Node_RunMakeSubscript',
}