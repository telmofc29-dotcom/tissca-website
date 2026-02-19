/**
 * Quote Management Hook
 * Handles quote CRUD operations and fetching
 */

'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Quote, QuoteItem, QuoteWithDetails } from '@/types/quotes';
import { CreateQuoteSchema, CreateQuoteItemSchema } from '@/lib/validators/quoteSchemas';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export function useQuote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(
    async (quoteId: string): Promise<QuoteWithDetails | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('quotes')
          .select(
            `
            *,
            clients(*),
            quote_items(
              *,
              materials(id, name, unit, default_price),
              material_variants(id, label, price_override),
              labour_rates_new(id, trade, price, unit)
            ),
            quote_totals_snapshot(*)
          `
          )
          .eq('id', quoteId)
          .single();

        if (fetchError) throw fetchError;
        return data as QuoteWithDetails;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch quote';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchQuotes = useCallback(
    async (businessId: string, filters?: { status?: string }): Promise<Quote[]> => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('quotes')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        return (data as Quote[]) || [];
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch quotes';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createQuote = useCallback(
    async (businessId: string, quoteData: any): Promise<Quote | null> => {
      try {
        setLoading(true);
        setError(null);

        const validated = CreateQuoteSchema.parse(quoteData);

        const { data, error: createError } = await supabase
          .from('quotes')
          .insert({
            business_id: businessId,
            ...validated,
          })
          .select()
          .single();

        if (createError) throw createError;
        return data as Quote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create quote';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateQuote = useCallback(
    async (quoteId: string, updates: any): Promise<Quote | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: updateError } = await supabase
          .from('quotes')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', quoteId)
          .select()
          .single();

        if (updateError) throw updateError;
        return data as Quote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update quote';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addQuoteItem = useCallback(
    async (quoteId: string, itemData: any): Promise<QuoteItem | null> => {
      try {
        setLoading(true);
        setError(null);

        const validated = CreateQuoteItemSchema.parse(itemData);

        const { data, error: insertError } = await supabase
          .from('quote_items')
          .insert({
            quote_id: quoteId,
            ...validated,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return data as QuoteItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add item';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateQuoteItem = useCallback(
    async (itemId: string, updates: any): Promise<QuoteItem | null> => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: updateError } = await supabase
          .from('quote_items')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
          .select()
          .single();

        if (updateError) throw updateError;
        return data as QuoteItem;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update item';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteQuoteItem = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('quote_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete item';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchQuote,
    fetchQuotes,
    createQuote,
    updateQuote,
    addQuoteItem,
    updateQuoteItem,
    deleteQuoteItem,
  };
}
