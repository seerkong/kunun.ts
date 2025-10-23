import { KnKnot, KnSymbol, KnWord } from 'kunun-core';
import { AnnotationExtractor } from './Annotations';

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
  Options?: { [key: string]: any };
}

export interface OrmDataSourceAnnotationParseResult {
  Descriptor: OrmDataSourceAnnotationDescriptor;
  Diagnostics: OrmEntityAnnotationDiagnostic[];
}

export class OrmEntityAnnotationProfile {
  public Parse(nodeOrMarker: any): OrmEntityAnnotationParseResult {
    const diagnostics: OrmEntityAnnotationDiagnostic[] = [];
    const descriptor: OrmEntityAnnotationDescriptor = {
      PrimaryKey: [],
    };
    const marker = findMarker(nodeOrMarker, 'entity');
    if (marker == null) {
      diagnostics.push({
        Code: 'ORMENTITY001',
        Message: 'ORM entity annotation must use #(orm #entity :{ ... }).',
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }

    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case 'type':
          descriptor.Type = directString(item.Value);
          break;
        case 'primary_key':
        case 'primaryKey':
          descriptor.PrimaryKey = stringListValue(item.Value);
          break;
        case 'db':
          descriptor.Db = parseDb(item.Value);
          break;
        case 'logical_delete':
        case 'logicalDelete':
          descriptor.LogicalDelete = parseLogicalDelete(item.Value);
          break;
        case 'datasource':
        case 'data_source':
        case 'dataSource':
          descriptor.DataSource = directString(item.Value);
          break;
        default:
          diagnostics.push({
            Code: 'ORMENTITY004',
            Message: `Unsupported ORM entity annotation item '${item.Name ?? '<missing>'}'.`,
            Location: item.Name,
          });
          break;
      }
    }

    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
}

export class OrmDataSourceAnnotationProfile {
  public Parse(nodeOrMarker: any): OrmDataSourceAnnotationParseResult {
    const diagnostics: OrmEntityAnnotationDiagnostic[] = [];
    const descriptor: OrmDataSourceAnnotationDescriptor = {};
    const marker = findMarker(nodeOrMarker, 'datasource');
    if (marker == null) {
      diagnostics.push({
        Code: 'ORMDATASOURCE001',
        Message: 'ORM datasource annotation must use #(orm #datasource :{ ... }).',
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }

    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case 'key':
          descriptor.Key = directString(item.Value);
          break;
        case 'name':
          descriptor.Name = directString(item.Value);
          break;
        case 'kind':
          descriptor.Kind = directString(item.Value);
          break;
        case 'env_conn':
        case 'envConn':
          descriptor.EnvConn = directString(item.Value);
          break;
        case 'options':
          descriptor.Options = objectValue(item.Value);
          break;
        default:
          diagnostics.push({
            Code: 'ORMDATASOURCE004',
            Message: `Unsupported ORM datasource annotation item '${item.Name ?? '<missing>'}'.`,
            Location: item.Name,
          });
          break;
      }
    }

    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }
}

function parseDb(source: any): OrmEntityDbAnnotation {
  const db: OrmEntityDbAnnotation = {};
  setIfDefined(db, 'Name', stringProp(source, 'name') ?? directString(source));
  setIfDefined(db, 'Schema', stringProp(source, 'schema'));
  return db;
}

function parseLogicalDelete(source: any): OrmEntityLogicalDeleteAnnotation {
  const logicalDelete: OrmEntityLogicalDeleteAnnotation = {};
  setIfDefined(logicalDelete, 'Field', stringProp(source, 'field'));
  setIfDefined(logicalDelete, 'Value', valueProp(source, 'value'));
  return logicalDelete;
}

function findMarker(nodeOrMarker: any, markerName: string): KnKnot {
  if (nodeOrMarker instanceof KnKnot
    && wordName(nodeOrMarker.Core) === 'orm'
    && wordName(nodeOrMarker.Name) === markerName) {
    return nodeOrMarker;
  }
  const annotationSource = nodeOrMarker?.Metadata?.source_annotations ?? nodeOrMarker;
  const entry = new AnnotationExtractor().Extract(annotationSource).Entries.find(candidate =>
    candidate.Source === 'preModifier'
    && candidate.Name === markerName
    && candidate.Value instanceof KnKnot
    && wordName(candidate.Value.Core) === 'orm');
  return entry?.Value ?? null;
}

interface AnnotationItem {
  Name: string;
  Value: any;
}

function annotationItems(marker: KnKnot): AnnotationItem[] {
  if (marker.Conf != null) {
    return Object.entries(marker.Conf)
      .filter(([_, value]) => typeof value !== 'function')
      .map(([name, value]) => ({ Name: name, Value: value }));
  }
  return (marker.Body ?? [])
    .filter(item => item instanceof KnKnot)
    .map(item => ({ Name: wordName(item.Core), Value: item }));
}

function setIfDefined<T, K extends keyof T>(target: T, key: K, value: T[K]): void {
  if (value !== undefined && value !== null) {
    target[key] = value;
  }
}

function directString(source: any): string {
  if (source instanceof KnKnot) {
    return stringProp(source, 'value');
  }
  const value = valueToPrimitive(source);
  return value == null ? undefined : String(value);
}

function stringProp(source: any, name: string): string {
  const value = valueProp(source, name);
  return value == null ? undefined : String(value);
}

function valueProp(source: any, name: string): any {
  if (source instanceof KnKnot) {
    const confValue = source.Conf?.[name];
    return confValue === undefined ? valueToPrimitive(source.Attr?.[name]) : valueToPrimitive(confValue);
  }
  return valueToPrimitive(source?.[name]);
}

function stringListValue(value: any): string[] {
  const primitive = valueToPrimitive(value);
  if (Array.isArray(primitive)) {
    return primitive.map(item => valueToPrimitive(item)).filter(item => item != null).map(String);
  }
  return primitive == null ? [] : [String(primitive)];
}

function objectValue(value: any): { [key: string]: any } {
  const primitive = valueToPrimitive(value);
  if (primitive == null || typeof primitive !== 'object' || Array.isArray(primitive)) {
    return undefined;
  }
  const result: { [key: string]: any } = {};
  for (const [key, item] of Object.entries(primitive)) {
    if (typeof item !== 'function') {
      result[key] = valueToPrimitive(item);
    }
  }
  return result;
}

function valueToPrimitive(value: any): any {
  if (value instanceof KnWord) {
    return value.GetFullNameStr();
  }
  if (value instanceof KnSymbol) {
    return value.Value;
  }
  if (value instanceof KnKnot) {
    return wordName(value.Name) ?? wordName(value.Core);
  }
  if (Array.isArray(value)) {
    return value.map(item => valueToPrimitive(item));
  }
  return value;
}

function wordName(node: any): string {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnSymbol) {
    return node.Value;
  }
  if (typeof node === 'string') {
    return node;
  }
  return null;
}
