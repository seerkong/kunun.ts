import { Instruction } from "../../StateManagement/InstructionStack";
import { XnlOpCode } from "../../KnOpCode";
import XnlState from "../../KnState";
import { KnNodeHelper } from "../../Util/KnNodeHelper";
import { ArrayExt } from "../../Util/ArrayExt";
import { FieldPropMeta } from "../../Model/FieldPropMeta";
import { CalcPropMeta } from "../../Model/CalcPropMeta";
import { KnPropertyFunc } from "../../Model/KnPropertyFunc";
import { KnTuple } from "../../Model/KnTuple";
import { TableMeta } from "../../Model/TableMeta";
import { FieldStorageMeta } from "../../Model/FieldStorageMeta";
import { KnKnot } from "../../Model/KnKnot";
import { KnMethodFunc } from "../../Model/KnMethodFunc";
import { KnWord } from "../../Model/KnWord";
import { KnNodeType } from "../../Model/KnNodeType";
import { KnTable } from "../../Model/KnTable";

export class TableHandler {
  public static ExpandDeclareTable(knState: XnlState, nodeToRun: any) {
    let nameObjPair = TableHandler.MakeTable(nodeToRun);
    if (nameObjPair[0] != null) {
      let curEnv = knState.GetCurEnv();
      curEnv.Define(nameObjPair[0], nameObjPair[1]);
    }
    knState.OpBatchStart();
    knState.AddOp(XnlOpCode.ValStack_PushValue, nameObjPair[1]);
    knState.OpBatchCommit();
  }

