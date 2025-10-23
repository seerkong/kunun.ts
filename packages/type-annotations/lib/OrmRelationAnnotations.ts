import { KnKnot, KnSymbol, KnWord } from 'kunun-core';
import { AnnotationExtractor } from './Annotations';

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

export class OrmRelationAnnotationValidator {
  public Validate(
    descriptor: OrmRelationAnnotationDescriptor,
    options: OrmRelationValidationOptions = {},
  ): OrmRelationAnnotationDiagnostic[] {
    const diagnostics: OrmRelationAnnotationDiagnostic[] = [];
    this.ValidateEnums(descriptor, options, diagnostics);
    this.ValidateEndpoints(descriptor, diagnostics);
    this.ValidateJoinShape(descriptor, diagnostics);
    this.ValidateSchemaFields(descriptor, options, diagnostics);
    return diagnostics;
  }

  private ValidateEnums(
    descriptor: OrmRelationAnnotationDescriptor,
    options: OrmRelationValidationOptions,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    if (descriptor.Type != null && !includesNormalized(options.AllowedTypes ?? ['LOOK_UP', 'MASTER_DETAIL'], descriptor.Type)) {
      diagnostics.push({
        Code: 'ORMRELVAL001',
        Message: `Unsupported depa ORM relation type '${descriptor.Type}'.`,
        Location: 'type',
      });
    }
    if (descriptor.Cardinality != null
      && !includesNormalized(options.AllowedCardinalities ?? ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY'], descriptor.Cardinality)) {
      diagnostics.push({
        Code: 'ORMRELVAL002',
        Message: `Unsupported depa ORM relation cardinality '${descriptor.Cardinality}'.`,
        Location: 'cardinality',
      });
    }
    if (descriptor.Write?.CascadeDelete != null
      && !includesNormalized(options.AllowedCascadeDelete ?? ['delete', 'none', 'restrict', 'nullify', 'soft_delete'], descriptor.Write.CascadeDelete)) {
      diagnostics.push({
        Code: 'ORMRELVAL003',
        Message: `Unsupported depa ORM cascade_delete value '${descriptor.Write.CascadeDelete}'.`,
        Location: 'write.cascade_delete',
      });
    }
  }

  private ValidateEndpoints(
    descriptor: OrmRelationAnnotationDescriptor,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    this.ValidateEndpoint('from', descriptor.From, diagnostics);
    this.ValidateEndpoint('to', descriptor.To, diagnostics);
  }

  private ValidateEndpoint(
    location: string,
    endpoint: OrmRelationEndpointAnnotation,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    if (endpoint == null) {
      diagnostics.push({
        Code: 'ORMRELVAL004',
        Message: `ORM relation ${location} endpoint is required for depa ORM validation.`,
        Location: location,
      });
      return;
    }
    if (endpoint.Field == null || (endpoint.Keys ?? []).length === 0) {
      diagnostics.push({
        Code: 'ORMRELVAL004',
        Message: `ORM relation ${location} endpoint must include field and keys.`,
        Location: location,
      });
    }
  }

  private ValidateJoinShape(
    descriptor: OrmRelationAnnotationDescriptor,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    const fromKeys = descriptor.From?.Keys ?? [];
    const toKeys = descriptor.To?.Keys ?? [];
    if (descriptor.Through.length === 0) {
      this.ValidateKeyCount('from.keys', fromKeys, 'to.keys', toKeys, diagnostics);
      return;
    }
    const first = descriptor.Through[0];
    this.ValidateKeyCount('from.keys', fromKeys, 'through[0].from_keys', first.FromKeys ?? [], diagnostics);
    for (let index = 0; index < descriptor.Through.length - 1; index++) {
      const current = descriptor.Through[index];
      const next = descriptor.Through[index + 1];
      this.ValidateKeyCount(
        `through[${index}].to_keys`,
        current.ToKeys ?? [],
        `through[${index + 1}].from_keys`,
        next.FromKeys ?? [],
        diagnostics,
      );
    }
    const last = descriptor.Through[descriptor.Through.length - 1];
    this.ValidateKeyCount(`through[${descriptor.Through.length - 1}].to_keys`, last.ToKeys ?? [], 'to.keys', toKeys, diagnostics);
  }

  private ValidateKeyCount(
    leftLocation: string,
    left: string[],
    rightLocation: string,
    right: string[],
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    if (left.length > 0 && right.length > 0 && left.length !== right.length) {
      diagnostics.push({
        Code: 'ORMRELVAL005',
        Message: `Join key count mismatch between ${leftLocation} and ${rightLocation}.`,
        Location: `${leftLocation}:${rightLocation}`,
      });
    }
  }

  private ValidateSchemaFields(
    descriptor: OrmRelationAnnotationDescriptor,
    options: OrmRelationValidationOptions,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    if (options.Schema?.HasField == null) {
      return;
    }
    this.ValidateEndpointFields(options.FromEntity, 'from', descriptor.From, options.Schema, diagnostics);
    this.ValidateEndpointFields(options.ToEntity, 'to', descriptor.To, options.Schema, diagnostics);
    for (const [index, through] of descriptor.Through.entries()) {
      this.ValidateFields(through.Entity, `through[${index}]`, [...(through.FromKeys ?? []), ...(through.ToKeys ?? [])], options.Schema, diagnostics);
    }
  }

  private ValidateEndpointFields(
    entityName: string,
    location: string,
    endpoint: OrmRelationEndpointAnnotation,
    schema: OrmRelationValidationSchemaContext,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    if (entityName == null || endpoint == null) {
      return;
    }
    this.ValidateFields(entityName, location, [endpoint.Field, ...(endpoint.Keys ?? [])], schema, diagnostics);
  }

  private ValidateFields(
    entityName: string,
    location: string,
    fields: string[],
    schema: OrmRelationValidationSchemaContext,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): void {
    if (entityName == null) {
      return;
    }
    for (const field of fields.filter(item => item != null)) {
      if (!schema.HasField(entityName, field)) {
        diagnostics.push({
          Code: 'ORMRELVAL006',
          Message: `Field '${field}' does not exist on entity '${entityName}'.`,
          Location: `${location}.${field}`,
        });
      }
    }
  }
}

export function ValidateDepaOrmRelation(
  descriptor: OrmRelationAnnotationDescriptor,
  options: OrmRelationValidationOptions = {},
): OrmRelationAnnotationDiagnostic[] {
  return new OrmRelationAnnotationValidator().Validate(descriptor, options);
}

export class OrmRelationAnnotationProfile {
  public Parse(nodeOrMarker: any): OrmRelationAnnotationParseResult {
    const diagnostics: OrmRelationAnnotationDiagnostic[] = [];
    const descriptor: OrmRelationAnnotationDescriptor = {
      Through: [],
    };
    const marker = this.FindMarker(nodeOrMarker);
    if (marker == null) {
      diagnostics.push({
        Code: 'ORMREL001',
        Message: 'ORM relation annotation must use #(orm #relation :{ ... }).',
      });
      return { Descriptor: descriptor, Diagnostics: diagnostics };
    }

    for (const item of annotationItems(marker)) {
      switch (item.Name) {
        case 'type':
          descriptor.Type = directString(item.Value);
          break;
        case 'cardinality':
          descriptor.Cardinality = directString(item.Value);
          break;
        case 'from':
          descriptor.From = this.ParseEndpoint(item.Value, 'from', diagnostics);
          break;
        case 'to':
          descriptor.To = this.ParseEndpoint(item.Value, 'to', diagnostics);
          break;
        case 'through':
          for (const through of asArray(item.Value)) {
            descriptor.Through.push(this.ParseThrough(through, diagnostics));
          }
          break;
        case 'write':
          descriptor.Write = this.ParseWrite(item.Value);
          break;
        default:
          diagnostics.push({
            Code: 'ORMREL004',
            Message: `Unsupported ORM relation annotation item '${item.Name ?? '<missing>'}'.`,
            Location: item.Name,
          });
          break;
      }
    }

    if (descriptor.From != null && ((descriptor.From.Keys ?? []).length === 0 || descriptor.From.Field == null)) {
      diagnostics.push({
        Code: 'ORMREL002',
        Message: 'ORM relation from endpoint must include field and keys.',
        Location: 'from',
      });
    }
    if (descriptor.To != null && ((descriptor.To.Keys ?? []).length === 0 || descriptor.To.Field == null)) {
      diagnostics.push({
        Code: 'ORMREL002',
        Message: 'ORM relation to endpoint must include field and keys.',
        Location: 'to',
      });
    }
    return { Descriptor: descriptor, Diagnostics: diagnostics };
  }

