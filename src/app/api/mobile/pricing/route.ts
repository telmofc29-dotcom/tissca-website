/**
 * Mobile API: Pricing & Trade Data
 * ================================
 * GET /api/mobile/pricing/trades - List all available trades
 * GET /api/mobile/pricing/modes - List pricing modes (Budget/Standard/Premium)
 * GET /api/mobile/pricing/regions - List UK regions with multipliers
 * GET /api/mobile/pricing/trade/:tradeId - Details for specific trade
 *
 * Used by: iOS App (populate dropdowns), Android App (populate dropdowns)
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getAvailableTrades,
  getRegions,
} from '@/services/calculations';
import { tradeConfigs } from '@/config/pricing';

/**
 * GET /api/mobile/pricing/trades
 * Return all available trades with their details
 */
export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;

    // Route: /api/mobile/pricing/trades
    if (path.includes('/trades')) {
      const trades = getAvailableTrades();
      return NextResponse.json({
        success: true,
        trades: trades.map((trade) => ({
          id: trade.id,
          name: trade.name,
          unit: trade.unit,
        })),
      });
    }

    // Route: /api/mobile/pricing/modes
    if (path.includes('/modes')) {
      return NextResponse.json({
        success: true,
        modes: [
          {
            id: 'budget',
            name: 'Budget',
            multiplier: 0.75,
            description: 'Cost-effective estimates',
          },
          {
            id: 'standard',
            name: 'Standard',
            multiplier: 1.0,
            description: 'Fair market rates',
          },
          {
            id: 'premium',
            name: 'Premium',
            multiplier: 1.5,
            description: 'Premium quality work',
          },
        ],
      });
    }

    // Route: /api/mobile/pricing/regions
    if (path.includes('/regions')) {
      const regions = getRegions();
      return NextResponse.json({
        success: true,
        regions: regions.map((region) => ({
          id: region.id,
          name: region.name,
          multiplier: region.multiplier,
        })),
      });
    }

    // Route: /api/mobile/pricing/trade/:tradeId
    const tradeId = request.nextUrl.searchParams.get('tradeId');
    if (tradeId) {
      const tradeConfig = tradeConfigs[tradeId];

      if (!tradeConfig) {
        return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        trade: {
          id: tradeId,
          name: tradeConfig.name,
          unit: tradeConfig.unit,
          baseProductivity: tradeConfig.baseProductivity,
          dailyRate: tradeConfig.dailyRate,
          difficultyMultipliers: tradeConfig.difficultyMultipliers,
        },
      });
    }

    return NextResponse.json({ error: 'Unknown pricing endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json({ error: 'Failed to fetch pricing data' }, { status: 500 });
  }
}
