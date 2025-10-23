import { ArrayExt } from "../Util/ArrayExt";
import { MapExt } from "../Util/MapExt";
import { SetExt } from "../Util/SetExt";
import { SingleEntryGraphNode } from "./SingleEntryGraphNode";

/**
 * 单入口的图的基础数据结构操作。
 * 其中 M  是指图中节点的详细类型，T： Long 是只节点的id是什么类型，比如Long 或者String. 用于区分节点
 */
export class SingleEntryGraph<M extends SingleEntryGraphNode<T>, T> {
  protected vertexDetailMap: Map<T, M> = new Map();
  protected vertexIds: Set<T> = new Set();
  protected entryVertexId: T = null;
  protected nextIdsMap: Map<T, Set<T>> = new Map();
  protected prevIdsMap: Map<T, Set<T>> = new Map();

  constructor() {

  }

  public SetEntryVertexId(rootId: T) {
    this.entryVertexId = rootId;
  }

  public GetEntryVertexId(): T {
    return this.entryVertexId;
  }

  public GetEntryVertex(): M {
    return this.vertexDetailMap.get(this.entryVertexId);
  }

  public GetNextIdsMap(): Map<T, Set<T>> {
    return this.nextIdsMap;
  }

  public GetNextIds(vertextId: T): Set<T> {
    if (this.nextIdsMap.has(vertextId)) {
      return this.nextIdsMap.get(vertextId);
    }
    else {
      return new Set<T>();
    }
  }

  public GetNextVertexDetails(vertexId: T): Set<M> {
    let nextIds = this.GetNextIds(vertexId);
    return this.GetVertexDetailsByIds(nextIds);
  }

  // 添加顶点
  public AddVertex(vertexDetail: M) {
    if (this.vertexIds.has(vertexDetail.GetVertexId())) {
      return;
    }
    this.vertexDetailMap.set(vertexDetail.GetVertexId(), vertexDetail);
    this.vertexIds.add(vertexDetail.GetVertexId());
  }



  // 删除一个图的顶点的同时，删除关联的边
  private RemoveVertexAndNeighborEdges(vertexId: T) {
    // 拷贝前后关系引用，防止在删除边时集合数据被删
    let vertexNextIds: Set<T> = MapExt.CopySetValue(this.nextIdsMap, vertexId);
    let vertexPrevIds: Set<T> = MapExt.CopySetValue(this.prevIdsMap, vertexId);

    // 在此节点的后节点集合中，依次删掉 prev id是这个节点的边
    for (let nextVertexId of vertexNextIds) {
      this.RemoveEdge(vertexId, nextVertexId);
    }

    // 在此节点的前节点集合中，依次删掉 next id是这个节点的边
    for (let prevVertexId of vertexPrevIds) {
      this.RemoveEdge(prevVertexId, vertexId);
    }

    this.vertexDetailMap.delete(vertexId);
    this.vertexIds.delete(vertexId);
  }

  // 删除一个图的顶点的同时，将关联的边连接起来
  public RemoveVertexAndConnectNeighborEdges(vertexId: T) {
    // 拷贝当前这个节点的前后关系, 以防在删除节点和关联边时，引用的前后关系被清掉
    let vertexNextIds: Set<T> = MapExt.CopySetValue(this.nextIdsMap, vertexId);
    let vertexPrevIds: Set<T> = MapExt.CopySetValue(this.prevIdsMap, vertexId);

    this.RemoveVertexAndNeighborEdges(vertexId);

    // 为这个顶点的每一个prev node, 添加next id
    for (let vertexPrevId of vertexPrevIds) {
      for (let vertextNextId of vertexNextIds) {
        this.AddEdge(vertexPrevId, vertextNextId);
      }
    }
  }

  // 添加边
  public AddEdge(prevId: T, nextId: T) {
    // 先验证这个边的两个顶点是否已经添加到图中
    if (!this.vertexIds.has(prevId) || !this.vertexIds.has(nextId)) {
      return;
    }
    let nextIds: Set<T> = MapExt.ComputeIfAbsent(this.nextIdsMap, prevId, (id) => new Set<T>());
    let prevIds: Set<T> = MapExt.ComputeIfAbsent(this.prevIdsMap, nextId, (id) => new Set<T>());
    nextIds.add(nextId);
    prevIds.add(prevId);
  }

