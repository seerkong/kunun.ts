export class ArrayExt {
  public static AddAll<T>(lhs: T[], rhs: Set<T>) {
    for (let v of rhs) {
      lhs.push(v);
    }
  }

  public static FromSet<T>(set: Set<T>) {
    let r : T[] = [];
    for (let v of set) {
      r.push(v);
    }
    return r;
  }

  public static Contains(arr: any[], item: any) : boolean {
    if (arr == null) {
      return false;
    }
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === item) {
        return true;
      }
    }
    return false;
  }
}