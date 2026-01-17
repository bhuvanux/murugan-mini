/**
 * Query Executor
 * 
 * Executes analytics queries by calling the appropriate RPC functions
 * with validated parameters.
 */

import { supabase } from '../supabase/client';
import { QueryTemplate } from './queryTemplates';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export interface QueryExecutionParams {
    start_date?: string;
    end_date?: string;
    days_ago?: number;
    [key: string]: any;
}

export interface QueryExecutionResult {
    success: boolean;
    data: any;
    error?: string;
    metadata: {
        queryName: string;
        queryId: string;
        executedAt: string;
        dataSource: string;
        timeRange?: string;
    };
}

/**
 * Parse date parameter shortcuts
 */
function parseDateParam(param: string): Date {
    const now = new Date();

    switch (param) {
        case 'today':
            return startOfDay(now);
        case 'yesterday':
            return startOfDay(subDays(now, 1));
        case 'yesterday_end':
            return endOfDay(subDays(now, 1));
        case 'now':
            return now;
        case '7d_ago':
            return startOfDay(subDays(now, 7));
        case '30d_ago':
            return startOfDay(subDays(now, 30));
        default:
            // Assume it's an ISO date string
            return new Date(param);
    }
}

/**
 * Build RPC parameters from template and user input
 */
function buildRPCParams(template: QueryTemplate, userParams: QueryExecutionParams): any {
    const rpcParams: any = {};

    // Process each parameter defined in the template
    const parameters = template.parameters || [];
    for (const param of parameters) {
        let value = userParams[param.name] ?? param.default;

        // Parse date parameters
        if (param.type === 'date' && typeof value === 'string') {
            value = parseDateParam(value).toISOString();
        }

        rpcParams[`p_${param.name}`] = value;
    }

    return rpcParams;
}

/**
 * Extract specific metric from RPC result
 */
function extractMetric(data: any[], metricKey?: string): any {
    if (!data || data.length === 0) return null;

    if (metricKey) {
        // Extract specific field for KPI queries
        return data[0][metricKey];
    }

    // Return full result for table/chart queries
    return data;
}

/**
 * Execute an analytics query
 */
export async function executeQuery(
    template: QueryTemplate,
    userParams: QueryExecutionParams = {}
): Promise<QueryExecutionResult> {
    try {
        // Build RPC parameters
        const rpcParams = buildRPCParams(template, userParams);

        console.log(`[QueryExecutor] Executing ${template.id}`, {
            rpcFunction: template.rpcFunction,
            params: rpcParams
        });

        // Call the RPC function
        const { data, error } = await supabase.rpc(template.rpcFunction, rpcParams);

        if (error) {
            console.error(`[QueryExecutor] Error executing ${template.id}:`, error);
            return {
                success: false,
                data: null,
                error: error.message,
                metadata: {
                    queryName: template.name,
                    queryId: template.id,
                    executedAt: new Date().toISOString(),
                    dataSource: template.dataSource
                }
            };
        }

        // Extract metric if specified
        const result = extractMetric(data, template.metricKey);

        // Build time range description
        let timeRange = '';
        if (rpcParams.p_start_date && rpcParams.p_end_date) {
            const start = new Date(rpcParams.p_start_date);
            const end = new Date(rpcParams.p_end_date);
            timeRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        } else if (rpcParams.p_days_ago) {
            timeRange = `Last ${rpcParams.p_days_ago} days`;
        }

        return {
            success: true,
            data: result,
            metadata: {
                queryName: template.name,
                queryId: template.id,
                executedAt: new Date().toISOString(),
                dataSource: template.dataSource,
                timeRange
            }
        };

    } catch (err: any) {
        console.error(`[QueryExecutor] Unexpected error:`, err);
        return {
            success: false,
            data: null,
            error: err.message || 'Unknown error',
            metadata: {
                queryName: template.name,
                queryId: template.id,
                executedAt: new Date().toISOString(),
                dataSource: template.dataSource
            }
        };
    }
}

/**
 * Save a query for reuse
 */
export async function saveQuery(
    queryName: string,
    templateId: string,
    parameters: QueryExecutionParams,
    category: string
) {
    const { data, error } = await supabase
        .from('saved_analytics_queries')
        .insert({
            query_name: queryName,
            query_template_id: templateId,
            parameters,
            category
        })
        .select()
        .single();

    if (error) {
        console.error('[QueryExecutor] Error saving query:', error);
        throw error;
    }

    return data;
}

/**
 * Get all saved queries for current admin
 */
export async function getSavedQueries() {
    const { data, error } = await supabase.rpc('get_my_saved_queries');

    if (error) {
        console.error('[QueryExecutor] Error fetching saved queries:', error);
        throw error;
    }

    return data || [];
}

/**
 * Delete a saved query
 */
export async function deleteSavedQuery(queryId: string) {
    const { error } = await supabase
        .from('saved_analytics_queries')
        .delete()
        .eq('id', queryId);

    if (error) {
        console.error('[QueryExecutor] Error deleting query:', error);
        throw error;
    }
}

/**
 * Update query execution timestamp
 */
export async function markQueryExecuted(queryId: string) {
    const { error } = await supabase.rpc('update_query_execution', {
        p_query_id: queryId
    });

    if (error) {
        console.error('[QueryExecutor] Error updating query execution:', error);
    }
}

/**
 * Toggle query pin status
 */
export async function toggleQueryPin(queryId: string) {
    const { data, error } = await supabase.rpc('toggle_query_pin', {
        p_query_id: queryId
    });

    if (error) {
        console.error('[QueryExecutor] Error toggling pin:', error);
        throw error;
    }

    return data;
}
