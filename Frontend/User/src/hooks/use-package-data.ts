'use client';

import * as React from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  mockDelay,
  mockMeProfile,
  mockPackages,
} from '@/lib/mock-api-data';

export interface NetworkPackage {
  package_id: string;
  name: string;
  amount: number;
  daily_binary_cap: number;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageProfileSlice {
  current_package_id: string | null;
  package_name: string | null;
  package_amount: number | null;
  status?: string;
  today_binary_earned?: number;
  daily_binary_cap?: number;
  monthly_income_paise?: number;
  monthly_shopping_paise?: number;
  income_period_ym?: number;
}

export const MONTHLY_INCOME_THRESHOLD_PAISE = 2_500_000;
export const MONTHLY_SHOPPING_THRESHOLD_PAISE = 250_000;

function sortPackages(list: NetworkPackage[]): NetworkPackage[] {
  return [...list].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.amount - b.amount;
  });
}

export function recommendedPackageId(
  sorted: NetworkPackage[],
  currentAmountPaise: number | null,
  currentPackageId: string | null,
): string | null {
  if (sorted.length === 0) return null;
  const curAmt = currentAmountPaise ?? 0;
  if (!currentPackageId && curAmt === 0) {
    return sorted[0]?.package_id ?? null;
  }
  const next = sorted.find((p) => p.amount > curAmt);
  return next?.package_id ?? null;
}

export function packageFeatures(pkg: NetworkPackage): string[] {
  const lines: string[] = [];
  if (pkg.daily_binary_cap > 0) {
    lines.push(
      `Daily binary cap ${formatCurrency(pkg.daily_binary_cap / 100, 0)} / day`,
    );
  } else {
    lines.push('Daily binary cap: not set on this tier (see admin config)');
  }
  lines.push('No lifetime income cap — earn as long as daily cap allows');
  lines.push(
    `Monthly shopping gate: spend ${formatCurrency(
      MONTHLY_SHOPPING_THRESHOLD_PAISE / 100,
      0,
    )}+ once monthly income crosses ${formatCurrency(
      MONTHLY_INCOME_THRESHOLD_PAISE / 100,
      0,
    )}`,
  );
  return lines;
}

export interface UsePackageDataResult {
  packages: NetworkPackage[];
  profile: PackageProfileSlice | null;
  recommendedId: string | null;
  loading: boolean;
  error: string | null;
  actionMessage: string | null;
  renewingId: string | null;
  refresh: () => Promise<void>;
  renewTo: (packageId: string) => Promise<void>;
}

export function usePackageData(): UsePackageDataResult {
  const [packages, setPackages] = React.useState<NetworkPackage[]>([]);
  const [profile, setProfile] = React.useState<PackageProfileSlice | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(
    null,
  );
  const [renewingId, setRenewingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await mockDelay();
      setPackages(sortPackages(mockPackages));
      setProfile({
        current_package_id: mockMeProfile.current_package_id,
        package_name: mockMeProfile.package_name,
        package_amount: mockMeProfile.package_amount,
        status: mockMeProfile.status,
        today_binary_earned: mockMeProfile.today_binary_earned,
        daily_binary_cap: mockMeProfile.daily_binary_cap,
        monthly_income_paise: mockMeProfile.monthly_income_paise,
        monthly_shopping_paise: mockMeProfile.monthly_shopping_paise,
        income_period_ym: mockMeProfile.income_period_ym,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load packages');
      setPackages([]);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const recommendedId = React.useMemo(
    () =>
      recommendedPackageId(
        packages,
        profile?.package_amount ?? null,
        profile?.current_package_id ?? null,
      ),
    [packages, profile?.package_amount, profile?.current_package_id],
  );

  const renewTo = React.useCallback(
    async (packageId: string) => {
      setActionMessage(null);
      setRenewingId(packageId);
      try {
        await mockDelay(500);
        const pkg = packages.find((p) => p.package_id === packageId);
        if (pkg) {
          setProfile((prev) => ({
            ...prev,
            current_package_id: packageId,
            package_name: pkg.name,
            package_amount: pkg.amount,
          }));
        }
        setActionMessage('Package updated successfully (demo).');
      } catch (e) {
        setActionMessage(
          e instanceof Error ? e.message : 'Could not renew package',
        );
      } finally {
        setRenewingId(null);
      }
    },
    [packages],
  );

  return {
    packages,
    profile,
    recommendedId,
    loading,
    error,
    actionMessage,
    renewingId,
    refresh: load,
    renewTo,
  };
}
