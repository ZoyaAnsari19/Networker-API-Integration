import {
  listCommissionConfigs,
  listPayoutConfigs,
  updateCommissionConfig,
  updatePayoutConfig,
  type CommissionConfigRow,
  type PayoutConfigRow,
} from "@/lib/admin-api";
import {
  COMMISSION_CONFIG_META,
  P2P_TRANSFER_CONFIG_META,
  PAYOUT_CONFIG_META,
} from "@/lib/constants";

export type ConfigKV = { key: string; value: string; updated_at: string };

type FieldType = "number" | "percent" | "boolean" | "string" | "json";

function metaType(
  meta: Record<string, { type: FieldType }>,
  key: string,
): FieldType {
  return meta[key]?.type ?? "string";
}

/** Extract the scalar/array value from backend `{"value": ...}` JSONB. */
export function configValueToString(configValue: unknown): string {
  if (configValue == null) return "";
  if (typeof configValue === "object" && configValue !== null && "value" in configValue) {
    const inner = (configValue as { value: unknown }).value;
    if (typeof inner === "boolean") return inner ? "true" : "false";
    if (Array.isArray(inner)) return JSON.stringify(inner);
    if (inner == null) return "";
    return String(inner);
  }
  if (typeof configValue === "boolean") return configValue ? "true" : "false";
  if (Array.isArray(configValue)) return JSON.stringify(configValue);
  return String(configValue);
}

/** Wrap a UI string back into backend `{"value": ...}` shape. */
export function stringToConfigValue(
  key: string,
  raw: string,
  meta: Record<string, { type: FieldType }>,
): { value: unknown } {
  const type = metaType(meta, key);
  if (type === "boolean") return { value: raw === "true" };
  if (type === "json") {
    try {
      return { value: JSON.parse(raw) as unknown };
    } catch {
      return { value: raw };
    }
  }
  if (type === "number" || type === "percent") {
    if (raw.includes(".")) return { value: parseFloat(raw) };
    const n = parseInt(raw, 10);
    return { value: Number.isNaN(n) ? raw : n };
  }
  return { value: raw };
}

function mapRows(
  rows: Array<{ config_key: string; config_value: unknown; updated_at: string }>,
  meta: Record<string, { type: FieldType }>,
): ConfigKV[] {
  const byKey = new Map(rows.map((r) => [r.config_key, r]));
  return Object.keys(meta)
    .map((key) => {
      const row = byKey.get(key);
      if (!row) return null;
      return {
        key,
        value: configValueToString(row.config_value),
        updated_at: row.updated_at,
      };
    })
    .filter((r): r is ConfigKV => r !== null);
}

export async function fetchCommissionConfigRows(): Promise<ConfigKV[]> {
  const rows = await listCommissionConfigs();
  const filtered = rows.filter(
    (r) => !r.config_key.startsWith("p2p_") && r.config_key in COMMISSION_CONFIG_META,
  );
  return mapRows(filtered, COMMISSION_CONFIG_META);
}

export async function fetchP2pConfigRows(): Promise<ConfigKV[]> {
  const rows = await listCommissionConfigs();
  const filtered = rows.filter(
    (r) => r.config_key.startsWith("p2p_") && r.config_key in P2P_TRANSFER_CONFIG_META,
  );
  return mapRows(filtered, P2P_TRANSFER_CONFIG_META);
}

export async function fetchPayoutConfigRows(): Promise<ConfigKV[]> {
  const rows = await listPayoutConfigs();
  const filtered = rows.filter((r) => r.config_key in PAYOUT_CONFIG_META);
  return mapRows(filtered, PAYOUT_CONFIG_META);
}

export async function saveCommissionConfigKey(key: string, value: string): Promise<void> {
  const meta = key.startsWith("p2p_") ? P2P_TRANSFER_CONFIG_META : COMMISSION_CONFIG_META;
  await updateCommissionConfig(key, stringToConfigValue(key, value, meta));
}

export async function savePayoutConfigKey(key: string, value: string): Promise<void> {
  await updatePayoutConfig(key, stringToConfigValue(key, value, PAYOUT_CONFIG_META));
}

export type { CommissionConfigRow, PayoutConfigRow };
