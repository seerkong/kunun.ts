import { KnKnot, KnSymbol, KnWord } from 'kunun-core';
import { AnnotationExtractor } from './Annotations';

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

export class OrmFieldAnnotationProfile {
  public Parse(nodeOrMarker: any): OrmFieldAnnotationParseResult {
    const diagnostics: FieldAnnotationDiagnostic[] = [];
    const descriptor: OrmFieldAnnotationDescriptor = {
      Properties: [],
    };
    const marker = this.FindMarker(nodeOrMarker);
    if (marker == null) {
      diagnostics.push({
        Code: 'ORMFIELD001',
        Message: 'ORM field annotation must use #(orm #field :{ ... }).',
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }

    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case 'type':
          descriptor.Type = this.ParseFieldType(item.Value);
          if (descriptor.Type.Code == null) {
            diagnostics.push({
              Code: 'ORMFIELD002',
              Message: 'ORM field type annotation should include code in :{ ... }.',
              Location: 'type',
            });
          }
          break;
        case 'db':
          descriptor.Db = this.ParseDb(item.Value);
          break;
        case 'items':
          descriptor.Items = this.ParseFieldType(item.Value);
          break;
        case 'properties':
        case 'property':
          for (const property of asArray(item.Value)) {
            descriptor.Properties.push({
              Name: property instanceof KnKnot ? wordName(property.Name) : stringProp(property, 'name'),
              ...this.ParseFieldType(property),
            });
          }
          break;
        case 'format':
          descriptor.Format = directString(item.Value);
          break;
        default:
          diagnostics.push({
            Code: 'ORMFIELD004',
            Message: `Unsupported ORM field annotation item '${item.Name ?? '<missing>'}'.`,
            Location: item.Name,
          });
          break;
      }
    }

    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }

  public FindMarker(nodeOrMarker: any): KnKnot {
    return findFieldMarker(nodeOrMarker, 'orm');
  }

  private ParseFieldType(source: any): OrmFieldTypeAnnotation {
    const type: OrmFieldTypeAnnotation = {};
    setIfDefined(type, 'Code', stringProp(source, 'code'));
    setIfDefined(type, 'Base', stringProp(source, 'base'));
    setIfDefined(type, 'RefType', stringProp(source, 'ref_type') ?? stringProp(source, 'refType'));
    setIfDefined(type, 'Multiple', boolProp(source, 'multiple'));
    return type;
  }

  private ParseDb(source: any): OrmFieldDbAnnotation {
    const db: OrmFieldDbAnnotation = {};
    setIfDefined(db, 'Name', stringProp(source, 'name'));
    setIfDefined(db, 'Type', stringProp(source, 'type'));
    return db;
  }
}

export class DomainFieldAnnotationProfile {
  public Parse(nodeOrMarker: any): DomainFieldAnnotationParseResult {
    const diagnostics: FieldAnnotationDiagnostic[] = [];
    const descriptor: DomainFieldAnnotationDescriptor = {
      Validations: [],
    };
    const marker = this.FindMarker(nodeOrMarker);
    if (marker == null) {
      diagnostics.push({
        Code: 'DOMAINFIELD001',
        Message: 'Domain field annotation must use #(domain #field :{ ... }).',
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }

    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case 'type':
          descriptor.Type = this.ParseDomainType(item.Value);
          if (descriptor.Type.Name == null) {
            diagnostics.push({
              Code: 'DOMAINFIELD002',
              Message: 'Domain field type annotation should include @name.',
              Location: 'type',
            });
          }
          break;
        case 'validate':
          for (const validation of asArray(item.Value)) {
            descriptor.Validations.push(this.ParseValidation(validation));
          }
          break;
        default:
          diagnostics.push({
            Code: 'DOMAINFIELD004',
            Message: `Unsupported domain field annotation item '${item.Name ?? '<missing>'}'.`,
            Location: item.Name,
          });
          break;
      }
    }

    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }

  public FindMarker(nodeOrMarker: any): KnKnot {
    return findFieldMarker(nodeOrMarker, 'domain');
  }

  private ParseDomainType(source: any): DomainFieldTypeAnnotation {
    const type: DomainFieldTypeAnnotation = {};
    setIfDefined(type, 'Name', stringProp(source, 'name'));
    setIfDefined(type, 'Base', stringProp(source, 'base'));
    return type;
  }

  private ParseValidation(source: any): DomainFieldValidationAnnotation {
    const validation: DomainFieldValidationAnnotation = {};
    setIfDefined(validation, 'Kind', stringProp(source, 'kind'));
    setIfDefined(validation, 'Value', valueProp(source, 'value'));
    setIfDefined(validation, 'Pattern', stringProp(source, 'pattern'));
    return validation;
  }
}

function findFieldMarker(nodeOrMarker: any, coreName: string): KnKnot {
  if (nodeOrMarker instanceof KnKnot
    && wordName(nodeOrMarker.Core) === coreName
    && wordName(nodeOrMarker.Name) === 'field') {
    return nodeOrMarker;
  }
  const annotationSource = nodeOrMarker?.Metadata?.source_annotations ?? nodeOrMarker;
  const entry = new AnnotationExtractor().Extract(annotationSource).Entries.find(candidate =>
    candidate.Source === 'preModifier'
    && candidate.Name === 'field'
    && candidate.Value instanceof KnKnot
    && wordName(candidate.Value.Core) === coreName);
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

function stringAttr(knot: KnKnot, name: string): string {
  const value = valueAttr(knot, name);
  return value == null ? undefined : String(value);
}

function directString(source: any): string {
  if (source instanceof KnKnot) {
    return stringAttr(source, 'value');
  }
  const value = valueToPrimitive(source);
  return value == null ? undefined : String(value);
}

function stringProp(source: any, name: string): string {
  const value = valueProp(source, name);
  return value == null ? undefined : String(value);
}

function boolAttr(knot: KnKnot, name: string): boolean {
  const value = knot.Attr?.[name];
  return boolValue(value);
}

function boolProp(source: any, name: string): boolean {
  return boolValue(valueProp(source, name));
}

function boolValue(value: any): boolean {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const stringValue = String(valueToPrimitive(value)).toLowerCase();
  if (stringValue === 'true') {
    return true;
  }
  if (stringValue === 'false') {
    return false;
  }
  return Boolean(value);
}

function valueAttr(knot: KnKnot, name: string): any {
  return valueToPrimitive(knot.Attr?.[name]);
}

function valueProp(source: any, name: string): any {
  if (source instanceof KnKnot) {
    const confValue = source.Conf?.[name];
    return confValue === undefined ? valueAttr(source, name) : valueToPrimitive(confValue);
  }
  return valueToPrimitive(source?.[name]);
}

function asArray(value: any): any[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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
