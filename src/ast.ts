export type NodeType = 
  | "Program" 
  | "Block" 
  | "Attribute" 
  | "Literal" 
  | "Reference" 
  | "List" 
  | "Map";

export interface Node {
  kind: NodeType;
  loc?: SourceLocation;
}

export interface SourceLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface Program extends Node {
  kind: "Program";
  blocks: Block[];
}

export interface Block extends Node {
  kind: "Block";
  type: string;       // e.g., "agent", "tool"
  identifier: string; // e.g., "researcher"
  label?: string;     // e.g., "optional_label"
  attributes: Attribute[];
  children: Block[];
}

export interface Attribute extends Node {
  kind: "Attribute";
  key: string;
  value: Expression;
}

export type Expression = 
  | Literal 
  | Reference 
  | ListExpression 
  | MapExpression;

export interface Literal extends Node {
  kind: "Literal";
  value: string | number | boolean;
  raw: string;
}

export interface Reference extends Node {
  kind: "Reference";
  path: string[]; // e.g., ["tool", "web_search"]
}

export interface ListExpression extends Node {
  kind: "List";
  elements: Expression[];
}

export interface MapExpression extends Node {
  kind: "Map";
  properties: { key: string; value: Expression }[];
}
