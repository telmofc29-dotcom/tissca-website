// src/app/api/workspace/tasks/route.ts v3.0
//
// GET    /api/workspace/tasks — list tasks (workspace_id scoped)
// POST   /api/workspace/tasks — create a new task
// PATCH  /api/workspace/tasks — update an existing task (requires id in body)
// DELETE /api/workspace/tasks — delete a task (requires id in body)
//
// Live schema: public.tasks with workspace_id, client_record_id, notes,
// due_date_millis, created_at_millis, updated_at_millis, created_by, checklist_items.
// Status contract aligned to Android: OPEN, COMPLETED, CANCELLED.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '@/lib/workspace-data';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/workspace-data';

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
      return NextResponse.json({ tasks: [] });
    }

    const tasks = await getTasks(resolved);
    return NextResponse.json({ tasks });
  } catch (err) {
    console.error('[GET /api/workspace/tasks] Failed:', err);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!resolved.workspaceId && !resolved.businessId) {
      return NextResponse.json(
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const input: CreateTaskInput = {
      title: body.title,
      notes: body.notes ?? null,
      status: body.status || 'OPEN',
      due_date_millis: body.due_date_millis != null ? Number(body.due_date_millis) : null,
      checklist_items: body.checklist_items ?? null,
    };

    if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const result = await createTask(resolved, input);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/tasks] Failed:', err);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!resolved.workspaceId && !resolved.businessId) {
      return NextResponse.json(
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const input: UpdateTaskInput = {};
    if (fields.title !== undefined) input.title = fields.title;
    if (fields.notes !== undefined) input.notes = fields.notes;
    if (fields.status !== undefined) input.status = fields.status;
    if (fields.due_date_millis !== undefined) input.due_date_millis = fields.due_date_millis != null ? Number(fields.due_date_millis) : null;
    if (fields.checklist_items !== undefined) input.checklist_items = fields.checklist_items;

    const result = await updateTask(resolved, id, input);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ task: result.data });
  } catch (err) {
    console.error('[PATCH /api/workspace/tasks] Failed:', err);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!resolved.workspaceId && !resolved.businessId) {
      return NextResponse.json(
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Task id is required' }, { status: 400 });
    }

    const result = await deleteTask(resolved, id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/workspace/tasks] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
