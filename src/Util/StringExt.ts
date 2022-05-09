export class StringExt {
  public static Repeat(str: string, times: number) {
    let r = "";
    for (let i = 0; i < times; i++) {
      r += str;
    }
    return r;
  }

  public static Join(str: string[], separator: string) {
    return str.join(separator);
  }
}