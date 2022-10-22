import { Instruction } from "../../StateManagement/InstructionStack";
import { KnOpCode } from "../../KnOpCode";
import { KnState } from "../../KnState";
import { NodeHelper } from "../../Util/NodeHelper";
import { ArrayExt } from "../../Util/ArrayExt";
import { FieldPropMeta } from "../../Model/FieldPropMeta";
import { CalcPropMeta } from "../../Model/CalcPropMeta";
import { KnPropertyFunc } from "../../Model/KnPropertyFunc";
import { KnTable } from "../../Model/KnTable";
import { TableMeta } from "../../Model/TableMeta";
import { FieldStorageMeta } from "../../Model/FieldStorageMeta";
import { KnKnot } from "../../Model/KnKnot";
import { KnMethodFunc } from "../../Model/KnMethodFunc";
import { KnWord } from "../../Model/KnWord";
import { KnNodeType } from "../../Model/KnType";

export class TableHandler {
  public static ExpandDeclareTable(knState: KnState, nodeToRun: any) {
    let nameObjPair = TableHandler.MakeTable(nodeToRun);
    if (nameObjPair[0] != null) {
      let curEnv = knState.GetCurEnv();
      curEnv.Define(nameObjPair[0], nameObjPair[1]);
    }
    knState.OpBatchStart();
    knState.AddOp(KnOpCode.ValStack_PushValue, nameObjPair[1]);
    knState.OpBatchCommit();
  }

  public static MakeTable(objDeclareNode: any) : any {
    let name = objDeclareNode.Next.Core.Value;
    let iter = objDeclareNode.Next.Next;
    let fields = [];
    let properties = [];
    let methods = [];
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
    let fieldValues = [];
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].DefaultValueExpr != null) {
        fieldValues.push(fields[i].DefaultValueExpr);
      }
      else {
        fieldValues.push(NodeHelper.Ukn);
      }
    }

    let obj = new KnTable(objMeta, fieldValues);
    return [name, obj];
  }

  public static MakeTableFields(fieldKnot: KnKnot) : any[] {
    let result = [];
    let fieldRows = fieldKnot.Block;
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
    let result = [];
    let propRows = propertyKnot.Block;
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
    
    let getterVisibility = null;
    let getterFunc = null;
    let setterVisibility = null;
    let setterFunc = null;
    let iter : KnKnot = calcPropKnotNode.Next
    while (iter != null) {
      let coreName = iter.Core.Value;
      let coreFlags = iter.Core.Flags;
      let visibility = ArrayExt.Contains(coreFlags, 'private') ? 'private' : 'public';
      let requiredFieldsRaw : KnWord[] = iter.ContextParam == null ? [] : iter.ContextParam;
      let requiredFields = [];
      for (let i = 0; i < requiredFieldsRaw.length; i++) {
        requiredFields.push(requiredFieldsRaw[i].Value);
      }
      let paramTable : KnWord[] = iter.Param == null ? [] : iter.Param;

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
      getterVisibility,
      getterFunc,
      setterVisibility,
      setterFunc
    );
    return prop;
  }

  public static MakeTableMethods(methodKnot: KnKnot) : any[] {
    let result = [];
    let methodRows = methodKnot.Block;
    for (let i = 0; i < methodRows.length; i++) {
      let declareNode : KnKnot = methodRows[i];
      let methodName = declareNode.Next.Core.Value;
      let coreFlags = declareNode.Next.Core.Flags;
      let visibility = ArrayExt.Contains(coreFlags, 'private') ? 'private' : 'public';

      let paramTable : KnWord[] = declareNode.Next.Param == null ? [] : declareNode.Next.Param;

      let returnType = declareNode.Next.Complements;
      let funcBody = declareNode.Next.Block;
      let method = new KnMethodFunc(
        paramTable,
        returnType,
        funcBody,
        methodName,
        visibility
      );
      result.push(method);
    }
    return result;
  }

  public static HasProperty(instance : KnTable, propertyName: string) : boolean {
    let metadata = instance.Metadata;
    return metadata.PropertyMap.has(propertyName);
  }

  public static ExpandTablePropertyByKey(knState: KnState, instance : KnTable, propertyName: string) {
    let propMeta = instance.Metadata.PropertyMap.get(propertyName);
    let nodeType = NodeHelper.GetType(propMeta);
    if (nodeType === KnNodeType.KnFieldPropMetadata) {
      let storageMeta : FieldStorageMeta = instance.Metadata.FieldMap.get(propertyName);
      let index = storageMeta.Index;
      let value = TableHandler.GetTablePropertyByIndex(instance, index);
      knState.GetCurrentFiber().OperandStack.PushValue(value);
    }
    else if (nodeType === KnNodeType.KnCalcPropMetadata) {
      let calcPropMeta = propMeta as CalcPropMeta;
      let getterFunc = calcPropMeta.GetterFunc;
      knState.OpBatchStart();
      knState.AddOp(KnOpCode.ValStack_PushValue, instance);
      knState.AddOp(KnOpCode.ValStack_PushValue, getterFunc);
      knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
      knState.OpBatchCommit();
    }
    else if (instance.Metadata.MethodMap.has(propertyName)) {
      let methodFunc = instance.Metadata.MethodMap.get(propertyName);
      knState.OpBatchStart();
      knState.AddOp(KnOpCode.ValStack_PushValue, methodFunc);
      knState.AddOp(KnOpCode.ValStack_PushValue, instance);
      knState.OpBatchCommit();
    }
  }

  public static GetTablePropertyByIndex(instance : KnTable, index: number) {
    return instance.Fields[index];
  }

  public static SetTablePropertyByKey(knState: KnState, instance : KnTable, propertyName: string, value : any) {
    let propMeta = instance.Metadata.PropertyMap.get(propertyName);
    let nodeType = NodeHelper.GetType(propMeta);
    if (nodeType === KnNodeType.KnFieldPropMetadata) {
      let storageMeta : FieldStorageMeta = instance.Metadata.FieldMap.get(propertyName);
      let index = storageMeta.Index;
      TableHandler.SetTablePropertyByIndex(instance, index, value);
    }
    else if (nodeType === KnNodeType.KnCalcPropMetadata) {
      // CalcPropMeta
      let calcPropMeta = propMeta as CalcPropMeta;
      let setterFunc = calcPropMeta.SetterFunc;
      knState.OpBatchStart();
      knState.AddOp(KnOpCode.ValStack_PushValue, instance);
      knState.AddOp(KnOpCode.ValStack_PushValue, value);
      knState.AddOp(KnOpCode.ValStack_PushValue, setterFunc);
      knState.AddOp(KnOpCode.Ctrl_ApplyToFrameTop);
      knState.OpBatchCommit();
    }
  }

  public static SetTablePropertyByIndex(instance : KnTable, index: number, value : any) {
    instance.Fields[index] = value;
  }
}