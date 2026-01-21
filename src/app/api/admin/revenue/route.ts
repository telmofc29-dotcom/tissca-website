import { NextRequest, NextResponse } from 'next/server';
import { getAdminRevenueData } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserBySupabaseId } from '@/lib/db';

/**
 * GET /api/admin/revenue
 * Get revenue data for accountant panel
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      token.split('.')[0]
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // TODO: Add admin role check
    if (!process.env.ADMIN_EMAILS?.split(',').includes(dbUser.email)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const revenueData = await getAdminRevenueData();

    // Calculate monthly breakdown
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      // For now, estimate based on current MRR distributed
      const monthName = date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      const estimatedRevenue = revenueData.estimatedMRR;

      months.push({
  month: monthName,

  // keep for real month-based reporting later (and fixes build)
  monthStart: monthStart.toISOString(),
  monthEnd: monthEnd.toISOString(),

  subscriptionRevenue: estimatedRevenue,
  adRevenue: 0, // Placeholder
  totalRevenue: estimatedRevenue,
});

    }

    const annualTotal = revenueData.estimatedMRR * 12;

    return NextResponse.json({
      success: true,
      revenue: {
        ...revenueData,
        monthlyBreakdown: months,
        annualProjected: annualTotal,
      },
    });
  } catch (error: any) {
    console.error('Error fetching revenue data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
