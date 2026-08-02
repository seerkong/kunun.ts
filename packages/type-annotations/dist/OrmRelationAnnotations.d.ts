import { KnKnot } from 'kunun-core';
export interface OrmRelationAnnotationDiagnostic {
    Code: string;
    Message: string;
    Location?: string;
}
export interface OrmRelationEndpointAnnotation {
    Field?: string;
    FieldName?: string;
    Description?: string;
    Keys?: string[];
    Foreign?: boolean;
    Visible?: boolean;
    EnableWriteBizFields?: boolean;
}
export interface OrmRelationConditionAnnotation {
    Field: string;
    Equals: any;
}
export interface OrmRelationOrderAnnotation {
    Field?: string;
    Direction?: string;
    Namespace?: string;
    Alias?: string;
    OrderSet?: string;
    EntityName?: string;
    RelativePath?: string[];
}
export interface OrmRelationConstraintsAnnotation {
    On: OrmRelationConditionAnnotation[];
    Where: OrmRelationConditionAnnotation[];
    Order: OrmRelationOrderAnnotation[];
    Limit?: number;
}
export interface OrmRelationThroughAnnotation {
    Entity?: string;
    FromKeys?: string[];
    ToKeys?: string[];
    FromForeign?: boolean;
    ToForeign?: boolean;
    Constraints: OrmRelationConstraintsAnnotation;
}
export interface OrmRelationWriteAnnotation {
    CascadeDelete?: string;
}
export interface OrmRelationAnnotationDescriptor {
    Type?: string;
    Cardinality?: string;
    From?: OrmRelationEndpointAnnotation;
    To?: OrmRelationEndpointAnnotation;
    Through: OrmRelationThroughAnnotation[];
    Write?: OrmRelationWriteAnnotation;
}
export interface OrmRelationAnnotationParseResult {
    Descriptor: OrmRelationAnnotationDescriptor;
    Diagnostics: OrmRelationAnnotationDiagnostic[];
}
export interface OrmRelationValidationSchemaContext {
    HasField?: (entityName: string, fieldName: string) => boolean;
}
export interface OrmRelationValidationOptions {
    AllowedTypes?: string[];
    AllowedCardinalities?: string[];
    AllowedCascadeDelete?: string[];
    FromEntity?: string;
    ToEntity?: string;
    Schema?: OrmRelationValidationSchemaContext;
}
export declare class OrmRelationAnnotationValidator {
    Validate(descriptor: OrmRelationAnnotationDescriptor, options?: OrmRelationValidationOptions): OrmRelationAnnotationDiagnostic[];
    private ValidateEnums;
    private ValidateEndpoints;
    private ValidateEndpoint;
    private ValidateJoinShape;
    private ValidateKeyCount;
    private ValidateSchemaFields;
    private ValidateEndpointFields;
    private ValidateFields;
}
export declare function ValidateDepaOrmRelation(descriptor: OrmRelationAnnotationDescriptor, options?: OrmRelationValidationOptions): OrmRelationAnnotationDiagnostic[];
export declare class OrmRelationAnnotationProfile {
    Parse(nodeOrMarker: any): OrmRelationAnnotationParseResult;
    FindMarker(nodeOrMarker: any): KnKnot;
    private ParseEndpoint;
    private ParseThrough;
    private ParseConstraints;
    private ParseWrite;
}
