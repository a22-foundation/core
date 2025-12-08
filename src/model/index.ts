/**
 * A22 v3.0 Core Model
 *
 * Pure event ontology model for A22 agentic systems.
 * This is the foundational type system aligned with the v3.0 specification.
 *
 * Core principles:
 * - Events are the fundamental ontology
 * - Agents perceive, interpret, and produce events
 * - Systems define temporal guarantees and constraints
 * - Everything is event-driven, minimal, declarative
 */

// Event model - foundational types
export type {
  A22Event,
  EventMetadata,
  EventHistory,
  EventHistoryIndex,
  EventPattern,
  EventEmission,
  EmissionCondition,
  EventSubscription,
  HistoryAccess,
  HistoryWindow,
  EventQuery,
  EventHandler,
  EventSubscriptionHandle
} from './event.js';

export {
  createEventPattern
} from './event.js';

// Agent model - event-driven agent definitions
export type {
  Agent,
  AgentCapabilities,
  AgentSubscriptions,
  Interpretation,
  InterpretationStrategy,
  LLMInterpretationConfig,
  InterpretationRule,
  AgentMetadata,
  Capability,
  Permission,
  AgentValidationResult,
  AgentValidationError,
  AgentValidationWarning,
  AgentValidator
} from './agent.js';

export {
  validateAgent
} from './agent.js';

// System model - systems with guarantees and constraints
export type {
  System,
  TemporalGuarantee,
  TemporalGuaranteeType,
  SystemConstraint,
  ConstraintType,
  ConstraintSeverity,
  SystemMetadata,
  SystemValidationResult,
  SystemValidationError,
  SystemValidationWarning,
  SystemValidator
} from './system.js';

export {
  validateSystem,
  checkTemporalGuarantee
} from './system.js';