  // 删除边
  public RemoveEdge(prevId: T, nextId: T) {
    let nextIds: Set<T> = MapExt.ComputeIfAbsent(this.nextIdsMap, prevId, (id) => new Set<T>());
    let prevIds: Set<T> = MapExt.ComputeIfAbsent(this.prevIdsMap, nextId, (id) => new Set<T>());

    // 在 prevId 的next ids中，删除 nextId
    nextIds.delete(nextId);
    if (nextIds.size <= 0) {
      this.nextIdsMap.delete(prevId);
    }

    // 在 nextId 的prev ids中，删除 prevId
    prevIds.delete(prevId);
    if (prevIds.size <= 0) {
      this.prevIdsMap.delete(nextId);
    }
  }

  // 在某些顶点的后面，整体添加一个单入口有向无环图
  // 注意此方法，不是在图中的某些阶段后插入一张图，本方法不会设置被添加的图的终结节点连接添加到的图的某些节点的边
  public AppendDAG<R extends SingleEntryGraph<M, T>>(appendAfterVertexIds: Set<T>, otherDAG: R): R {
    if (otherDAG == null) {
      return;
    }
    let otherEntryVertexId: T = otherDAG.GetEntryVertexId();
    let otherReachableVertexes: Set<M> = otherDAG.GetReachableVertexes();
    let otherNextIdsMap: Map<T, Set<T>> = otherDAG.GetNextIdsMap();

    // 将被追加的图的所有顶点，加入这个图的顶点中
    for (let otherReachableVertex of otherReachableVertexes) {
      this.AddVertex(otherReachableVertex);
    }

    // 将另一张图的入口，和这一个图关联起来
    for (let appendAfterVertexId of appendAfterVertexIds) {
      this.AddEdge(appendAfterVertexId, otherEntryVertexId);
    }

    // 将另一张图的所有边，加入到这个图中
    for (let [vertexEdgesStartId, vertexEdgesEndIds] of otherNextIdsMap) {
      for (let vertexEdgesEndId of vertexEdgesEndIds) {
        this.AddEdge(vertexEdgesStartId, vertexEdgesEndId);
      }
    }
  }

  // 从图的入口节点，可以访问到的节点
  public GetReachableVertexes(): Set<M> {
    let reachableVertexIds: Set<T> = this.GetReachableVertexIds();
    let result: Set<M> = new Set<M>();
    for (let vertexId of reachableVertexIds) {
      let detail: M = this.vertexDetailMap.get(vertexId);
      result.add(detail);
    }
    return result;
  }

  public GetVertexesIncludeUnreachable(): Set<M> {
    return MapExt.NewValuesSet(this.vertexDetailMap);
  }

  public GetVertexeIdsIncludeUnreachable(): Set<T> {
    return SetExt.CreateBySet(this.vertexIds);
  }

  // 从图的入口节点，无法访问到的节点
  public GetUnreachableVertexeIds(): Set<T> {
    let reachableVertexIds: Set<T> = this.GetReachableVertexIds();
    let unreachableVertexIds: Set<T> = SetExt.CreateBySet(this.vertexIds);
    SetExt.RemoveAll(unreachableVertexIds, reachableVertexIds);
    return unreachableVertexIds;
  }
  public GetUnreachableVertexes(): Set<M> {
    let unreachableVertexIds: Set<T> = this.GetUnreachableVertexeIds();
    let result: Set<M> = new Set<M>();
    for (let vertexId of unreachableVertexIds) {
      let detail: M = this.vertexDetailMap.get(vertexId);
      result.add(detail);
    }
    return result;
  }

  // 获取从入口顶点能到达的所有顶点，包含入口顶点
  public GetReachableVertexIds(): Set<T> {
    // 广度优先搜索，遍历这个图
    return this.QueryReachableVertexIds(this.nextIdsMap, this.entryVertexId, true);
  }

