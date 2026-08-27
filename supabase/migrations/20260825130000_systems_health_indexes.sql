-- Systems Health cockpit query support indexes (plan: tscopier-admin/docs/systems-health-plan.md v2)
-- Apply to STAGING first, verify dashboard, then prod.

CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_exec_logs_created_at ON public.trade_execution_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispatch_claims_created_at ON public.signal_broker_dispatch_claims (created_at);
