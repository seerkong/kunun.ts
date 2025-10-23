// Bun `with { type: "file" }` imports resolve to a file path string (real
// path in dev, /$bunfs/root/... inside a compiled binary).
declare module '*.txt' {
  const filePath: string;
  export default filePath;
}
declare module '*.kon' {
  const filePath: string;
  export default filePath;
}
declare module '*.md' {
  const filePath: string;
  export default filePath;
}

// Minimal Bun global surface used by this package (avoids pulling full
// bun-types, which conflicts with the repo's @types/node).
declare const Bun: {
  file(path: string): { text(): Promise<string> };
  embeddedFiles?: ArrayLike<unknown>;
  main?: string;
};
