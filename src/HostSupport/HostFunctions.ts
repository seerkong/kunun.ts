import { KnHostFunction } from '../Model/KnHostFunction';
import { Env } from "../StateManagement/Env";
import { IOFunctions } from "./IOFunctions";
import { MathFunctions } from './MathFunctions';

export class HostFunctions {
  public static Import(env : Env) {
    HostFunctions.Define(env, 'Writeln', IOFunctions.Writeln);
    HostFunctions.Define(env, '+', MathFunctions.Add);
    HostFunctions.Define(env, '-', MathFunctions.Minus);
    HostFunctions.Define(env, '/', MathFunctions.Divide);
    HostFunctions.Define(env, '*', MathFunctions.Multiply);
    HostFunctions.Define(env, '==', MathFunctions.Equal);
    HostFunctions.Define(env, '>', MathFunctions.Gt);
    HostFunctions.Define(env, '>=', MathFunctions.Ge);
    HostFunctions.Define(env, '<', MathFunctions.Lt);
    HostFunctions.Define(env, '<=', MathFunctions.Le);


    HostFunctions.Define(env, 'console', console);
    HostFunctions.Define(env, 'clear_interval', function(intervalId) {
      console.log("clear_interval is called");
      clearInterval(intervalId);
    });
  }

  public static Define(env : Env, name: string, funcImpl) {
    let func = new KnHostFunction(name, function(args) {
      return funcImpl.apply(null, args);
    });
    env.Define(name, func);
  }
}