  public static MakeTable(objDeclareNode: any) : any {
    let name = objDeclareNode.Next.Core.Value;
    let iter = objDeclareNode.Next.Next;
    let fields : any[] = [];
    let properties : any[] = [];
    let methods : any[] = [];
    while (iter != null) {
      let coreName = iter.Core.Value;
      if (coreName === 'field') {
        fields = TableHandler.MakeTableFields(iter);
      }
      else if (coreName === 'prop') {
        properties = TableHandler.MakeTableProperties(iter);
      }
      else if (coreName === 'method') {
        methods = TableHandler.MakeTableMethods(iter);
      }
      iter = iter.Next;
    }
    let objMeta = new TableMeta("Instance", fields, properties, methods);
    let fieldValues : any[] = [];
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].DefaultValueExpr != null) {
        fieldValues.push(fields[i].DefaultValueExpr);
      }
      else {
        fieldValues.push(KnNodeHelper.Ukn);
      }
    }

    let obj = new KnTable(objMeta, fieldValues);
    return [name, obj];
  }

  public static MakeTableFields(fieldKnot: KnKnot) : any[] {
    let result : any[] = [];
    let fieldRows : any[] = fieldKnot.Block ?? [];
    for (let i = 0; i < fieldRows.length; i++) {
      let declareNode = fieldRows[i];
      let fieldName = declareNode.Next.Core.Value;
      let defaultValExpr = null;
      let typeDef = declareNode.Next.Core.Definition;
      if (declareNode.Next.Next != null
        && declareNode.Next.Next.Core.Value === '='
        && declareNode.Next.Next.Next != null
      ) {
        defaultValExpr = declareNode.Next.Next.Next.Core;
      }
      let field = new FieldStorageMeta(
        fieldName,
        i,
        typeDef,
        defaultValExpr
      );
      result.push(field)
    }
    return result;
  }

  public static MakeTableProperties(propertyKnot: KnKnot) : any[] {
    let result : any[] = [];
    let propRows: any[] = propertyKnot.Block ?? [];
    for (let i = 0; i < propRows.length; i++) {
      let declareNode = propRows[i];
      let propType = declareNode.Core.Value;
      if (propType === 'field_prop') {
        let prop = TableHandler.MakeFieldProp(declareNode.Next);
        result.push(prop)
      }
      else if (propType === 'calc_prop') {
        let prop = TableHandler.MakeCalcProp(declareNode.Next);
        result.push(prop)
      }
      else {
        continue;
      }
      
    }
    return result;
  }

  public static MakeFieldProp(fieldPropKnotNode) {
    let fieldName = fieldPropKnotNode.Core.Value;
    let flags: string[] = fieldPropKnotNode.Core.Flags;
    let visibility = ArrayExt.Contains(flags, 'private') ? 'private' : 'public';
    let typeDef = fieldPropKnotNode.Core.Definition;

    let field = new FieldPropMeta(
      fieldName,
      typeDef,
      visibility
    );
    return field;
  }

  public static MakeCalcProp(calcPropKnotNode) {
    let propName = calcPropKnotNode.Core.Value;
    let typeDef = calcPropKnotNode.Core.Definition;
    
    let getterVisibility : string | null = null;
    let getterFunc : KnPropertyFunc | null = null;
    let setterVisibility : string | null = null;
    let setterFunc : KnPropertyFunc | null = null;
    let iter : KnKnot | undefined = calcPropKnotNode.Next
    while (iter != null) {
      let coreName = iter.Core.Value;
      let coreFlags = iter.Core.Flags;
      let visibility = ArrayExt.Contains(coreFlags, 'private') ? 'private' : 'public';
      let requiredFieldsRaw : KnWord[] = iter.GenericTypes == null ? [] : iter.GenericTypes;
      let requiredFields : any[] = [];
      for (let i = 0; i < requiredFieldsRaw.length; i++) {
        requiredFields.push(requiredFieldsRaw[i].Value);
      }
      let paramTable : KnWord[] = iter.Params == null ? [] : iter.Params.Value;

      let funcBody = iter.Block;
      let funcName = `${coreName}_${propName}`
      let func = new KnPropertyFunc(requiredFields, paramTable, funcBody, funcName);
      if (coreName === 'get') {
        getterVisibility = visibility;
        getterFunc = func;
      }
      else if (coreName === 'set') {
        setterVisibility = visibility;
        setterFunc = func;
      }
      iter = iter.Next;
    }

    let prop = new CalcPropMeta(
      propName,
      typeDef,
      getterVisibility ?? undefined,
      getterFunc,
      setterVisibility ?? undefined,
      setterFunc
    );
    return prop;
  }

  public static MakeTableMethods(methodKnot: KnKnot) : any[] {
    let result : any[] = [];
    let methodRows : any[] = methodKnot.Block ?? [];
    for (let i = 0; i < methodRows.length; i++) {
      let declareNode : KnKnot = methodRows[i];
      let methodName = declareNode.Next?.Core.Value ?? '';
      let coreFlags = declareNode.Next?.Core.Flags ?? [];
      let visibility = ArrayExt.Contains(coreFlags, 'private') ? 'private' : 'public';

      let paramTable : KnWord[] = declareNode.Next?.Params?.Value ?? [];

      let returnType = declareNode.Next?.ResultTypes?.[0];
      let funcBody = declareNode.Next?.Block;
      let method = new KnMethodFunc(
        paramTable,
        returnType,
        funcBody,
        methodName,
        visibility// 添加 undefined 作为 isStatic 参数
      );
      result.push(method);
    }
    return result;
  }

  public static HasProperty(instance : KnTable, propertyName: string) : boolean {
    let metadata = instance.Metadata;
    return metadata.PropertyMap.has(propertyName);
  }

  public static ExpandTablePropertyByKey(knState: XnlState, instance : KnTable, propertyName: string) {
    let propMeta = instance.Metadata.PropertyMap.get(propertyName);
    let nodeType = KnNodeHelper.GetType(propMeta);
    if (nodeType === KnNodeType.FieldPropMetadata) {
      let storageMeta = instance.Metadata.FieldMap.get(propertyName);
      if (!storageMeta) {
        return;
      }
      let index = storageMeta.Index;
      let value = TableHandler.GetTablePropertyByIndex(instance, index);
      knState.GetCurrentFiber().OperandStack.PushValue(value);
    }
    else if (nodeType === KnNodeType.CalcPropMetadata) {
      let calcPropMeta = propMeta as CalcPropMeta;
      let getterFunc = calcPropMeta.GetterFunc;
      knState.OpBatchStart();
      knState.AddOp(XnlOpCode.ValStack_PushValue, instance);
      knState.AddOp(XnlOpCode.ValStack_PushValue, getterFunc);
      knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
      knState.OpBatchCommit();
    }
    else if (instance.Metadata.MethodMap.has(propertyName)) {
      let methodFunc = instance.Metadata.MethodMap.get(propertyName);
      knState.OpBatchStart();
      knState.AddOp(XnlOpCode.ValStack_PushValue, methodFunc);
      knState.AddOp(XnlOpCode.ValStack_PushValue, instance);
      knState.OpBatchCommit();
    }
  }

  public static GetTablePropertyByIndex(instance : KnTable, index: number) {
    return instance.Fields[index];
  }

  public static SetTablePropertyByKey(knState: XnlState, instance : KnTable, propertyName: string, value : any) {
    let propMeta = instance.Metadata.PropertyMap.get(propertyName);
    let nodeType = KnNodeHelper.GetType(propMeta);
    if (nodeType === KnNodeType.FieldPropMetadata) {
      let storageMeta = instance.Metadata.FieldMap.get(propertyName);
      if (!storageMeta) {
        return;
      }
      let index = storageMeta.Index;
      TableHandler.SetTablePropertyByIndex(instance, index, value);
    }
    else if (nodeType === KnNodeType.CalcPropMetadata) {
      // CalcPropMeta
      let calcPropMeta = propMeta as CalcPropMeta;
      let setterFunc = calcPropMeta.SetterFunc;
      knState.OpBatchStart();
      knState.AddOp(XnlOpCode.ValStack_PushValue, instance);
      knState.AddOp(XnlOpCode.ValStack_PushValue, value);
      knState.AddOp(XnlOpCode.ValStack_PushValue, setterFunc);
      knState.AddOp(XnlOpCode.Ctrl_ApplyToFrameTop);
      knState.OpBatchCommit();
    }
  }

  public static SetTablePropertyByIndex(instance : KnTable, index: number, value : any) {
    instance.Fields[index] = value;
  }
}