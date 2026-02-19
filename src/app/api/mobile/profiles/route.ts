/**
 * Mobile API: Business Profile Management
 * =====================================
 * GET /api/mobile/profiles - Fetch current business profile
 * POST /api/mobile/profiles - Create new business profile
 * PUT /api/mobile/profiles - Update business profile
 *
 * Used by: iOS App, Android App, Web
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createBusinessProfile,
  validateBusinessProfile,
  updateBusinessProfile,
  serializeProfile,
} from '@/services/profiles';
import type { BusinessProfile } from '@/services/profiles';

// In-memory store (replace with database in production)
// In reality, this would be user-scoped via authentication
const profileStore = new Map<string, BusinessProfile>();

/**
 * GET /api/mobile/profiles
 * Fetch the current business profile
 * In production, would fetch from authenticated user's profile
 */
export async function GET(request: NextRequest) {
  try {
    // In production, get userId from authentication token
    const userId = request.nextUrl.searchParams.get('userId') || 'default-user';

    let profile = profileStore.get(userId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: serializeProfile(profile),
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * POST /api/mobile/profiles
 * Create a new business profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.nextUrl.searchParams.get('userId') || 'default-user';

    // Check if profile already exists
    if (profileStore.has(userId)) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PUT to update.' },
        { status: 409 }
      );
    }

    // Create profile
    const profile = createBusinessProfile(body);

    // Validate
    const validation = validateBusinessProfile(profile);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Store
    profileStore.set(userId, profile);

    return NextResponse.json({
      success: true,
      profile: serializeProfile(profile),
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}

/**
 * PUT /api/mobile/profiles
 * Update business profile
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'default-user';
    const body = await request.json();

    let profile = profileStore.get(userId);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update profile
    const updated = updateBusinessProfile(profile, body);

    // Validate
    const validation = validateBusinessProfile(updated);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Store
    profileStore.set(userId, updated);

    return NextResponse.json({
      success: true,
      profile: serializeProfile(updated),
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
