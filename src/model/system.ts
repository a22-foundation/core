/**
 * A22 v3.0 System Model
 *
 * Systems are collections of agents with temporal guarantees and constraints.
 * Pure v3.0: event-driven, minimal, declarative.
 *
 * Aligned with natural language keywords:
 * - "when X should eventually Y" → temporal guarantees
 * - "holds", "ensures", "expects" → constraints
 */

import { Agent } from './agent.js';
import { EventPattern } from './event.js';

/**
 * Core System definition (Pure v3.0)
 * A system is a collection of agents with temporal guarantees and constraints
 */
export interface System {
  /** Unique system identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agents in this system */
  agents: Agent[];

  /** Temporal guarantees - liveness and ordering properties */
  temporalGuarantees: TemporalGuarantee[];

  /** System-level constraints - safety properties */
  constraints: SystemConstraint[];

  /** Optional metadata */
  metadata?: SystemMetadata;
}

/**
 * Temporal guarantee specification
 * Expresses "when X should eventually Y" - liveness properties
 */
export interface TemporalGuarantee {
  /** Unique guarantee identifier */
  id: string;

  /** Trigger event pattern - "when X" */
  when: EventPattern;

  /** Expected eventual event pattern - "should eventually Y" */
  shouldEventually: EventPattern;

  /** Optional timeout in milliseconds */
  timeout?: number;

  /** Optional description */
  description?: string;

  /** Guarantee type */
  type: TemporalGuaranteeType;
}

/**
 * Types of temporal guarantees
 */
export type TemporalGuaranteeType =
  | 'liveness'      // Eventually something happens
  | 'ordering'      // Events occur in specific order
  | 'response'      // Response to trigger within timeout
  | 'progress';     // System makes progress

/**
 * System constraint specification
 * Safety properties that must hold throughout system execution
 * Aligned with "holds", "ensures", "expects"
 */
export interface SystemConstraint {
  /** Unique constraint identifier */
  id: string;

  /** Constraint type */
  type: ConstraintType;

  /** Constraint expression (free-form) */
  expression: string;

  /** Severity level */
  severity: ConstraintSeverity;

  /** Optional description */
  description?: string;

  /** Validator function reference (for runtime checking) */
  validator?: string;
}

/**
 * Constraint types aligned with v3.0 keywords
 */
export type ConstraintType =
  | 'holds'     // Invariant that must always hold
  | 'ensures'   // Post-condition guarantee
  | 'expects';  // Pre-condition expectation

/**
 * Constraint severity levels
 */
export type ConstraintSeverity =
  | 'error'     // Violation is critical error
  | 'warning'   // Violation is warning
  | 'info';     // Violation is informational

/**
 * System metadata
 */
export interface SystemMetadata {
  /** System version */
  version?: string;

  /** System author */
  author?: string;

  /** System description */
  description?: string;

  /** System purpose */
  purpose?: string;

  /** Tags for discovery */
  tags?: string[];

  /** Custom metadata fields */
  [key: string]: unknown;
}

/**
 * System validation result
 */
export interface SystemValidationResult {
  /** Whether the system is valid */
  valid: boolean;

  /** Validation errors */
  errors: SystemValidationError[];

  /** Validation warnings */
  warnings: SystemValidationWarning[];
}

/**
 * System validation error
 */
export interface SystemValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Field path where error occurred */
  field?: string;

  /** Related entity ID (agent, guarantee, constraint) */
  entityId?: string;
}

/**
 * System validation warning
 */
export interface SystemValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Field path where warning applies */
  field?: string;

  /** Related entity ID */
  entityId?: string;
}

/**
 * System validator function type
 */
export type SystemValidator = (system: System) => SystemValidationResult | Promise<SystemValidationResult>;

/**
 * Basic system validator
 * Checks for required fields and common issues
 */
