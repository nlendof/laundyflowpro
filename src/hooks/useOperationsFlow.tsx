import { useMemo } from 'react';
import { useConfig, OperationStep } from '@/contexts/ConfigContext';
import { OrderStatus } from '@/types';

export interface OperationStatusConfig {
  key: string;
  label: string;
  labelEs: string;
  color: string;
  bgColor: string;
  icon: string;
}

/**
 * Hook to get the configurable operations flow.
 * This replaces the hardcoded ORDER_STATUS_CONFIG and ORDER_STATUS_FLOW constants.
 */
export function useOperationsFlow() {
  const { activeOperations, getOperationByKey, operations, loading } = useConfig();

  // Get the ordered flow of active operation keys
  const statusFlow = useMemo(() => {
    return activeOperations.map(op => op.key);
  }, [activeOperations]);

  // Build a config map similar to ORDER_STATUS_CONFIG but from database
  const statusConfig = useMemo(() => {
    const config: Record<string, OperationStatusConfig> = {};
    operations.forEach(op => {
      config[op.key] = {
        key: op.key,
        label: op.name,
        labelEs: op.name,
        color: getTextColorFromBg(op.color),
        bgColor: getBgColorFromColor(op.color),
        icon: op.icon,
      };
    });
    return config;
  }, [operations]);

  // Get the next status in the flow
  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1] as OrderStatus;
    }
    return null;
  };

  // Get the previous status in the flow
  const getPreviousStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex > 0) {
      return statusFlow[currentIndex - 1] as OrderStatus;
    }
    return null;
  };

  // Check if status can advance
  const canAdvance = (currentStatus: OrderStatus): boolean => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex >= 0 && currentIndex < statusFlow.length - 1;
  };

  // Check if status can regress
  const canRegress = (currentStatus: OrderStatus): boolean => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex > 0;
  };

  // Get status index
  const getStatusIndex = (status: OrderStatus): number => {
    return statusFlow.indexOf(status);
  };

  // Get config for a specific status
  const getStatusConfig = (status: OrderStatus): OperationStatusConfig | undefined => {
    return statusConfig[status];
  };

  return {
    statusFlow,
    statusConfig,
    activeOperations,
    loading,
    getNextStatus,
    getPreviousStatus,
    canAdvance,
    canRegress,
    getStatusIndex,
    getStatusConfig,
    getOperationByKey,
  };
}

// Helper to convert bg-color to text-color equivalent
function getTextColorFromBg(bgColor: string): string {
  // Convert bg-xxx to text-xxx pattern for status styling
  // e.g., bg-amber-500 -> text-amber-600
  const colorMatch = bgColor.match(/bg-(\w+)-(\d+)/);
  if (colorMatch) {
    const [, colorName, shade] = colorMatch;
    const textShade = parseInt(shade) >= 500 ? '600' : '500';
    return `text-${colorName}-${textShade}`;
  }
  return 'text-foreground';
}

// Helper to convert color to bg color with opacity
function getBgColorFromColor(color: string): string {
  // Convert bg-xxx-500 to bg-xxx-100 or similar for background
  const colorMatch = color.match(/bg-(\w+)-(\d+)/);
  if (colorMatch) {
    const [, colorName] = colorMatch;
    return `bg-${colorName}-100 dark:bg-${colorName}-900/30`;
  }
  return 'bg-muted';
}
