/**
 * A22 Canonical IR v1.0
 * TypeScript Definitions
 *
 * Auto-generated from spec/ir.schema.json
 */
export interface A22IR {
    version: string;
    metadata?: Metadata;
    agents: Agent[];
    tools: Tool[];
    types?: CustomType[];
    flows: Flow[];
    capabilities?: Capability[];
}
export interface Metadata {
    id?: string;
    name?: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    tags?: string[];
}
export interface Agent {
    id: string;
    name: string;
    model?: ModelConfig;
    system_prompt?: string;
    inputs?: TypeRef[];
    outputs?: TypeRef[];
    memory?: MemoryConfig;
    permissions?: Permission[];
    capabilities?: string[];
}
export interface ModelConfig {
    provider: string;
    name: string;
    params?: Record<string, any>;
}
export interface MemoryConfig {
    enabled?: boolean;
    strategy?: 'none' | 'window' | 'semantic' | 'hybrid';
    params?: Record<string, any>;
}
export interface Permission {
    resource: string;
    action: 'read' | 'write' | 'execute' | 'admin';
}
export interface Tool {
    id: string;
    name: string;
    schema: ToolSchema;
    runtime?: 'http' | 'js' | 'python' | 'native';
    config?: Record<string, any>;
}
export interface ToolSchema {
    input?: TypeRef;
    output?: TypeRef;
}
export interface CustomType {
    name: string;
    description?: string;
    fields: Field[];
}
export interface Field {
    name: string;
    type: TypeRef;
    optional?: boolean;
}
export interface TypeRef {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'custom';
    ref?: string;
    items?: TypeRef;
}
export interface Flow {
    id: string;
    name: string;
    inputs?: TypeRef[];
    steps: FlowStep[];
    outputs?: TypeRef[];
    error_boundary?: ErrorBoundary;
}
export interface FlowStep {
    id: string;
    kind: 'agent' | 'tool' | 'branch' | 'parallel' | 'subflow';
    agent?: string;
    tool?: string;
    subflow?: string;
    input_map?: Record<string, any>;
    output_map?: Record<string, any>;
    condition?: string;
    branches?: Branch[];
    parallel?: FlowStep[];
    retry?: RetryPolicy;
}
export interface Branch {
    when: string;
    steps: FlowStep[];
}
export interface RetryPolicy {
    max_retries?: number;
    backoff?: 'none' | 'linear' | 'exponential';
}
export interface ErrorBoundary {
    on_error?: 'retry' | 'skip' | 'stop' | 'handler';
    handler_flow?: string;
}
export interface Capability {
    id: string;
    description: string;
    params?: Record<string, any>;
}
