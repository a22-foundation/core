/**
 * A22 v3.0 Agent Model
 *
 * Agents perceive event streams, interpret histories, and produce new events.
 * Pure v3.0: event-driven, minimal, declarative.
 *
 * Aligned with natural language keywords:
 * - "knows how to" → capabilities.allowed
 * - "is not allowed to" → capabilities.forbidden
 * - "listens to" → subscriptions.listens
 * - "notices" → subscriptions.notices
 * - "speaks" → emissions
 * - "looks at X history" → histories
 * - "interprets X from Y history" → interpretations
 */

import {
  EventPattern,
  EventEmission,
  EventSubscription,
  HistoryAccess
} from './event.js';

/**
 * Core Agent definition (Pure v3.0)
 * An agent is an event-driven entity that perceives, interprets, and produces events
 */
export interface Agent {
  /** Unique agent identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agent capabilities - what it can and cannot do */
  capabilities: AgentCapabilities;

  /** Event subscriptions - what the agent listens to */
  subscriptions: AgentSubscriptions;

  /** Event emissions - what the agent speaks */
  emissions: EventEmission[];

  /** History access patterns - what the agent looks at */
  histories: HistoryAccess[];

  /** Interpretations - meaning extracted from histories */
  interpretations: Interpretation[];

  /** Optional metadata */
  metadata?: AgentMetadata;
}

/**
 * Agent capabilities - positive and forbidden
 * Aligned with "knows how to" and "is not allowed to"
 */
export interface AgentCapabilities {
  /** Capabilities the agent possesses (knows how to) */
  allowed: string[];

  /** Capabilities explicitly forbidden (is not allowed to) */
  forbidden: string[];
}

/**
 * Agent event subscriptions
 * Aligned with "listens to" and "notices"
 */
export interface AgentSubscriptions {
  /** Primary subscriptions - agent processes and responds (listens to) */
  listens: EventPattern[];

  /** Observation subscriptions - agent observes for side effects (notices) */
  notices: EventPattern[];
}

/**
 * Interpretation specification
 * Extracts meaning from event histories
 * Aligned with "interprets X from Y history"
 */
export interface Interpretation {
  /** Field name for the interpretation (e.g., "intent", "sentiment") */
  field: string;

  /** History pattern to interpret from */
  fromHistory: EventPattern;

  /** Interpretation strategy */
  strategy: InterpretationStrategy;

  /** Description of what is being interpreted */
  description?: string;
}

/**
 * Interpretation strategy - how to extract meaning
 */
export type InterpretationStrategy =
  | { type: 'llm'; config?: LLMInterpretationConfig }
  | { type: 'rule'; rules: InterpretationRule[] }
  | { type: 'plugin'; pluginId: string; config?: unknown }
  | { type: 'custom'; handler: string };

/**
 * LLM-based interpretation configuration
 */
export interface LLMInterpretationConfig {
  /** Prompt template for extraction */
  prompt?: string;

  /** Model to use for interpretation */
  model?: string;

  /** Expected output schema */
  schema?: unknown;

  /** Temperature for sampling */
  temperature?: number;
}

/**
 * Rule-based interpretation
 */
export interface InterpretationRule {
  /** Condition to match */
  condition: string;

  /** Value to extract when condition matches */
  extract: string;

  /** Priority (higher = evaluated first) */
  priority?: number;
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  /** Agent version */
  version?: string;

  /** Agent author */
  author?: string;

  /** Agent description */
  description?: string;

  /** Agent purpose */
  purpose?: string;

  /** Agent goal */
  goal?: string;

  /** Tags for discovery */
  tags?: string[];

  /** Custom metadata fields */
  [key: string]: unknown;
}

/**
 * Capability definition
 * Describes what a capability means and requires
 */
export interface Capability {
  /** Capability name */
  name: string;

  /** Description of the capability */
  description?: string;

  /** Dependencies on other capabilities */
  requires?: string[];

  /** Permissions needed for this capability */
  grants?: Permission[];

  /** Category for organization */
  category?: string;
}

/**
 * Permission specification
 * Used by capability definitions to declare required permissions
 */
export interface Permission {
  /** Resource being accessed */
  resource: string;

  /** Action being performed */
  action: string;

  /** Optional conditions */
  conditions?: Record<string, unknown>;
}

/**
 * Agent validation result
 */
export interface AgentValidationResult {
  /** Whether the agent is valid */
  valid: boolean;

  /** Validation errors */
  errors: AgentValidationError[];

  /** Validation warnings */
  warnings: AgentValidationWarning[];
}

/**
 * Agent validation error
 */
export interface AgentValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Field path where error occurred */
  field?: string;
}

/**
 * Agent validation warning
 */
export interface AgentValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Field path where warning applies */
  field?: string;
}

/**
 * Agent validator function type
 */
export type AgentValidator = (agent: Agent) => AgentValidationResult | Promise<AgentValidationResult>;

/**
 * Basic agent validator
 * Checks for required fields and common issues
 */
export function validateAgent(agent: Agent): AgentValidationResult {
  const errors: AgentValidationError[] = [];
  const warnings: AgentValidationWarning[] = [];

  // Check required fields
  if (!agent.id) {
    errors.push({
      code: 'MISSING_ID',
      message: 'Agent must have an id',
      field: 'id'
    });
  }

  if (!agent.name) {
    errors.push({
      code: 'MISSING_NAME',
      message: 'Agent must have a name',
      field: 'name'
    });
  }

  // Check subscriptions
  if (!agent.subscriptions.listens || agent.subscriptions.listens.length === 0) {
    warnings.push({
      code: 'NO_SUBSCRIPTIONS',
      message: 'Agent has no event subscriptions (listens to)',
      field: 'subscriptions.listens'
    });
  }

  // Check capabilities
  if (!agent.capabilities.allowed || agent.capabilities.allowed.length === 0) {
    warnings.push({
      code: 'NO_CAPABILITIES',
      message: 'Agent has no capabilities (knows how to)',
      field: 'capabilities.allowed'
    });
  }

  // Check for conflicting capabilities
  const forbidden = new Set(agent.capabilities.forbidden);
  const conflicts = agent.capabilities.allowed.filter(cap => forbidden.has(cap));
  if (conflicts.length > 0) {
    errors.push({
      code: 'CONFLICTING_CAPABILITIES',
      message: `Capabilities both allowed and forbidden: ${conflicts.join(', ')}`,
      field: 'capabilities'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
