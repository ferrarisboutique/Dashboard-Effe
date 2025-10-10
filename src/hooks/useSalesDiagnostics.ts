import { useState, useCallback } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-49468be0`;

interface DiagnosticsData {
  timestamp: string;
  summary: {
    totalRecords: number;
    validRecords: number;
    problematicRecords: number;
    problematicPercentage: string;
  };
  channelDistribution: Record<string, number>;
  issues: {
    nullChannels: number;
    undefinedChannels: number;
    invalidChannels: number;
  };
  samples: {
    nullChannelSample: any[];
    undefinedChannelSample: any[];
    invalidChannelSample: any[];
  };
  allProblematicRecords: any[];
}

export function useSalesDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE_URL}/sales/diagnostics`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Diagnostics failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDiagnostics(result.diagnostics);
        return result.diagnostics;
      } else {
        throw new Error(result.error || 'Diagnostics failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error running diagnostics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fixChannels = useCallback(async (recordIds: string[], newChannel: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/sales/fix-channels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recordIds,
          newChannel
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fix failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Re-run diagnostics after fixing
        await runDiagnostics();
        return { success: true, updatedCount: result.updatedCount };
      } else {
        throw new Error(result.error || 'Fix failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fixing channels:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [runDiagnostics]);

  const getProblematicRecordIds = useCallback(() => {
    if (!diagnostics) return [];
    return diagnostics.allProblematicRecords
      .map((r: any) => r.id)
      .filter((id: string) => id);
  }, [diagnostics]);

  const hasProblems = diagnostics ? diagnostics.summary.problematicRecords > 0 : false;

  return {
    diagnostics,
    loading,
    error,
    hasProblems,
    runDiagnostics,
    fixChannels,
    getProblematicRecordIds,
  };
}
