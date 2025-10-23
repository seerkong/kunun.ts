import { RuntimeLambdaFunction } from './RuntimeState';

export interface RuntimeClassField {
  name: string;
  defaultValue?: any;
}

export interface RuntimeClassConstructor {
  params: string[];
  body: any[];
}

export interface RuntimeClassProperty {
  getBody?: any[];
  setParams?: string[];
  setBody?: any[];
}

export class RuntimeClassDefinition {
  public readonly kind = 'RuntimeClassDefinition';
  public fields: RuntimeClassField[] = [];
  public constructorDef: RuntimeClassConstructor = { params: [], body: [] };
  public methods: { [name: string]: { params: string[]; body: any[] } } = {};
  public properties: { [name: string]: RuntimeClassProperty } = {};

  public constructor(public name: string) {}
}

export interface RuntimePropertyDescriptor {
  get?: (target: RuntimeObject) => any;
  set?: (target: RuntimeObject, value: any) => void;
}

export class RuntimeObject {
  private fields: { [key: string]: any } = {};
  private methods: { [key: string]: RuntimeLambdaFunction } = {};
  private properties: { [key: string]: RuntimePropertyDescriptor } = {};

  public setField(name: string, value: any): void {
    this.fields[name] = value;
  }

  public getField(name: string): any {
    return this.fields[name] ?? null;
  }

  public getFieldNames(): string[] {
    return Object.keys(this.fields);
  }

  public hasField(name: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.fields, name);
  }

  public addMethod(name: string, method: RuntimeLambdaFunction): void {
    this.methods[name] = method;
  }

  public getMethod(name: string): RuntimeLambdaFunction {
    return this.methods[name] ?? null;
  }

  public getMethodNames(): string[] {
    return Object.keys(this.methods);
  }

  public hasMethod(name: string): boolean {
    return this.methods[name] != null;
  }

  public defineProperty(name: string, descriptor: RuntimePropertyDescriptor): void {
    this.properties[name] = descriptor;
  }

  public getProperty(name: string): any {
    const property = this.properties[name];
    if (property?.get != null) {
      return property.get(this);
    }
    return this.getField(name);
  }

  public setProperty(name: string, value: any): void {
    const property = this.properties[name];
    if (property?.set != null) {
      property.set(this, value);
      return;
    }
    this.setField(name, value);
  }
}
