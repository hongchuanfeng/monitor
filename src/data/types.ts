export type Category = "monitor" | "anesthesia";

export type FrameField = {
  field: string;
  length: string;
  desc: string;
};

export type PhysioItem = {
  name: string;
  unit: string;
  range: string;
  resolution: string;
  note: string;
};

export type CommandItem = {
  name: string;
  request: string;
  response: string;
  desc: string;
};

export type DecodeItem = {
  hex: string;
  desc: string;
};

export type Protocol = {
  slug: string;
  brand: string;
  brandSlug: string;
  category: Category;
  title: string;
  models: string[];
  interfaces: string[];
  baud: string;
  summary: string;
  updatedAt: string;
  overview: string[];
  physical: string[];
  frame: FrameField[];
  dictionary: PhysioItem[];
  commands: CommandItem[];
  sampleHex: string;
  decode: DecodeItem[];
  sources: string[];
  related: string[];
};

export type CodeExample = {
  slug: string;
  title: string;
  desc: string;
  lang: "csharp" | "java";
  filename: string;
  dependency?: string;
  code: string;
};

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};