  public FindMarker(nodeOrMarker: any): KnKnot {
    if (nodeOrMarker instanceof KnKnot
      && wordName(nodeOrMarker.Core) === 'orm'
      && wordName(nodeOrMarker.Name) === 'relation') {
      return nodeOrMarker;
    }
    const annotationSource = nodeOrMarker?.Metadata?.source_annotations ?? nodeOrMarker;
    const entry = new AnnotationExtractor().Extract(annotationSource).Entries.find(candidate =>
      candidate.Source === 'preModifier'
      && candidate.Name === 'relation'
      && candidate.Value instanceof KnKnot
      && wordName(candidate.Value.Core) === 'orm');
    return entry?.Value ?? null;
  }

  private ParseEndpoint(
    source: any,
    location: string,
    diagnostics: OrmRelationAnnotationDiagnostic[],
  ): OrmRelationEndpointAnnotation {
    const endpoint: OrmRelationEndpointAnnotation = {};
    setIfDefined(endpoint, 'Field', stringProp(source, 'field'));
    setIfDefined(endpoint, 'FieldName', stringProp(source, 'field_name') ?? stringProp(source, 'name'));
    setIfDefined(endpoint, 'Description', stringProp(source, 'description'));
    const keys = stringListProp(source, 'keys');
    if (keys.length > 0) {
      endpoint.Keys = keys;
    }
    setIfDefined(endpoint, 'Foreign', boolProp(source, 'foreign'));
    setIfDefined(endpoint, 'Visible', boolProp(source, 'visible'));
    setIfDefined(endpoint, 'EnableWriteBizFields', boolProp(source, 'enable_write_biz_fields'));
    if ((endpoint.Keys ?? []).length === 0 || endpoint.Field == null) {
      diagnostics.push({
        Code: 'ORMREL002',
        Message: `ORM relation ${location} endpoint must include field and keys.`,
        Location: location,
      });
    }
    return endpoint;
  }

