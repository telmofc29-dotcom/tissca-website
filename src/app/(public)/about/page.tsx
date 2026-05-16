import { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About TISSCA — The Platform for Tradespeople',
  description: 'TISSCA is the all-in-one platform built for tradespeople and construction businesses to manage work, run operations, and grow.',
};

export default function AboutPage() {
  return <AboutClient />;
}
