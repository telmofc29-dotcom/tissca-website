import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Create or get user in database
 * Called after successful Supabase authentication
 */
export async function upsertUser(
  supabaseId: string,
  email: string,
  name?: string
) {
  return prisma.user.upsert({
    where: { supabaseId },
    update: {
      name,
    },
    create: {
      supabaseId,
      email,
      name,
      subscription: {
        create: {
          tier: 'free',
          status: 'active',
        },
      },
      profile: {
        create: {},
      },
    },
    include: {
      subscription: true,
      profile: true,
    },
  });
}

/**
 * Get user by Supabase ID with subscription
 */
export async function getUserBySupabaseId(supabaseId: string) {
  return prisma.user.findUnique({
    where: { supabaseId },
    include: {
      subscription: true,
      profile: true,
    },
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      subscription: true,
      profile: true,
    },
  });
}

/**
 * Update user profile with comprehensive fields
 */
export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    country?: string;
    currency?: string;
    units?: string;
    tradeType?: string;
    businessName?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    businessLogo?: string;
    dailyRate?: number;
    monthlyRate?: number;
    labourTierDefault?: string;
  }
) {
  return prisma.userProfile.update({
    where: { userId },
    data,
  });
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  return prisma.userProfile.findUnique({
    where: { userId },
  });
}

/**
 * Get subscription details
 */
export async function getSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

/**
 * Update subscription tier
 */
export async function updateSubscriptionTier(
  userId: string,
  tier: 'free' | 'premium'
) {
  return prisma.subscription.update({
    where: { userId },
    data: { tier },
  });
}

/**
 * Link Stripe customer ID to subscription
 */
export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string
) {
  return prisma.subscription.update({
    where: { userId },
    data: { stripeCustomerId },
  });
}

/**
 * Link Stripe subscription ID
 */
export async function linkStripeSubscription(
  userId: string,
  stripeSubscriptionId: string,
  stripePriceId: string,
  status: string = 'active'
) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      stripeSubscriptionId,
      stripePriceId,
      status,
      tier: 'premium',
    },
  });
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(userId: string) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      status: 'cancelled',
      tier: 'free',
      cancelledAt: new Date(),
    },
  });
}

/**
 * Create a quote with document number generation
 */
export async function createQuote(
  userId: string,
  data: {
    title: string;
    description?: string;
    clientId?: string;
    items: any[];
    subtotal: number;
    tax?: number;
    total: number;
    expiresAt?: Date;
    includeWatermark?: boolean;
  }
) {
  // Generate quote number: Q-YYYY-XXXX
  const year = new Date().getFullYear();
  const latestQuote = await prisma.quote.findMany({
    where: { userId },
    orderBy: { quoteNumber: 'desc' },
    take: 1,
  });

  let nextNumber = 1;
  if (latestQuote.length > 0) {
    const lastNum = latestQuote[0].quoteNumber.split('-')[2];
    nextNumber = parseInt(lastNum, 10) + 1;
  }

  const quoteNumber = `Q-${year}-${String(nextNumber).padStart(4, '0')}`;

  // Check if free tier limit is exceeded
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const isFree = sub?.tier === 'free';

  if (isFree && sub && sub.quotesCreatedThisMonth >= 5) {
    throw new Error('FREE_TIER_LIMIT: Maximum 5 quotes per month on free tier');
  }

  return prisma.quote.create({
    data: {
      ...data,
      quoteNumber,
      userId,
      includeWatermark: isFree ? true : false,
    },
  });
}

/**
 * Create an invoice with document number generation
 */
export async function createInvoice(
  userId: string,
  data: {
    title?: string;
    description?: string;
    clientId?: string;
    items: any[];
    subtotal: number;
    tax?: number;
    total: number;
    dueDate?: Date;
    includeWatermark?: boolean;
  }
) {
  // Generate invoice number: I-YYYY-XXXX
  const year = new Date().getFullYear();
  const latestInvoice = await prisma.invoice.findMany({
    where: { userId },
    orderBy: { invoiceNumber: 'desc' },
    take: 1,
  });

  let nextNumber = 1;
  if (latestInvoice.length > 0) {
    const lastNum = latestInvoice[0].invoiceNumber.split('-')[2];
    nextNumber = parseInt(lastNum, 10) + 1;
  }

  const invoiceNumber = `I-${year}-${String(nextNumber).padStart(4, '0')}`;

  // Check if free tier limit is exceeded
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const isFree = sub?.tier === 'free';

  if (isFree && sub && sub.invoicesCreatedThisMonth >= 5) {
    throw new Error('FREE_TIER_LIMIT: Maximum 5 invoices per month on free tier');
  }

  return prisma.invoice.create({
    data: {
      ...data,
      invoiceNumber,
      userId,
      includeWatermark: isFree ? true : false,
    },
  });
}

