// src/app/api/admin/notifications/_auth.ts
//
// Shared auth helper for all /api/admin/notifications/* routes.
// Returns { supabase, userId, staffRole } on success, or { error, status } on failure.

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export type StaffAuthSuccess = {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  userId: string;
  staffRole: string;
};

export type StaffAuthFailure = {
  error: string;
  status: 401 | 403 | 500;
};

export async function requireStaff(
  req: NextRequest,
): Promise<StaffAuthSuccess | StaffAuthFailure> {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return { error: 'Unauthorized', status: 401 };

  const supabase = createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { error: 'Unauthorized', status: 401 };

  const { data: staffRecord, error: staffError } = await supabase
    .from('tissca_staff')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffError) return { error: 'Staff evaluation failed', status: 500 };
  if (!staffRecord?.is_active) return { error: 'Forbidden', status: 403 };

  return { supabase, userId: user.id, staffRole: String(staffRecord.role ?? '') };
}
