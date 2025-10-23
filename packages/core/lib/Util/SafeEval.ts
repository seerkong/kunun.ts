export class SafeEval {
  /**
   * 安全地执行动态代码
   * @param code 要执行的代码
   * @param context 执行上下文
   * @returns 执行结果
   */
  static execute(code: string, context: Record<string, any> = {}): any {
    // 创建参数列表
    const args = Object.keys(context);
    const values = args.map(key => context[key]);
    
    // 创建函数体
    const body = `return ${code}`;
    
    try {
      // 使用 Function 构造函数创建函数
      const fn = new Function(...args, body);
      // 执行函数
      return fn.apply(null, values);
    } catch (error) {
      console.error('Error executing code:', error);
      throw error;
    }
  }
} 