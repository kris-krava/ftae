-- =============================================================================
-- Add trade_completion to credit_type enum
--
-- Isolated in its own migration file because ALTER TYPE ... ADD VALUE cannot
-- be used in the same transaction as any statement that references the new
-- value. Running this in a separate file ensures the value is committed before
-- migration 000004 opens its transaction and updates the trigger function.
-- =============================================================================

alter type credit_type add value 'trade_completion';
