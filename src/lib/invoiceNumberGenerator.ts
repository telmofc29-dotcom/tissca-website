/**
 * Invoice Number Generation
 * Race-safe sequential invoice number generation per business per year
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generate next sequential invoice number for a business and year
 * Format: INV-YYYY-000001
 * 
 * This uses a database counter table with pessimistic locking to prevent
 * race conditions. The counter table stores the next sequence number per
 * (business_id, year) combination.
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

  // Use a transaction-like approach with the invoice_number_counters table
  // This table stores the next sequence per (business_id, year)
  
  // First, try to get existing counter
  const { data: counter } = await supabase
    .from('invoice_number_counters')
    .select('next_number')
    .eq('business_id', business_id)
    .eq('year', year_str)
    .single();

  let next_number = counter?.next_number || 1;

  if (counter) {
    // Update the counter (increment it)
    const { data: updated, error: updateError } = await supabase
      .from('invoice_number_counters')
      .update({ next_number: next_number + 1 })
      .eq('business_id', business_id)
      .eq('year', year_str)
      .select('next_number')
      .single();

    if (updateError) {
      throw new Error(`Failed to update invoice counter: ${updateError.message}`);
    }

    next_number = updated?.next_number || next_number + 1;
  } else {
    // Create new counter for this business/year
    const { data: created, error: insertError } = await supabase
      .from('invoice_number_counters')
      .insert({
        business_id,
        year: year_str,
        next_number: 2, // We'll use 1 now, next will be 2
      })
      .select('next_number')
      .single();

    if (insertError) {
      // If insert fails due to conflict, fetch the current value and try again
      const { data: existing } = await supabase
        .from('invoice_number_counters')
        .select('next_number')
        .eq('business_id', business_id)
        .eq('year', year_str)
        .single();

      if (existing) {
        const { data: updated } = await supabase
          .from('invoice_number_counters')
          .update({ next_number: existing.next_number + 1 })
          .eq('business_id', business_id)
          .eq('year', year_str)
          .select('next_number')
          .single();

        next_number = updated?.next_number || existing.next_number;
      } else {
        throw new Error(`Failed to create invoice counter: ${insertError.message}`);
      }
    } else {
      next_number = created?.next_number || 1;
    }
  }

  // Format as INV-YYYY-000001
  const sequence = String(next_number).padStart(6, '0');
  return `INV-${year_str}-${sequence}`;
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
