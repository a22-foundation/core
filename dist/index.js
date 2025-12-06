import { Lexer } from './lexer.js';
import { A22Parser } from './parser.js';
import * as fs from 'fs';
// Validator
export class Validator {
    constructor() {
        this.blockIds = new Set();
        this.providers = new Set();
        this.policies = new Set();
        this.tools = new Set();
        this.workflows = new Set();
        this.capabilities = new Set();
    }
    validate(program) {
        const errors = [];
        // First pass: collect all declared IDs
        for (const block of program.blocks) {
            const id = block.identifier;
            const key = `${block.type}.${id}`;
            if (this.blockIds.has(key)) {
                errors.push(`Duplicate definition: ${key}`);
            }
            this.blockIds.add(key);
            // Track specific types for reference validation
            switch (block.type) {
                case 'provider':
                    this.providers.add(id);
                    break;
                case 'policy':
                    this.policies.add(id);
                    break;
                case 'tool':
                    this.tools.add(id);
                    break;
                case 'workflow':
                    this.workflows.add(id);
                    break;
                case 'capability':
                    this.capabilities.add(id);
                    break;
            }
        }
        // Second pass: validate each block
        for (const block of program.blocks) {
            errors.push(...this.validateBlock(block));
        }
        return errors;
    }
    validateBlock(block) {
        const errors = [];
        switch (block.type) {
            case 'provider':
                errors.push(...this.validateProvider(block));
                break;
            case 'policy':
                errors.push(...this.validatePolicy(block));
                break;
            case 'agent':
                errors.push(...this.validateAgent(block));
                break;
            case 'tool':
                errors.push(...this.validateTool(block));
                break;
        }
        return errors;
    }
    validateProvider(block) {
        const errors = [];
        const typeAttr = this.findAttribute(block, 'type');
        if (!typeAttr) {
            errors.push(`Provider "${block.identifier}" missing required 'type' attribute`);
        }
        else {
            const type = this.extractLiteralValue(typeAttr.value);
            const validTypes = ['llm', 'embedding', 'vision', 'audio'];
            if (type && !validTypes.includes(type)) {
                errors.push(`Provider "${block.identifier}" has invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
            }
        }
        // Validate credentials are references, not literals (parser already checks for literal keys)
        const credAttr = this.findAttribute(block, 'credentials');
        if (credAttr && credAttr.value.kind === 'Reference') {
            const ref = credAttr.value;
            if (ref.path[0] !== 'env' && ref.path[0] !== 'secrets') {
                errors.push(`Provider "${block.identifier}" credentials must reference env.* or secrets.*, got: ${ref.path.join('.')}`);
            }
        }
        return errors;
    }
    validatePolicy(block) {
        const errors = [];
        // Validate limits are positive numbers
        const limitsBlock = this.findChildBlock(block, 'limits');
        if (limitsBlock) {
            for (const attr of limitsBlock.attributes) {
                const value = this.extractLiteralValue(attr.value);
                if (typeof value === 'number' && value <= 0) {
                    errors.push(`Policy "${block.identifier}" limit "${attr.key}" must be a positive number`);
                }
            }
        }
        return errors;
    }
    validateAgent(block) {
        const errors = [];
        // Validate policy reference
        const policyAttr = this.findAttribute(block, 'policy');
        if (policyAttr && policyAttr.value.kind === 'Reference') {
            const ref = policyAttr.value;
            const policyName = ref.path[ref.path.length - 1];
            if (!this.policies.has(policyName)) {
                errors.push(`Agent "${block.identifier}" references undefined policy: ${policyName}`);
            }
        }
        // Validate model references if using advanced config
        const modelBlock = this.findChildBlock(block, 'model');
        if (modelBlock) {
            errors.push(...this.validateModelConfig(block.identifier, modelBlock));
        }
        // Validate isolation levels
        const isolationBlock = this.findChildBlock(block, 'isolation');
        if (isolationBlock) {
            errors.push(...this.validateIsolation(block.identifier, isolationBlock));
        }
        return errors;
    }
    validateModelConfig(agentId, modelBlock) {
        const errors = [];
        // Validate strategy
        const strategyAttr = this.findAttribute(modelBlock, 'strategy');
        if (strategyAttr) {
            const strategy = this.extractLiteralValue(strategyAttr.value);
            const validStrategies = ['failover', 'cost_optimized', 'latency_optimized', 'capability_based', 'round_robin'];
            if (strategy && !validStrategies.includes(strategy)) {
                errors.push(`Agent "${agentId}" has invalid strategy "${strategy}". Must be one of: ${validStrategies.join(', ')}`);
            }
        }
        return errors;
    }
    validateIsolation(agentId, isolationBlock) {
        const errors = [];
        const memoryAttr = this.findAttribute(isolationBlock, 'memory');
        if (memoryAttr) {
            const value = this.extractLiteralValue(memoryAttr.value);
            const validLevels = ['strict', 'shared', 'none'];
            if (value && !validLevels.includes(value)) {
                errors.push(`Agent "${agentId}" isolation.memory must be one of: ${validLevels.join(', ')}`);
            }
        }
        const networkAttr = this.findAttribute(isolationBlock, 'network');
        if (networkAttr) {
            const value = this.extractLiteralValue(networkAttr.value);
            const validLevels = ['full', 'limited', 'none'];
            if (value && !validLevels.includes(value)) {
                errors.push(`Agent "${agentId}" isolation.network must be one of: ${validLevels.join(', ')}`);
            }
        }
        const fsAttr = this.findAttribute(isolationBlock, 'filesystem');
        if (fsAttr) {
            const value = this.extractLiteralValue(fsAttr.value);
            const validLevels = ['full', 'readonly', 'none'];
            if (value && !validLevels.includes(value)) {
                errors.push(`Agent "${agentId}" isolation.filesystem must be one of: ${validLevels.join(', ')}`);
            }
        }
        return errors;
    }
    validateTool(block) {
        const errors = [];
        // Validate sandbox configuration
        const securityBlock = this.findChildBlock(block, 'security');
        if (securityBlock) {
            const sandboxBlock = this.findChildBlock(securityBlock, 'sandbox');
            if (sandboxBlock) {
                // Validate timeout and memory are positive
                const timeoutAttr = this.findAttribute(sandboxBlock, 'timeout_ms');
                if (timeoutAttr) {
                    const value = this.extractLiteralValue(timeoutAttr.value);
                    if (typeof value === 'number' && value <= 0) {
                        errors.push(`Tool "${block.identifier}" sandbox.timeout_ms must be positive`);
                    }
                }
                const memoryAttr = this.findAttribute(sandboxBlock, 'max_memory_mb');
                if (memoryAttr) {
                    const value = this.extractLiteralValue(memoryAttr.value);
                    if (typeof value === 'number' && value <= 0) {
                        errors.push(`Tool "${block.identifier}" sandbox.max_memory_mb must be positive`);
                    }
                }
            }
        }
        return errors;
    }
    findAttribute(block, key) {
        return block.attributes.find(attr => attr.key === key);
    }
    findChildBlock(block, type) {
        return block.children.find(child => child.type === type);
    }
    extractLiteralValue(expr) {
        if (expr.kind === 'Literal') {
            return expr.value;
        }
        return undefined;
    }
}
// Transpiler
export class Transpiler {
    toIR(program) {
        const ir = {
            version: "1.0",
            agents: [],
            tools: [],
            flows: [],
            providers: [],
            policies: [],
            capabilities: [],
            templates: [],
            configs: [],
            types: []
        };
        for (const block of program.blocks) {
            switch (block.type) {
                case 'agent':
                    ir.agents.push(this.transformAgent(block));
                    break;
                case 'tool':
                    ir.tools.push(this.transformTool(block));
                    break;
                case 'workflow':
                    ir.flows.push(this.transformWorkflow(block));
                    break;
                case 'provider':
                    ir.providers.push(this.transformProvider(block));
                    break;
                case 'policy':
                    ir.policies.push(this.transformPolicy(block));
                    break;
                case 'capability':
                    ir.capabilities.push(this.transformCapability(block));
                    break;
                case 'template':
                    ir.templates.push(this.transformTemplate(block));
                    break;
                case 'config':
                    ir.configs.push(this.transformConfig(block));
                    break;
                case 'data':
                    ir.types.push(this.transformDataType(block));
                    break;
            }
        }
        return ir;
    }
    transformAgent(block) {
        const agent = {
            id: block.identifier,
            name: block.identifier
        };
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'system_prompt':
                    agent.system_prompt = this.extractString(attr.value);
                    break;
                case 'prompt_template':
                    agent.prompt_template = this.extractReference(attr.value);
                    break;
                case 'capabilities':
                    agent.capabilities = this.extractStringArray(attr.value);
                    break;
                case 'model':
                    if (attr.value.kind === 'Literal') {
                        // Simple model string - convert to ModelConfig
                        const modelStr = this.extractString(attr.value);
                        const parts = modelStr.split('/');
                        if (parts.length === 2) {
                            agent.model = {
                                provider: parts[0],
                                name: parts[1]
                            };
                        }
                        else {
                            // Assume it's just a model name, provider unknown
                            agent.model = {
                                provider: 'default',
                                name: modelStr
                            };
                        }
                    }
                    break;
                case 'policy':
                    agent.policy = this.extractReference(attr.value);
                    break;
            }
        }
        // Handle nested blocks
        for (const child of block.children) {
            switch (child.type) {
                case 'model':
                    agent.model = this.transformModelConfig(child);
                    break;
                case 'policy':
                    agent.policy = this.transformPolicy(child);
                    break;
                case 'isolation':
                    agent.isolation = this.transformIsolation(child);
                    break;
            }
        }
        return agent;
    }
    transformModelConfig(block) {
        const config = {};
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'primary':
                    if (attr.value.kind === 'Map') {
                        config.primary = this.extractModelProviderConfig(attr.value);
                    }
                    break;
                case 'fallback':
                    if (attr.value.kind === 'List') {
                        config.fallback = attr.value.elements
                            .filter(e => e.kind === 'Map')
                            .map(e => this.extractModelProviderConfig(e));
                    }
                    break;
                case 'strategy':
                    config.strategy = this.extractString(attr.value);
                    break;
            }
        }
        return config;
    }
    extractModelProviderConfig(map) {
        const config = {};
        for (const prop of map.properties) {
            if (prop.key === 'provider') {
                config.provider = this.extractReference(prop.value);
            }
            else if (prop.key === 'name') {
                config.name = this.extractString(prop.value);
            }
            else if (prop.key === 'params' && prop.value.kind === 'Map') {
                config.params = this.extractMap(prop.value);
            }
        }
        return config;
    }
    transformIsolation(block) {
        const isolation = {};
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'memory':
                    isolation.memory = this.extractString(attr.value);
                    break;
                case 'network':
                    isolation.network = this.extractString(attr.value);
                    break;
                case 'filesystem':
                    isolation.filesystem = this.extractString(attr.value);
                    break;
            }
        }
        return isolation;
    }
    transformTool(block) {
        const tool = {
            id: block.identifier,
            name: block.identifier,
            schema: {}
        };
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'runtime':
                    tool.runtime = this.extractString(attr.value);
                    break;
                case 'handler':
                    tool.handler = this.extractString(attr.value);
                    break;
            }
        }
        // Handle nested blocks
        for (const child of block.children) {
            switch (child.type) {
                case 'schema':
                    tool.schema = this.transformToolSchema(child);
                    break;
                case 'security':
                    tool.security = this.transformToolSecurity(child);
                    break;
            }
        }
        return tool;
    }
    transformToolSchema(block) {
        const schema = {};
        for (const attr of block.attributes) {
            // For now, store schema attributes as-is
            // Full type transformation would go here
        }
        return schema;
    }
    transformToolSecurity(block) {
        const security = {};
        for (const child of block.children) {
            switch (child.type) {
                case 'validate':
                    security.validate = this.transformValidationRules(child);
                    break;
                case 'sandbox':
                    security.sandbox = this.transformSandbox(child);
                    break;
                case 'output':
                    security.output = this.transformOutputValidation(child);
                    break;
            }
        }
        return security;
    }
    transformValidationRules(block) {
        const rules = {};
        for (const child of block.children) {
            const fieldRules = {};
            for (const attr of child.attributes) {
                const value = this.extractValue(attr.value);
                switch (attr.key) {
                    case 'max_length':
                    case 'min_length':
                    case 'min':
                    case 'max':
                        fieldRules[attr.key] = value;
                        break;
                    case 'pattern':
                        fieldRules.pattern = value;
                        break;
                    case 'deny_patterns':
                        fieldRules.deny_patterns = this.extractStringArray(attr.value);
                        break;
                }
            }
            rules[child.identifier] = fieldRules;
        }
        return rules;
    }
    transformSandbox(block) {
        const sandbox = {};
        for (const attr of block.attributes) {
            const value = this.extractValue(attr.value);
            switch (attr.key) {
                case 'timeout_ms':
                case 'max_memory_mb':
                    sandbox[attr.key] = value;
                    break;
                case 'network_allowed':
                case 'filesystem_allowed':
                    sandbox[attr.key] = value;
                    break;
                case 'network_hosts':
                case 'filesystem_paths':
                    sandbox[attr.key] = this.extractStringArray(attr.value);
                    break;
                case 'filesystem_mode':
                    sandbox.filesystem_mode = value;
                    break;
            }
        }
        return sandbox;
    }
    transformOutputValidation(block) {
        const output = {};
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'max_size_kb':
                    output.max_size_kb = this.extractNumber(attr.value);
                    break;
            }
        }
        return output;
    }
    transformWorkflow(block) {
        const flow = {
            id: block.identifier,
            name: block.identifier,
            steps: []
        };
        // Simple workflow transformation (would need to be expanded)
        for (const child of block.children) {
            if (child.type === 'steps') {
                // Transform steps
            }
        }
        return flow;
    }
    transformProvider(block) {
        const provider = {
            id: block.identifier,
            name: block.identifier,
            type: 'llm'
        };
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'type':
                    provider.type = this.extractString(attr.value);
                    break;
                case 'credentials':
                    if (attr.value.kind === 'Reference') {
                        provider.credentials = this.transformCredentialReference(attr.value);
                    }
                    else if (attr.value.kind === 'Map') {
                        provider.credentials = this.extractMap(attr.value);
                    }
                    break;
            }
        }
        // Handle nested config and limits blocks
        for (const child of block.children) {
            switch (child.type) {
                case 'config':
                    provider.config = this.extractBlockAsMap(child);
                    break;
                case 'limits':
                    provider.limits = this.transformRateLimits(child);
                    break;
            }
        }
        return provider;
    }
    transformCredentialReference(ref) {
        return {
            type: ref.path[0],
            ref: ref.path.slice(1).join('.')
        };
    }
    transformRateLimits(block) {
        const limits = {};
        for (const attr of block.attributes) {
            const value = this.extractNumber(attr.value);
            switch (attr.key) {
                case 'requests_per_minute':
                case 'tokens_per_minute':
                case 'requests_per_day':
                    limits[attr.key] = value;
                    break;
            }
        }
        return limits;
    }
    transformPolicy(block) {
        const policy = {
            id: block.identifier,
            name: block.identifier
        };
        for (const child of block.children) {
            switch (child.type) {
                case 'allow':
                    policy.allow = this.transformPolicyAllow(child);
                    break;
                case 'deny':
                    policy.deny = this.transformPolicyDeny(child);
                    break;
                case 'limits':
                    policy.limits = this.transformResourceLimits(child);
                    break;
            }
        }
        return policy;
    }
    transformPolicyAllow(block) {
        const allow = {};
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'tools':
                case 'workflows':
                case 'data':
                case 'capabilities':
                    allow[attr.key] = this.extractStringArray(attr.value);
                    break;
            }
        }
        return allow;
    }
    transformPolicyDeny(block) {
        const deny = {};
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'tools':
                case 'workflows':
                case 'data':
                    deny[attr.key] = this.extractStringArray(attr.value);
                    break;
            }
        }
        return deny;
    }
    transformResourceLimits(block) {
        const limits = {};
        for (const attr of block.attributes) {
            const value = this.extractNumber(attr.value);
            switch (attr.key) {
                case 'max_memory_mb':
                case 'max_execution_time':
                case 'max_tool_calls':
                case 'max_workflow_depth':
                    limits[attr.key] = value;
                    break;
            }
        }
        return limits;
    }
    transformCapability(block) {
        const capability = {
            id: block.identifier,
            name: block.identifier,
            kind: 'external'
        };
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'kind':
                    capability.kind = this.extractString(attr.value);
                    break;
                case 'description':
                    capability.description = this.extractString(attr.value);
                    break;
            }
        }
        for (const child of block.children) {
            switch (child.type) {
                case 'requires':
                    capability.requires = this.transformCapabilityRequirements(child);
                    break;
                case 'grants':
                    capability.grants = this.transformCapabilityGrants(child);
                    break;
            }
        }
        return capability;
    }
    transformCapabilityRequirements(block) {
        const requires = {};
        for (const attr of block.attributes) {
            if (attr.key === 'permissions' && attr.value.kind === 'List') {
                const list = attr.value;
                requires.permissions = list.elements
                    .filter(e => e.kind === 'Map')
                    .map(e => this.extractPermission(e));
            }
        }
        return requires;
    }
    extractPermission(map) {
        const permission = {};
        for (const prop of map.properties) {
            if (prop.key === 'resource') {
                permission.resource = this.extractString(prop.value);
            }
            else if (prop.key === 'action') {
                permission.action = this.extractString(prop.value);
            }
        }
        return permission;
    }
    transformCapabilityGrants(block) {
        const grants = {};
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'tools':
                case 'workflows':
                case 'data':
                    grants[attr.key] = this.extractStringArray(attr.value);
                    break;
            }
        }
        return grants;
    }
    transformTemplate(block) {
        const template = {
            id: block.identifier,
            name: block.identifier
        };
        for (const attr of block.attributes) {
            switch (attr.key) {
                case 'system':
                case 'user_prefix':
                case 'user_suffix':
                case 'format':
                    template[attr.key] = this.extractString(attr.value);
                    break;
            }
        }
        return template;
    }
    transformConfig(block) {
        const config = {
            id: block.identifier,
            name: block.identifier,
            config: this.extractBlockAsMap(block)
        };
        for (const attr of block.attributes) {
            if (attr.key === 'type') {
                config.type = this.extractString(attr.value);
            }
        }
        return config;
    }
    transformDataType(block) {
        const customType = {
            name: block.identifier,
            fields: []
        };
        for (const attr of block.attributes) {
            if (attr.key === 'description') {
                customType.description = this.extractString(attr.value);
            }
        }
        // Transform fields from attributes with colons
        for (const attr of block.attributes) {
            if (attr.key !== 'description') {
                customType.fields.push({
                    name: attr.key,
                    type: { type: 'string' }, // Simplified - would need full type parsing
                    optional: false
                });
            }
        }
        return customType;
    }
    // Helper methods
    extractString(expr) {
        if (expr.kind === 'Literal') {
            return String(expr.value);
        }
        return '';
    }
    extractNumber(expr) {
        if (expr.kind === 'Literal') {
            return Number(expr.value);
        }
        return 0;
    }
    extractValue(expr) {
        if (expr.kind === 'Literal') {
            return expr.value;
        }
        return '';
    }
    extractReference(expr) {
        if (expr.kind === 'Reference') {
            return expr.path.join('.');
        }
        return '';
    }
    extractStringArray(expr) {
        if (expr.kind === 'List') {
            return expr.elements
                .filter(e => e.kind === 'Literal')
                .map(e => String(e.value));
        }
        return [];
    }
    extractMap(map) {
        const result = {};
        for (const prop of map.properties) {
            result[prop.key] = this.extractValue(prop.value);
        }
        return result;
    }
    extractBlockAsMap(block) {
        const result = {};
        for (const attr of block.attributes) {
            result[attr.key] = this.extractValue(attr.value);
        }
        return result;
    }
}
// Main CLI
export function compile(filePath) {
    console.log(`Compiling ${filePath}...`);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lexer = new Lexer(content);
        const tokens = lexer.tokenize();
        const parser = new A22Parser(tokens);
        const ast = parser.parse();
        const validator = new Validator();
        const errors = validator.validate(ast);
        if (errors.length > 0) {
            console.error("Validation failed:");
            errors.forEach(e => console.error(`- ${e}`));
            process.exit(1);
        }
        const transpiler = new Transpiler();
        const ir = transpiler.toIR(ast);
        console.log(JSON.stringify(ir, null, 2));
    }
    catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
// Simple CLI entry
// In ESM, we can check if the file is being run directly by comparing import.meta.url with the script path,
// or just rely on the fact that we are invoking it from CLI.
// For now, let's just run it if arguments are provided.
// Simple check if running from CLI
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: node index.js <file>");
        process.exit(1);
    }
    compile(args[0]);
}