  public GetAllVertexDetailsFromEntryToVertex(queryFromVertexId: T, includeSelf: Boolean): Set<M> {
    let prevVertexIds: Set<T> = this.GetAllVertexIdsFromEntryToVertex(queryFromVertexId, includeSelf);
    return this.GetVertexDetailsByIds(prevVertexIds);
  }

  // 从入口到queryFromVertexId的所有可能路径的集合
  public GetAllVertexIdsFromEntryToVertex(queryFromVertexId: T, includeSelf: Boolean): Set<T> {
    let prePathIds: Set<T> = new Set<T>();
    if (includeSelf) {
      prePathIds.add(queryFromVertexId);
    }
    let queue: T[] = [];
    queue.push(queryFromVertexId);
    let visited: Set<T> = new Set<T>();

    while (queue.length > 0) {
      // 每轮循环中 获取当前一层的所有节点的
      let levelSize = queue.length;
      for (let i = 0; i < levelSize; i++) {
        let vertexId: T = queue.shift();
        if (visited.has(vertexId)) {
          continue;
        }
        visited.add(vertexId);
        let prevVertexIds: Set<T> = MapExt.getOrDefault(this.prevIdsMap, vertexId, new Set<T>());
        SetExt.AddAll(prePathIds, prevVertexIds);
        ArrayExt.AddAll(queue, prevVertexIds);
      }
    }
    return prePathIds;
  }

  // 广度优先搜索，遍历这个图.
  private QueryReachableVertexIds(nextIdsMap: Map<T, Set<T>>, fromId: T, includeFromId: Boolean): Set<T> {
    let result: Set<T> = new Set<T>();
    if (includeFromId) {
      result.add(fromId);
    }
    let queue: T[] = [];
    queue.push(fromId);
    let visited: Set<T> = new Set<T>();

    while (queue.length > 0) {
      // 每轮循环中 获取当前一层的所有节点的
      let levelSize = queue.length;
      for (let i = 0; i < levelSize; i++) {
        let vertexId: T = queue.shift();
        if (visited.has(vertexId)) {
          continue;
        }
        visited.add(vertexId);
        let nextVertexIds: Set<T> = MapExt.getOrDefault(this.nextIdsMap, vertexId, new Set<T>());
        SetExt.AddAll(result, nextVertexIds);
        ArrayExt.AddAll(queue, nextVertexIds);
      }
    }

    return result;
  }

  // 获取图中的终结节点
  // 起始点只有一个，终结节点可能会有多个
  public GetEndVertexIds(): Set<T> {
    let result: Set<T> = new Set<T>();
    let reachableVertexIds: Set<T> = this.GetReachableVertexIds();
    for (let vertexId of reachableVertexIds) {
      let nextIds: Set<T> = MapExt.getOrDefault(this.nextIdsMap, vertexId, new Set<T>());
      // 终结节点的特征是在 nextIdsMap 中没有后续节点
      if (nextIds.size <= 0) {
        result.add(vertexId);
      }
    }
    return result;
  }

  public GetPrevVertexIds(vertexId: T): Set<T> {
    let prevVertexIds: Set<T> = MapExt.getOrDefault(this.prevIdsMap, vertexId, new Set<T>());
    return SetExt.CreateBySet(prevVertexIds);
  }

  public GetPrevVertexesById(vertexId: T): Set<M> {
    let prevVertexIds: Set<T> = this.GetPrevVertexIds(vertexId);
    return this.GetVertexDetailsByIds(prevVertexIds);
  }

  public GetVertexDetailsByIds(vertexIds: Set<T>): Set<M> {
    let result: Set<M> = new Set<M>();
    for (let id of vertexIds) {
      let vertexDetail: M = this.vertexDetailMap.get(id);
      result.add(vertexDetail);
    }
    return result;
  }

  // 根据顶点的id，获取顶点的详情
  public GetVertexDetail(vertexId: T): M {
    return this.vertexDetailMap.get(vertexId);
  }

}