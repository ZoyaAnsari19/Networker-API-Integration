'use client';

import * as React from 'react';
import { ApiError } from '@/lib/api-client';
import { fetchTreeView } from '@/lib/dashboard-api';
import { devError, devLog } from '@/lib/dev-log';
import {
  buildPageStatsFromTeam,
  collectPackageRankCounts,
  mapTreeViewToNetworkNode,
  topPerformersFromLeg,
} from '@/lib/network-tree-mapper';
import type {
  NetworkTreeNodeData,
  NetworkTreePageStats,
  NetworkTreeTopPerformer,
  PackageRankCount,
} from '@/lib/network-tree-types';
import { fetchMyProfile } from '@/lib/profile-api';
import { fetchTeamPageData } from '@/lib/team-api';
import type { TreeView } from '@/lib/dashboard-types';

const TREE_DEPTH = 15;

export interface NetworkTreeData {
  rootNode: NetworkTreeNodeData | null;
  rawTree: TreeView | null;
  stats: NetworkTreePageStats | null;
  packageRanks: PackageRankCount[];
  leftTop: NetworkTreeTopPerformer[];
  rightTop: NetworkTreeTopPerformer[];
  profilePackage: string | null;
  profileName: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useNetworkTreeData(): NetworkTreeData {
  const [rootNode, setRootNode] = React.useState<NetworkTreeNodeData | null>(
    null,
  );
  const [rawTree, setRawTree] = React.useState<TreeView | null>(null);
  const [stats, setStats] = React.useState<NetworkTreePageStats | null>(null);
  const [packageRanks, setPackageRanks] = React.useState<PackageRankCount[]>(
    [],
  );
  const [leftTop, setLeftTop] = React.useState<NetworkTreeTopPerformer[]>([]);
  const [rightTop, setRightTop] = React.useState<NetworkTreeTopPerformer[]>(
    [],
  );
  const [profilePackage, setProfilePackage] = React.useState<string | null>(
    null,
  );
  const [profileName, setProfileName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      devLog('NetworkTree', 'Loading from API…');
      const [tree, teamBundle, profile] = await Promise.all([
        fetchTreeView(TREE_DEPTH),
        fetchTeamPageData(),
        fetchMyProfile(),
      ]);

      const pageStats = buildPageStatsFromTeam(teamBundle.stats, tree);
      const mapped = tree
        ? mapTreeViewToNetworkNode(tree)
        : null;

      setRawTree(tree);
      setRootNode(mapped);
      setStats(pageStats);
      setPackageRanks(collectPackageRankCounts(tree));
      setLeftTop(topPerformersFromLeg(teamBundle.left));
      setRightTop(topPerformersFromLeg(teamBundle.right));
      setProfilePackage(profile.package_name);
      setProfileName(profile.full_name);

      devLog('NetworkTree', 'Loaded (API)', {
        tree_depth: TREE_DEPTH,
        total_members: pageStats.totalMembers,
        nodes_in_tree: mapped ? 'yes' : 'empty',
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Failed to load network tree';
      devError('NetworkTree', message, e);
      setError(message);
      setRootNode(null);
      setRawTree(null);
      setStats(null);
      setPackageRanks([]);
      setLeftTop([]);
      setRightTop([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return {
    rootNode,
    rawTree,
    stats,
    packageRanks,
    leftTop,
    rightTop,
    profilePackage,
    profileName,
    loading,
    error,
    refresh: load,
  };
}