  private ParseThrough(source: any, diagnostics: OrmRelationAnnotationDiagnostic[]): OrmRelationThroughAnnotation {
    const through: OrmRelationThroughAnnotation = {
      Entity: source instanceof KnKnot ? wordName(source.Name) : stringProp(source, 'entity') ?? stringProp(source, 'name'),
      FromKeys: stringListProp(source, 'from_keys'),
      ToKeys: stringListProp(source, 'to_keys'),
      Constraints: {
        On: [],
        Where: [],
        Order: [],
      },
    };
    setIfDefined(through, 'FromForeign', boolProp(source, 'from_foreign'));
    setIfDefined(through, 'ToForeign', boolProp(source, 'to_foreign'));
    this.ParseConstraints(source, through.Constraints);
    if (through.Entity == null || through.FromKeys.length === 0 || through.ToKeys.length === 0) {
      diagnostics.push({
        Code: 'ORMREL003',
        Message: 'ORM relation through item must include an entity name, from_keys, and to_keys.',
        Location: through.Entity,
      });
    }
    return through;
  }

  private ParseConstraints(source: any, constraints: OrmRelationConstraintsAnnotation): void {
    for (const item of source?.Body ?? []) {
      if (!(item instanceof KnKnot)) {
        continue;
      }
      const field = stringProp(item, 'field');
      switch (wordName(item.Core)) {
        case 'on':
          if (field != null) {
            constraints.On.push({ Field: field, Equals: valueProp(item, 'equals') });
          }
          break;
        case 'where':
          if (field != null) {
            constraints.Where.push({ Field: field, Equals: valueProp(item, 'equals') });
          }
          break;
        case 'order':
          {
            const order = parseOrder(item);
            if (hasOrderValue(order)) {
              constraints.Order.push(order);
            }
          }
          break;
        case 'limit':
          {
            const value = valueProp(item, 'value');
            if (typeof value === 'number') {
              constraints.Limit = value;
            }
          }
          break;
      }
    }
    for (const item of asArray(valueProp(source, 'on'))) {
      const field = stringProp(item, 'field');
      if (field != null) {
        constraints.On.push({ Field: field, Equals: valueProp(item, 'equals') });
      }
    }
    for (const item of asArray(valueProp(source, 'where'))) {
      const field = stringProp(item, 'field');
      if (field != null) {
        constraints.Where.push({ Field: field, Equals: valueProp(item, 'equals') });
      }
    }
    for (const item of asArray(valueProp(source, 'order'))) {
      const order = parseOrder(item);
      if (hasOrderValue(order)) {
        constraints.Order.push(order);
      }
    }
    const limit = valueProp(source, 'limit');
    if (typeof limit === 'number') {
      constraints.Limit = limit;
    }
  }