/**
 * Get user quotes
 */
export async function getUserQuotes(userId: string) {
  return prisma.quote.findMany({
    where: { userId },
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get user invoices
 */
export async function getUserInvoices(userId: string) {
  return prisma.invoice.findMany({
    where: { userId },
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create or get client
 */
export async function upsertClient(
  userId: string,
  data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }
) {
  const email = data.email;

  return prisma.client.upsert({
    where: {
      userId_email: {
        userId,
        email: email || '',
      },
    },
    update: data,
    create: {
      ...data,
      userId,
    },
  });
}

/**
 * Get user clients
 */
export async function getUserClients(userId: string) {
  return prisma.client.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get single quote
 */
export async function getQuote(quoteId: string, userId: string) {
  return prisma.quote.findFirst({
    where: { id: quoteId, userId },
    include: { client: true },
  });
}

/**
 * Update quote
 */
export async function updateQuote(
  quoteId: string,
  _userId: string,
  data: {
    title?: string;
    description?: string;
    items?: any[];
    subtotal?: number;
    tax?: number;
    total?: number;
    expiresAt?: Date;
  }
) {
  return prisma.quote.update({
    where: { id: quoteId },
    data,
  });
}

/**
 * Delete quote
 */
export async function deleteQuote(quoteId: string, _userId: string) {
  return prisma.quote.delete({
    where: { id: quoteId },
  });
}

/**
 * Get single invoice
 */
export async function getInvoice(invoiceId: string, userId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { client: true },
  });
}

/**
 * Update invoice
 */
export async function updateInvoice(
  invoiceId: string,
  _userId: string,
  data: {
    title?: string;
    description?: string;
    items?: any[];
    subtotal?: number;
    tax?: number;
    total?: number;
    status?: string;
    dueDate?: Date;
    paidDate?: Date;
  }
) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data,
  });
}

/**
 * Delete invoice
 */
export async function deleteInvoice(invoiceId: string, _userId: string) {
  return prisma.invoice.delete({
    where: { id: invoiceId },
  });
}

/**
 * ADMIN: Get all users with subscription and profile info
 */
export async function getAdminUsers(limit: number = 100, offset: number = 0) {
  return prisma.user.findMany({
    take: limit,
    skip: offset,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      profile: true,
      subscription: {
        select: {
          tier: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * ADMIN: Get user count
 */
export async function getAdminUserCount() {
  return prisma.user.count();
}

/**
 * ADMIN: Get premium users count
 */
export async function getAdminPremiumCount() {
  return prisma.subscription.count({
    where: { tier: 'premium', status: 'active' },
  });
}

/**
 * ADMIN: Get documents overview
 */
export async function getAdminDocumentsOverview() {
  const [totalQuotes, totalInvoices, quotesThisMonth, invoicesThisMonth] = await Promise.all([
    prisma.quote.count(),
    prisma.invoice.count(),
    prisma.quote.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  return {
    totalQuotes,
    totalInvoices,
    quotesThisMonth,
    invoicesThisMonth,
  };
}

/**
 * ADMIN: Get revenue data for accountant panel
 */
export async function getAdminRevenueData() {
  // Get all active premium subscriptions
  const activeSubscriptions = await prisma.subscription.findMany({
    where: {
      tier: 'premium',
      status: 'active',
    },
  });

  // Monthly subscription revenue (estimate based on active subs)
  // This is simplified - real implementation would track actual payments
  const premiumMonthlyCount = activeSubscriptions.filter(
    (s) => !s.stripePriceId?.includes('annual')
  ).length;
  const premiumAnnualCount = activeSubscriptions.filter(
    (s) => s.stripePriceId?.includes('annual')
  ).length;

  const estimatedMRR = premiumMonthlyCount * 3 + (premiumAnnualCount * 20) / 12;

  return {
    activePremiumSubscriptions: activeSubscriptions.length,
    estimatedMRR,
    premiumMonthlyCount,
    premiumAnnualCount,
  };
}
