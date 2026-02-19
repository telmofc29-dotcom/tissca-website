/**
 * Mobile API: Calculations
 * =======================
 * POST /api/mobile/calculate - Execute any calculation
 * This endpoint uses the shared calculations service
 * to ensure consistency across web and mobile
 *
 * Used by: iOS App, Android App, Web
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateAreaBased,
  calculateKitchen,
  calculateBathroom,
  calculateWardrobe,
  type CalculationInput,
  type CalculationResult,
} from '@/services/calculations';

/**
 * POST /api/mobile/calculate
 * Execute calculation based on type
 *
 * Body:
 * {
 *   "type": "area-based" | "kitchen" | "bathroom" | "wardrobe",
 *   "input": { ...CalculationInput }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, input } = body;

    if (!type || !input) {
      return NextResponse.json(
        { error: 'Missing required fields: type, input' },
        { status: 400 }
      );
    }

    let result: CalculationResult | null = null;

    // Route to correct calculator based on type
    switch (type) {
      case 'area-based':
        result = calculateAreaBased(input as CalculationInput);
        break;

      case 'kitchen':
        result = calculateKitchen(input as CalculationInput);
        break;

      case 'bathroom':
        result = calculateBathroom(input as CalculationInput);
        break;

      case 'wardrobe':
        result = calculateWardrobe(input as CalculationInput);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown calculation type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Calculation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Calculation failed' },
      { status: 500 }
    );
  }
}