  private ParseWrite(source: any): OrmRelationWriteAnnotation {
    const write: OrmRelationWriteAnnotation = {};
    setIfDefined(write, 'CascadeDelete', stringProp(source, 'cascade_delete'));
    return write;
  }
}

function parseOrder(source: any): OrmRelationOrderAnnotation {
  const order: OrmRelationOrderAnnotation = {};
  setIfDefined(order, 'Field', stringProp(source, 'field'));
  setIfDefined(order, 'Direction', stringProp(source, 'direction'));
  setIfDefined(order, 'Namespace', stringProp(source, 'namespace'));
  setIfDefined(order, 'Alias', stringProp(source, 'alias'));
  setIfDefined(order, 'OrderSet', stringProp(source, 'order_set') ?? stringProp(source, 'orderSet'));
  setIfDefined(order, 'EntityName', stringProp(source, 'entity_name') ?? stringProp(source, 'entityName'));
  const relativePath = stringListProp(source, 'relative_path');
  if (relativePath.length > 0) {
    order.RelativePath = relativePath;
  }
  return order;
}

function hasOrderValue(order: OrmRelationOrderAnnotation): boolean {
  return Object.keys(order).length > 0;
}

function includesNormalized(allowed: string[], value: string): boolean {
  const normalizedValue = normalizeEnumValue(value);
  return allowed.map(normalizeEnumValue).includes(normalizedValue);
}

function normalizeEnumValue(value: string): string {
  return String(value).replace(/-/g, '_').toUpperCase();
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

function stringListAttr(knot: KnKnot, name: string): string[] {
  const value = knot.Attr?.[name];
  if (Array.isArray(value)) {
    return value.map(item => valueToPrimitive(item)).filter(item => item != null).map(String);
  }
  const single = valueToPrimitive(value);
  return single == null ? [] : [String(single)];
}

function stringListProp(source: any, name: string): string[] {
  if (source instanceof KnKnot && source.Conf?.[name] === undefined) {
    return stringListAttr(source, name);
  }
  const value = valueProp(source, name);
  if (Array.isArray(value)) {
    return value.map(item => valueToPrimitive(item)).filter(item => item != null).map(String);
  }
  const single = valueToPrimitive(value);
  return single == null ? [] : [String(single)];
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