export function validateSystem(system: System): SystemValidationResult {
  const errors: SystemValidationError[] = [];
  const warnings: SystemValidationWarning[] = [];

  // Check required fields
  if (!system.id) {
    errors.push({
      code: 'MISSING_ID',
      message: 'System must have an id',
      field: 'id'
    });
  }

  if (!system.name) {
    errors.push({
      code: 'MISSING_NAME',
      message: 'System must have a name',
      field: 'name'
    });
  }

  // Check agents
  if (!system.agents || system.agents.length === 0) {
    warnings.push({
      code: 'NO_AGENTS',
      message: 'System has no agents',
      field: 'agents'
    });
  }

  // Check for duplicate agent IDs
  const agentIds = new Set<string>();
  for (const agent of system.agents) {
    if (agentIds.has(agent.id)) {
      errors.push({
        code: 'DUPLICATE_AGENT_ID',
        message: `Duplicate agent ID: ${agent.id}`,
        field: 'agents',
        entityId: agent.id
      });
    }
    agentIds.add(agent.id);
  }

  // Validate temporal guarantees
  for (const guarantee of system.temporalGuarantees) {
    if (!guarantee.when || !guarantee.when.pattern) {
      errors.push({
        code: 'INVALID_TEMPORAL_GUARANTEE',
        message: `Temporal guarantee ${guarantee.id} missing 'when' pattern`,
        field: 'temporalGuarantees',
        entityId: guarantee.id
      });
    }

    if (!guarantee.shouldEventually || !guarantee.shouldEventually.pattern) {
      errors.push({
        code: 'INVALID_TEMPORAL_GUARANTEE',
        message: `Temporal guarantee ${guarantee.id} missing 'shouldEventually' pattern`,
        field: 'temporalGuarantees',
        entityId: guarantee.id
      });
    }

    // Check if any agent can produce the expected event
    const canProduceEvent = system.agents.some(agent =>
      agent.emissions.some(emission =>
        guarantee.shouldEventually.matches(emission.eventType)
      )
    );

    if (!canProduceEvent) {
      warnings.push({
        code: 'UNPRODUCIBLE_EVENT',
        message: `Temporal guarantee ${guarantee.id} expects event '${guarantee.shouldEventually.pattern}' but no agent can produce it`,
        field: 'temporalGuarantees',
        entityId: guarantee.id
      });
    }
  }

  // Validate constraints
  for (const constraint of system.constraints) {
    if (!constraint.expression) {
      errors.push({
        code: 'INVALID_CONSTRAINT',
        message: `Constraint ${constraint.id} has empty expression`,
        field: 'constraints',
        entityId: constraint.id
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if a temporal guarantee is satisfied by an event sequence
 * Used for runtime validation and testing
 */
export function checkTemporalGuarantee(
  guarantee: TemporalGuarantee,
  events: Array<{ type: string; time: string }>
): {
  satisfied: boolean;
  triggerEvent?: { type: string; time: string };
  responseEvent?: { type: string; time: string };
  timedOut?: boolean;
} {
  // Find trigger event
  const triggerEvent = events.find(e => guarantee.when.matches(e.type));
  if (!triggerEvent) {
    return { satisfied: true }; // No trigger, so guarantee is vacuously satisfied
  }

  // Find response event after trigger
  const triggerTime = new Date(triggerEvent.time).getTime();
  const responseEvent = events
    .filter(e => new Date(e.time).getTime() > triggerTime)
    .find(e => guarantee.shouldEventually.matches(e.type));

  if (!responseEvent) {
    return {
      satisfied: false,
      triggerEvent,
      timedOut: false
    };
  }

  // Check timeout if specified
  if (guarantee.timeout) {
    const responseTime = new Date(responseEvent.time).getTime();
    const elapsed = responseTime - triggerTime;

    if (elapsed > guarantee.timeout) {
      return {
        satisfied: false,
        triggerEvent,
        responseEvent,
        timedOut: true
      };
    }
  }

  return {
    satisfied: true,
    triggerEvent,
    responseEvent,
    timedOut: false
  };
}
