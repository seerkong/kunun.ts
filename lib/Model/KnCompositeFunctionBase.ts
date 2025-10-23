import { KnNodeHelper } from "../Util/KnNodeHelper";
import { KnWord } from "./KnWord";

export class KnCompositeFunctionBase {
  public ParamTuple: KnWord[];
  public ReturnType: any;
  public FuncBody: any;
  public Arity: number;
  // -1 left; 0 no variable argument; 1 right
  public VaryLengthParamPositiType: number = 0;

  constructor( funcBody: any, paramTable: KnWord[], returnType: any = null) {
    this.ReturnType = returnType;
    this.VaryLengthParamPositiType = 0;
    if (paramTable.length > 0) {
      let leftMostArg = paramTable[0];
      let rightMostArg = paramTable[paramTable.length - 1];
      if (KnNodeHelper.IsWordStr(leftMostArg, '...')) {
        this.VaryLengthParamPositiType = -1;
        paramTable.shift();
      } else if (KnNodeHelper.IsWordStr(rightMostArg, '...')) {
        this.VaryLengthParamPositiType = 1;
        paramTable.pop();
      }
      
    }
    this.ParamTuple = paramTable;
    if (this.VaryLengthParamPositiType !== 0) {
      this.Arity = paramTable.length - 1;
    }
    else {
      this.Arity = paramTable.length;
    }
    
    this.FuncBody = funcBody;
  }
}