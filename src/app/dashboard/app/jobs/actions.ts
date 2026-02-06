'use server';

import { prisma } from '@/lib/db';
import { Job } from '@prisma/client';

export async function getJobs(
  userId: string,
  options?: {
    status?: string;
    sortBy?: 'paymentDueDate' | 'scheduledDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }
) {
  try {
    let where: any = { userId };

    if (options?.status && options.status !== 'All') {
      where.status = options.status;
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: options?.sortBy
        ? { [options.sortBy]: options.sortOrder || 'asc' }
        : { createdAt: 'desc' },
      include: { lead: true, user: true },
    });

    return jobs;
  } catch (error) {
    console.error('[Jobs] Error fetching jobs:', error);
    throw error;
  }
}

export async function createJob(
  userId: string,
  data: {
    status?: string;
    scheduledDate?: Date;
    dueDate?: Date;
    paymentDueDate?: Date;
    value?: number;
    notes?: string;
    linkedLeadId?: string;
  }
) {
  try {
    const job = await prisma.job.create({
      data: {
        userId,
        status: data.status || 'Scheduled',
        scheduledDate: data.scheduledDate,
        dueDate: data.dueDate,
        paymentDueDate: data.paymentDueDate,
        value: data.value || 0,
        notes: data.notes,
        linkedLeadId: data.linkedLeadId,
      },
      include: { lead: true, user: true },
    });

    return job;
  } catch (error) {
    console.error('[Jobs] Error creating job:', error);
    throw error;
  }
}

export async function updateJob(
  userId: string,
  jobId: string,
  data: Partial<Omit<Job, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
  try {
    // Verify ownership
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data,
      include: { lead: true, user: true },
    });

    return updated;
  } catch (error) {
    console.error('[Jobs] Error updating job:', error);
    throw error;
  }
}

export async function deleteJob(userId: string, jobId: string) {
  try {
    // Verify ownership
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new Error('Job not found or unauthorized');
    }

    await prisma.job.delete({
      where: { id: jobId },
    });

    return { success: true };
  } catch (error) {
    console.error('[Jobs] Error deleting job:', error);
    throw error;
  }
}

export async function convertLeadToJob(
  userId: string,
  leadId: string
) {
  try {
    // Get the lead
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, userId },
    });

    if (!lead) {
      throw new Error('Lead not found or unauthorized');
    }

    // Create job from lead
    const job = await prisma.job.create({
      data: {
        userId,
        linkedLeadId: leadId,
        status: 'Scheduled',
        value: lead.valueEstimate || 0,
        notes: lead.notes,
      },
      include: { lead: true, user: true },
    });

    // Update lead status to "Won"
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: 'Won' },
    });

    return job;
  } catch (error) {
    console.error('[Jobs] Error converting lead to job:', error);
    throw error;
  }
}
