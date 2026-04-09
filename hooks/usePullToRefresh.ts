/**
 * 下拉刷新 Hook
 * 从 PatientDashboard 中提取的通用下拉刷新逻辑
 */

import { useState, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

interface PullToRefreshResult {
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  threshold: number;
}

/**
 * 下拉刷新 Hook
 *
 * @example
 * const { refreshing, handleRefresh } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await fetchData();
 *   }
 * });
 */
export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
}: PullToRefreshOptions): PullToRefreshResult => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return {
    refreshing,
    handleRefresh,
    threshold,
  };
};

export default usePullToRefresh;
