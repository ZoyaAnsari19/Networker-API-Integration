-- Enable binary weak-leg ratio: both legs must have BV and the smaller leg
-- must be at least ratio_rule_max percent of total (default 30 → 30/70 passes, 20/80 blocked).

UPDATE commission_config
SET config_value = '{"value": true}'::jsonb, updated_at = NOW()
WHERE config_key = 'ratio_rule_enabled';

UPDATE commission_config
SET config_value = '{"value": 30}'::jsonb, updated_at = NOW()
WHERE config_key = 'ratio_rule_max';
