export class SetExt {
  public static CreateBySet<T>(values: Set<T>) : Set<T> {
    let r = new Set<T>();
    for (let v of values) {
      r.add(v);
    }
    return r;
  }

  public static AddAll<T>(lhs : Set<T>, rhs : Set<T>) {
    for (let v of rhs) {
      lhs.add(v);
    }
  }

  public static RemoveAll<T>(lhs : Set<T>, rhs : Set<T>) {
    for (let v of rhs) {
      lhs.delete(v);
    }
  }
}