// src/app/api/workspace/projects/route.ts
//
// GET  /api/workspace/projects          — list all projects for workspace
// GET  /api/workspace/projects?id=xxx   — get single project with rooms

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getProjects,
  getProjectWithRooms,
} from '@/lib/workspace-data';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ projects: [] });
    }

    // Single project with rooms
    const projectId = req.nextUrl.searchParams.get('id');
    if (projectId) {
      const result = await getProjectWithRooms(resolved, projectId);
      if (!result.project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    // All projects
    const projects = await getProjects(resolved);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[GET /api/workspace/projects] Failed:', err);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}
