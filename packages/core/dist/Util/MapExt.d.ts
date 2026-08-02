export declare class MapExt {
    static CopySetValue<T>(map: Map<T, Set<T>>, key: T): Set<T>;
    static NewValuesSet<K, V>(map: Map<K, V>): Set<V>;
    static getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V): V;
    static ComputeIfAbsent<K, V>(map: Map<K, V>, key: K, defaultProvider: (k: K) => V): V;
}
