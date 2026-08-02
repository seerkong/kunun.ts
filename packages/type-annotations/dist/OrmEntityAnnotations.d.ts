export interface OrmEntityAnnotationDiagnostic {
    Code: string;
    Message: string;
    Location?: string;
}
export interface OrmEntityDbAnnotation {
    Name?: string;
    Schema?: string;
}
export interface OrmEntityLogicalDeleteAnnotation {
    Field?: string;
    Value?: any;
}
export interface OrmEntityAnnotationDescriptor {
    Type?: string;
    PrimaryKey: string[];
    Db?: OrmEntityDbAnnotation;
    LogicalDelete?: OrmEntityLogicalDeleteAnnotation;
    DataSource?: string;
}
export interface OrmEntityAnnotationParseResult {
    Descriptor: OrmEntityAnnotationDescriptor;
    Diagnostics: OrmEntityAnnotationDiagnostic[];
}
export interface OrmDataSourceAnnotationDescriptor {
    Key?: string;
    Name?: string;
    Kind?: string;
    EnvConn?: string;
    Options?: {
        [key: string]: any;
    };
}
export interface OrmDataSourceAnnotationParseResult {
    Descriptor: OrmDataSourceAnnotationDescriptor;
    Diagnostics: OrmEntityAnnotationDiagnostic[];
}
export declare class OrmEntityAnnotationProfile {
    Parse(nodeOrMarker: any): OrmEntityAnnotationParseResult;
}
export declare class OrmDataSourceAnnotationProfile {
    Parse(nodeOrMarker: any): OrmDataSourceAnnotationParseResult;
}
