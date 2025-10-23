import { KnKnot, KnWord } from 'kunun-core';

export type AnnotationSource =
  | 'metadata'
  | 'config'
  | 'attr'
  | 'namedAttr'
  | 'preModifier'
  | 'postModifier';

export interface AnnotationEntry {
  Source: AnnotationSource;
  Name: string;
  Value: any;
  Target?: string;
}

export interface AnnotationBag {
  Entries: AnnotationEntry[];
}

export const BuiltInAnnotationNames = {
  Required: 'required',
  Description: 'description',
  Storage: 'storage',
  Label: 'label',
  Source: 'source',
  Migration: 'migration',
} as const;

export class AnnotationExtractor {
  public Extract(node: any): AnnotationBag {
    const entries: AnnotationEntry[] = [];
    this.ReadMetadata(entries, node?.Metadata);
    this.ReadConfig(entries, node?.Conf);
    this.ReadAttr(entries, node?.Attr);
    this.ReadNamedAttr(entries, node?.NamedAttr);
    this.ReadModifierGroup(entries, 'preModifier', node?.PreModifiers);
    this.ReadModifierGroup(entries, 'postModifier', node?.PostModifiers);
    return { Entries: entries };
  }

  public Get(node: any, name: string): AnnotationEntry[] {
    return this.Extract(node).Entries.filter(entry => entry.Name === name);
  }

  public GetFirstValue(node: any, name: string): any {
    return this.Get(node, name)[0]?.Value;
  }

  public IsRequired(node: any): boolean {
    return this.GetFirstValue(node, BuiltInAnnotationNames.Required) === true;
  }

  private ReadMetadata(entries: AnnotationEntry[], metadata?: Map<KnWord, any> | { [prop: string]: any }): void {
    if (metadata == null) {
      return;
    }
    if (metadata instanceof Map) {
      for (const [key, value] of metadata.entries()) {
        entries.push({
          Source: 'metadata',
          Name: wordName(key),
          Value: value,
        });
      }
      return;
    }
    for (const [key, value] of Object.entries(metadata)) {
      entries.push({
        Source: 'metadata',
        Name: key,
        Value: value,
      });
    }
  }

  private ReadAttr(entries: AnnotationEntry[], attr?: { [prop: string]: any }): void {
    if (attr == null) {
      return;
    }
    for (const [name, value] of Object.entries(attr)) {
      entries.push({
        Source: 'attr',
        Name: name,
        Value: value,
      });
    }
  }

  private ReadConfig(entries: AnnotationEntry[], config?: { [prop: string]: any }): void {
    if (config == null) {
      return;
    }
    for (const [name, value] of Object.entries(config)) {
      if (typeof value === 'function') {
        continue;
      }
      entries.push({
        Source: 'config',
        Name: name,
        Value: configValue(value),
      });
    }
  }

  private ReadNamedAttr(entries: AnnotationEntry[], namedAttr?: { [prop: string]: { [prop: string]: any } }): void {
    if (namedAttr == null) {
      return;
    }
    for (const [target, values] of Object.entries(namedAttr)) {
      for (const [name, value] of Object.entries(values)) {
        entries.push({
          Source: 'namedAttr',
          Target: target,
          Name: name,
          Value: value,
        });
      }
    }
  }

  private ReadModifierGroup(entries: AnnotationEntry[], source: AnnotationSource, group?: any): void {
    if (group == null) {
      return;
    }
    for (const identifier of group.Identifiers ?? []) {
      entries.push({
        Source: source,
        Name: wordName(identifier),
        Value: true,
      });
    }
    for (const [key, value] of group.NamedValues?.entries?.() ?? []) {
      entries.push({
        Source: source,
        Name: wordName(key),
        Value: value,
      });
    }
    for (const knot of group.Knots ?? []) {
      const name = wordName(knot.Name) ?? wordName(knot.Core);
      if (name != null) {
        entries.push({
          Source: source,
          Name: name,
          Value: knot,
        });
      }
    }
    if (group.UnorderedMap != null) {
      this.ReadAttr(entries, group.UnorderedMap);
    }
  }
}

export class SchemaConstraintProfile {
  public ValidateRequiredOverride(parent: any, child: any): string[] {
    const extractor = new AnnotationExtractor();
    const parentRequired = extractor.IsRequired(parent);
    const childRequired = extractor.IsRequired(child);
    if (parentRequired && !childRequired) {
      return ['Required annotation cannot be loosened by an overriding declaration.'];
    }
    return [];
  }
}

function wordName(node: any): string {
  if (node instanceof KnWord) {
    return node.GetFullNameStr();
  }
  if (node instanceof KnKnot && node.Name instanceof KnWord) {
    return node.Name.GetFullNameStr();
  }
  if (node instanceof KnKnot && node.Core instanceof KnWord) {
    return node.Core.GetFullNameStr();
  }
  return typeof node === 'string' ? node : null;
}

function configValue(node: any): any {
  if (node instanceof KnWord) {
    const name = node.GetFullNameStr();
    if (name === 'true') {
      return true;
    }
    if (name === 'false') {
      return false;
    }
    return name;
  }
  return node;
}
