import { Instruction } from "../../StateManagement/InstructionStack";
import { OpCode } from "../../OpCode";
import { StateMgr } from "../../StateMgr";
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
import { KnType } from "../../Model/KnType";

export class TableHandler {
  public static ExpandDeclareTable(stateMgr: StateMgr, nodeToRun: any) {
    let nameObjPair = TableHandler.MakeTable(nodeToRun);
    if (nameObjPair[0] != null) {
      let curEnv = stateMgr.GetCurEnv();
      curEnv.Define(nameObjPair[0], nameObjPair[1]);
    }
    stateMgr.OpBatchStart();
    stateMgr.AddOp(OpCode.ValStack_PushValue, nameObjPair[1]);
    stateMgr.OpBatchCommit();
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

  public static MakeTableFields(fieldKnot) : any[] {
    let result = [];
    let fieldRows = fieldKnot.Body;
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

  public static MakeTableProperties(propertyKnot) : any[] {
    let result = [];
    let propRows = propertyKnot.Body;
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

      let funcBody = iter.Body;
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

  public static MakeTableMethods(methodKnot) : any[] {
    let result = [];
    let methodRows = methodKnot.Body;
    for (let i = 0; i < methodRows.length; i++) {
      let declareNode : KnKnot = methodRows[i];
      let methodName = declareNode.Next.Core.Value;
      let coreFlags = declareNode.Next.Core.Flags;
      let visibility = ArrayExt.Contains(coreFlags, 'private') ? 'private' : 'public';

      let paramTable : KnWord[] = declareNode.Next.Param == null ? [] : declareNode.Next.Param;

      let returnType = declareNode.Next.Definition;
      let funcBody = declareNode.Next.Body;
      let method = new KnMethodFunc(
        methodName,
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

  public static GetTablePropertyByKey(stateMgr: StateMgr, instance : KnTable, propertyName: string) {
    let propMeta = instance.Metadata.PropertyMap.get(propertyName);
    let nodeType = NodeHelper.GetType(propMeta);
    if (nodeType === KnType.FieldPropMetadata) {
      let storageMeta : FieldStorageMeta = instance.Metadata.FieldMap.get(propertyName);
      let index = storageMeta.Index;
      let value = TableHandler.GetTablePropertyByIndex(instance, index);
      stateMgr.GetCurrentFiber().OperandStack.PushValue(value);
    }
    else if (nodeType === KnType.CalcPropMetadata) {
      let calcPropMeta = propMeta as CalcPropMeta;
      let getterFunc = calcPropMeta.GetterFunc;
      stateMgr.OpBatchStart();
      stateMgr.AddOp(OpCode.ValStack_PushValue, instance);
      stateMgr.AddOp(OpCode.ValStack_PushValue, getterFunc);
      stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
      stateMgr.OpBatchCommit();
    }
    else if (instance.Metadata.MethodMap.has(propertyName)) {
      let methodFunc = instance.Metadata.MethodMap.get(propertyName);
      stateMgr.OpBatchStart();
      stateMgr.AddOp(OpCode.ValStack_PushValue, methodFunc);
      stateMgr.AddOp(OpCode.ValStack_PushValue, instance);
      stateMgr.OpBatchCommit();
    }
  }

  public static GetTablePropertyByIndex(instance : KnTable, index: number) {
    return instance.Fields[index];
  }

  public static SetTablePropertyByKey(stateMgr: StateMgr, instance : KnTable, propertyName: string, value : any) {
    let propMeta = instance.Metadata.PropertyMap.get(propertyName);
    let nodeType = NodeHelper.GetType(propMeta);
    if (nodeType === KnType.FieldPropMetadata) {
      let storageMeta : FieldStorageMeta = instance.Metadata.FieldMap.get(propertyName);
      let index = storageMeta.Index;
      TableHandler.SetTablePropertyByIndex(instance, index, value);
    }
    else if (nodeType === KnType.CalcPropMetadata) {
      // CalcPropMeta
      let calcPropMeta = propMeta as CalcPropMeta;
      let setterFunc = calcPropMeta.SetterFunc;
      stateMgr.OpBatchStart();
      stateMgr.AddOp(OpCode.ValStack_PushValue, instance);
      stateMgr.AddOp(OpCode.ValStack_PushValue, value);
      stateMgr.AddOp(OpCode.ValStack_PushValue, setterFunc);
      stateMgr.AddOp(OpCode.Ctrl_ApplyToFrameTop);
      stateMgr.OpBatchCommit();
    }
  }

  public static SetTablePropertyByIndex(instance : KnTable, index: number, value : any) {
    instance.Fields[index] = value;
  }
}