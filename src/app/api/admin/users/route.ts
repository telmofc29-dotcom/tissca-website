import { NextRequest, NextResponse } from 'next/server';
import { getAdminUsers } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getUserBySupabaseId } from '@/lib/db';

/**
 * GET /api/admin/users
 * Get all users for admin dashboard
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

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    const users = await getAdminUsers(limit, offset);

    return NextResponse.json({
      success: true,
      users,
    });
  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
