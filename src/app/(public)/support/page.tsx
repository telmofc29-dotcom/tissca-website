import { Metadata } from 'next';
import SupportClient from './SupportClient';

export const metadata: Metadata = {
  title: 'Support — TISSCA',
  description: 'Get help with TISSCA — browse our FAQ, find answers, or send us a message.',
};

export default function SupportPage() {
  return <SupportClient />;
}
