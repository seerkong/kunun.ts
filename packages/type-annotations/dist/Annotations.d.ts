import { KnKnot } from 'kunun-core';
export type AnnotationSource = 'metadata' | 'config' | 'attr' | 'namedAttr' | 'preModifier' | 'postModifier';
export interface AnnotationEntry {
    Source: AnnotationSource;
    Name: string;
    Value: any;
    Target?: string;
}
export interface AnnotationBag {
    Entries: AnnotationEntry[];
}
export declare const OrmNamedConfProfileNames: readonly ["datasource", "entity", "field", "relation"];
export type OrmNamedConfProfileName = typeof OrmNamedConfProfileNames[number];
export type OrmNamedConfAdmissionIssue = 'missing' | 'legacy_transport' | 'profile_multiplicity' | 'profile_mismatch' | 'target_mismatch';
export interface OrmNamedConfAdmissionResult {
    Marker?: KnKnot;
    Payload?: any;
    Issue?: OrmNamedConfAdmissionIssue;
}
export declare const BuiltInAnnotationNames: {
    readonly Required: "required";
    readonly Description: "description";
    readonly Storage: "storage";
    readonly Label: "label";
    readonly Source: "source";
    readonly Migration: "migration";
};
export declare class AnnotationExtractor {
    Extract(node: any): AnnotationBag;
    Get(node: any, name: string): AnnotationEntry[];
    GetFirstValue(node: any, name: string): any;
    IsRequired(node: any): boolean;
    private ReadMetadata;
    private ReadAttr;
    private ReadConfig;
    private ReadNamedAttr;
    private ReadModifierGroup;
}
export declare class SchemaConstraintProfile {
    ValidateRequiredOverride(parent: any, child: any): string[];
}
export declare function AdmitOrmNamedConf(nodeOrMarker: any, expectedProfile: OrmNamedConfProfileName): OrmNamedConfAdmissionResult;
