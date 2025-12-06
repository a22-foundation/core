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
    providers?: Provider[];
    policies?: Policy[];
    templates?: Template[];
    configs?: Config[];
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
    model?: ModelConfig | AdvancedModelConfig;
    system_prompt?: string;
    prompt_template?: string;
    inputs?: TypeRef[];
    outputs?: TypeRef[];
    memory?: MemoryConfig;
    permissions?: Permission[];
    capabilities?: string[];
    policy?: string | Policy;  // Reference or inline
    isolation?: IsolationConfig;
    event_handlers?: EventHandler[];
}

export interface ModelConfig {
    provider: string;
    name: string;
    params?: Record<string, any>;
}

export interface AdvancedModelConfig {
    primary: ModelProviderConfig;
    fallback?: ModelProviderConfig[];
    strategy?: 'failover' | 'cost_optimized' | 'latency_optimized' | 'capability_based' | 'round_robin';
}

export interface ModelProviderConfig {
    provider: string;  // Reference to provider block
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
    handler?: string;
    security?: ToolSecurityConfig;
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

    // Kind-specific fields
    agent?: string;
    tool?: string;
    subflow?: string;

    input_map?: Record<string, any>;
    output_map?: Record<string, any>;

    // Branching
    condition?: string;
    branches?: Branch[];

    // Parallel
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
    name: string;
    kind: 'external' | 'system' | 'builtin';
    description?: string;
    params?: Record<string, any>;
    requires?: CapabilityRequirements;
    grants?: CapabilityGrants;
}

export interface CapabilityRequirements {
    permissions?: Permission[];
}

export interface CapabilityGrants {
    tools?: string[];
    workflows?: string[];
    data?: string[];
}

// New interfaces for model gateway

export interface Provider {
    id: string;
    name: string;
    type: 'llm' | 'embedding' | 'vision' | 'audio';
    credentials?: CredentialReference | CredentialBlock;
    config?: ProviderConfig;
    limits?: RateLimits;
}

export interface CredentialReference {
    type: 'env' | 'secrets';
    ref: string;  // e.g., "OPENAI_API_KEY"
}

export interface CredentialBlock {
    [key: string]: CredentialReference;
}

export interface ProviderConfig {
    endpoint?: string;
    timeout?: number;
    retry?: boolean;
    [key: string]: any;  // Provider-specific config
}

export interface RateLimits {
    requests_per_minute?: number;
    tokens_per_minute?: number;
    requests_per_day?: number;
}

// New interfaces for security

export interface Policy {
    id: string;
    name: string;
    allow?: PolicyAllow;
    deny?: PolicyDeny;
    limits?: ResourceLimits;
}

export interface PolicyAllow {
    tools?: string[];
    workflows?: string[];
    data?: string[];
    capabilities?: string[];
}

export interface PolicyDeny {
    tools?: string[];
    workflows?: string[];
    data?: string[];
}

export interface ResourceLimits {
    max_memory_mb?: number;
    max_execution_time?: number;
    max_tool_calls?: number;
    max_workflow_depth?: number;
}

export interface IsolationConfig {
    memory?: 'strict' | 'shared' | 'none';
    network?: 'full' | 'limited' | 'none';
    filesystem?: 'full' | 'readonly' | 'none';
}

export interface ToolSecurityConfig {
    validate?: ValidationRules;
    sandbox?: SandboxConfig;
    output?: OutputValidation;
}

export interface ValidationRules {
    [fieldName: string]: FieldValidation;
}

export interface FieldValidation {
    max_length?: number;
    min_length?: number;
    pattern?: string;
    deny_patterns?: string[];
    min?: number;
    max?: number;
}

export interface SandboxConfig {
    timeout_ms?: number;
    max_memory_mb?: number;
    network_allowed?: boolean;
    network_hosts?: string[];
    filesystem_allowed?: boolean;
    filesystem_paths?: string[];
    filesystem_mode?: 'readonly' | 'readwrite';
}

export interface OutputValidation {
    max_size_kb?: number;
    schema?: TypeRef;
}

// New interface for templates

export interface Template {
    id: string;
    name: string;
    system?: string;
    user_prefix?: string;
    user_suffix?: string;
    format?: string;
}

// New interface for config blocks

export interface Config {
    id: string;
    name: string;
    type?: 'audit' | 'monitoring' | 'custom';
    config: Record<string, any>;
}

export interface AuditConfig {
    enabled: boolean;
    log_events?: string[];
    destination?: string;
    format?: 'json' | 'text' | 'cef';
    retention_days?: number;
    include_payloads?: boolean;
}

export interface MonitoringConfig {
    usage_tracking?: boolean;
    cost_tracking?: boolean;
    metrics?: boolean;
    tracing?: boolean;
    budget?: BudgetConfig;
    health_check?: HealthCheckConfig;
    alerts?: AlertConfig;
}

export interface BudgetConfig {
    daily_limit_usd?: number;
    alert_threshold?: number;
    hard_stop?: boolean;
}

export interface HealthCheckConfig {
    interval_seconds?: number;
    endpoint?: string;
}

export interface AlertConfig {
    latency_threshold_ms?: number;
    error_rate_threshold?: number;
}

export interface EventHandler {
    event: string;
    workflow?: string;
    tool?: string;
}
