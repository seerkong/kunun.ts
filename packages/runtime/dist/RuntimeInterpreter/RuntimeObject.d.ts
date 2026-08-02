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
export declare class RuntimeClassDefinition {
    name: string;
    readonly kind = "RuntimeClassDefinition";
    fields: RuntimeClassField[];
    constructorDef: RuntimeClassConstructor;
    methods: {
        [name: string]: {
            params: string[];
            body: any[];
        };
    };
    properties: {
        [name: string]: RuntimeClassProperty;
    };
    constructor(name: string);
}
export interface RuntimePropertyDescriptor {
    get?: (target: RuntimeObject) => any;
    set?: (target: RuntimeObject, value: any) => void;
}
export declare class RuntimeObject {
    private fields;
    private methods;
    private properties;
    setField(name: string, value: any): void;
    getField(name: string): any;
    getFieldNames(): string[];
    hasField(name: string): boolean;
    addMethod(name: string, method: RuntimeLambdaFunction): void;
    getMethod(name: string): RuntimeLambdaFunction;
    getMethodNames(): string[];
    hasMethod(name: string): boolean;
    defineProperty(name: string, descriptor: RuntimePropertyDescriptor): void;
    getProperty(name: string): any;
    setProperty(name: string, value: any): void;
}
