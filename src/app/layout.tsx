import type { Metadata } from 'next';
import { defaultMetadata } from '@/config/metadata';
import FeedbackButton from '@/components/FeedbackButton';
import './globals.css';

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head />
      <body className="bg-white text-primary">
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
