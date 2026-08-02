import { KnKnot } from 'kunun-core';
export interface FieldAnnotationDiagnostic {
    Code: string;
    Message: string;
    Location?: string;
}
export interface OrmFieldTypeAnnotation {
    Code?: string;
    Base?: string;
    RefType?: string;
    Multiple?: boolean;
}
export interface OrmFieldDbAnnotation {
    Name?: string;
    Type?: string;
}
export interface OrmFieldPropertyAnnotation extends OrmFieldTypeAnnotation {
    Name?: string;
}
export interface OrmFieldAnnotationDescriptor {
    Type?: OrmFieldTypeAnnotation;
    Db?: OrmFieldDbAnnotation;
    Items?: OrmFieldTypeAnnotation;
    Properties: OrmFieldPropertyAnnotation[];
    Format?: string;
}
export interface OrmFieldAnnotationParseResult {
    Descriptor: OrmFieldAnnotationDescriptor;
    Diagnostics: FieldAnnotationDiagnostic[];
}
export interface DomainFieldTypeAnnotation {
    Name?: string;
    Base?: string;
}
export interface DomainFieldValidationAnnotation {
    Kind?: string;
    Value?: any;
    Pattern?: string;
}
export interface DomainFieldAnnotationDescriptor {
    Type?: DomainFieldTypeAnnotation;
    Validations: DomainFieldValidationAnnotation[];
}
export interface DomainFieldAnnotationParseResult {
    Descriptor: DomainFieldAnnotationDescriptor;
    Diagnostics: FieldAnnotationDiagnostic[];
}
export declare class OrmFieldAnnotationProfile {
    Parse(nodeOrMarker: any): OrmFieldAnnotationParseResult;
    FindMarker(nodeOrMarker: any): KnKnot;
    private ParseFieldType;
    private ParseDb;
}
export declare class DomainFieldAnnotationProfile {
    Parse(nodeOrMarker: any): DomainFieldAnnotationParseResult;
    FindMarker(nodeOrMarker: any): KnKnot;
    private ParseDomainType;
    private ParseValidation;
}
