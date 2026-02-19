/**
 * Materials Fetching Hook
 * Loads materials, variants, and labour rates for selection
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Material, MaterialVariant, LabourRate } from '@/types/quotes';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export function useMaterials(businessId: string) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [variants, setVariants] = useState<MaterialVariant[]>([]);
  const [labourRates, setLabourRates] = useState<LabourRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch materials
        const { data: materialsData, error: materialsError } = await supabase
          .from('materials')
          .select('*')
          .eq('business_id', businessId)
          .order('name');

        if (materialsError) throw materialsError;

        // Fetch variants
        const { data: variantsData, error: variantsError } = await supabase
          .from('material_variants')
          .select('*')
          .eq('business_id', businessId);

        if (variantsError) throw variantsError;

        // Fetch labour rates
        const { data: labourData, error: labourError } = await supabase
          .from('labour_rates_new')
          .select('*')
          .eq('business_id', businessId)
          .order('trade');

        if (labourError) throw labourError;

        setMaterials((materialsData as Material[]) || []);
        setVariants((variantsData as MaterialVariant[]) || []);
        setLabourRates((labourData as LabourRate[]) || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  const searchMaterials = useCallback(
    (query: string) => {
      const lower = query.toLowerCase();
      return materials.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.category?.toLowerCase().includes(lower)
      );
    },
    [materials]
  );

  const getMaterialVariants = useCallback(
    (materialId: string) => {
      return variants.filter((v) => v.material_id === materialId);
    },
    [variants]
  );

  const searchLabourRates = useCallback(
    (query: string) => {
      const lower = query.toLowerCase();
      return labourRates.filter((l) => l.trade.toLowerCase().includes(lower));
    },
    [labourRates]
  );

  return {
    materials,
    variants,
    labourRates,
    loading,
    error,
    searchMaterials,
    getMaterialVariants,
    searchLabourRates,
  };
}
