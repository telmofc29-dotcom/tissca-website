'use server';

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function getLeads(
  userId: string,
  options?: {
    status?: string;
    search?: string;
    sortBy?: 'followUpDate' | 'valueEstimate' | 'createdAt' | 'status';
    sortOrder?: 'asc' | 'desc';
  }
) {
  try {
    let where: any = { userId };

    if (options?.status && options.status !== 'All') {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { notes: { contains: options.search, mode: 'insensitive' } },
        { source: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: options?.sortBy
        ? { [options.sortBy]: options.sortOrder || 'desc' }
        : { createdAt: 'desc' },
      include: { jobs: true },
    });

    return leads;
  } catch (error) {
    console.error('[Leads] Error fetching leads:', error);
    throw error;
  }
}

export async function createLead(
  userId: string,
  data: {
    status?: string;
    followUpDate?: Date;
    valueEstimate?: number;
    tags?: any;
    notes?: string;
    source?: string;
  }
) {
  try {
    const lead = await prisma.lead.create({
      data: {
        userId,
        status: data.status || 'New',
        followUpDate: data.followUpDate,
        valueEstimate: data.valueEstimate || 0,
        tags: data.tags,
        notes: data.notes,
        source: data.source,
      },
      include: { jobs: true },
    });

    return lead;
  } catch (error) {
    console.error('[Leads] Error creating lead:', error);
    throw error;
  }
}

export async function updateLead(
  userId: string,
  leadId: string,
  data: Prisma.LeadUpdateInput
) {
  try {
    // Verify ownership
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });

    if (!lead) {
      throw new Error('Lead not found or unauthorized');
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data,
      include: { jobs: true },
    });

    return updated;
  } catch (error) {
    console.error('[Leads] Error updating lead:', error);
    throw error;
  }
}

export async function deleteLead(userId: string, leadId: string) {
  try {
    // Verify ownership
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });

    if (!lead) {
      throw new Error('Lead not found or unauthorized');
    }

    await prisma.lead.delete({
      where: { id: leadId },
    });

    return { success: true };
  } catch (error) {
    console.error('[Leads] Error deleting lead:', error);
    throw error;
  }
}
