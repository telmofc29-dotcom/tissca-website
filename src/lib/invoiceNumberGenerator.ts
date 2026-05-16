/**
 * Invoice Number Generation
 * Atomic sequential invoice number generation per business per year.
 *
 * Uses the Postgres function `next_invoice_number(business_id, year)` which
 * performs an INSERT ... ON CONFLICT ... UPDATE in a single atomic statement.
 * This eliminates the read-then-update race condition entirely — two
 * concurrent requests will never receive the same invoice number.
 *
 * Format: INV-YYYY-000001
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate next sequential invoice number for a business and year.
 *
 * Delegates to the `next_invoice_number` Postgres function which atomically
 * claims the next counter value using INSERT ... ON CONFLICT ... UPDATE
 * with a row-level lock.
 *
 * @param supabase - Supabase client
 * @param business_id - Business ID
 * @param year - Year (YYYY) - defaults to current year
 * @returns Next invoice number (e.g., INV-2026-000001)
 * @throws Error if generation fails
 */
export async function generateInvoiceNumber(
  supabase: SupabaseClient,
  business_id: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const year_str = year.toString();

  // Call the atomic Postgres function — single statement, no race condition
  const { data, error } = await supabase.rpc('next_invoice_number', {
    p_business_id: business_id,
    p_year: year_str,
  });

  if (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`);
  }

  if (!data || typeof data !== 'string') {
    throw new Error('Invoice number generation returned empty result');
  }

  return data;
}

/**
 * Get the next invoice number WITHOUT incrementing
 * Useful for previewing what the next number will be
 * 
 * @param supabase - Supabase client
 * @param business_id - Business ID
 * @param year - Year (YYYY) - defaults to current year
 * @returns Next invoice number that would be generated
 */
export async function peekNextInvoiceNumber(
  supabase: SupabaseClient,
  business_id: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const year_str = year.toString();

  const { data: counter } = await supabase
    .from('invoice_number_counters')
    .select('next_number')
    .eq('business_id', business_id)
    .eq('year', year_str)
    .single();

  const next_number = counter?.next_number || 1;
  const sequence = String(next_number).padStart(6, '0');
  return `INV-${year_str}-${sequence}`;
}
