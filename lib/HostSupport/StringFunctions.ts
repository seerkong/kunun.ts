export class StringFunctions {
    public static Append(...args) {
      let r = '';
      for (let i = 0; i < args.length; i++) {
        r += args[i];
      }
      return r;
    }
}