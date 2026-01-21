import { NextRequest, NextResponse } from 'next/server';
import { linkStripeSubscription, cancelSubscription, updateSubscriptionTier } from '@/lib/db';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    // TODO: Verify webhook signature with Stripe secret key
    // For now, accepting all events - MUST be fixed in production

    switch (type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(data.object);
        break;

      default:
        console.log(`Unhandled webhook event type: ${type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: any) {
  const { customer: _customerId, subscription: subscriptionId, metadata } = session;

  if (!metadata?.userId) {
    console.error('No userId in metadata');
    return;
  }

  try {
    // Link Stripe customer to user
    await linkStripeSubscription(
      metadata.userId,
      subscriptionId || '',
      metadata.priceId || '',
      'active'
    );

    console.log(`Subscription activated for user ${metadata.userId}`);
  } catch (error) {
    console.error('Error handling checkout:', error);
  }
}

/**
 * Handle paid invoice (subscription renewal)
 */
async function handleInvoicePaid(invoice: any) {
  const { subscription: subscriptionId, customer: _customerId } = invoice;

  console.log(`Invoice paid for subscription ${subscriptionId}`);
  // Additional logic for tracking recurring payments could go here
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(subscription: any) {
  const { id: _subscriptionId, metadata } = subscription;

  if (!metadata?.userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    await cancelSubscription(metadata.userId);
    console.log(`Subscription cancelled for user ${metadata.userId}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

/**
 * Handle subscription updates (e.g., plan change)
 */
async function handleSubscriptionUpdated(subscription: any) {
  const { id: subscriptionId, metadata, status } = subscription;

  if (!metadata?.userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  try {
    if (status === 'active') {
      await updateSubscriptionTier(metadata.userId, 'premium');
    } else if (status === 'past_due' || status === 'unpaid') {
      // Could handle dunning here
      console.log(`Subscription ${subscriptionId} status: ${status}`);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}
