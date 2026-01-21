import { addFeedbackSubmission, type FeedbackSubmission } from '@/utils/feedback';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackSubmission = await request.json();

    // Validate required fields
    if (!body.type || !body.headline || !body.description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add user agent from request
    const userAgent = request.headers.get('user-agent') || undefined;
    const submission = {
      ...body,
      userAgent,
      updatedAt: new Date().toISOString(),
    };

    // Store feedback
    const stored = addFeedbackSubmission(submission);

    return NextResponse.json({
      success: true,
      id: stored.id,
      message: 'Feedback submitted successfully',
    });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // This will be used by admin pages
  return NextResponse.json({
    message: 'Use POST to submit feedback',
  });
}
