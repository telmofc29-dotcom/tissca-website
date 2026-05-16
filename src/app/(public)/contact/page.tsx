import { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact — TISSCA',
  description: 'Get in touch with the TISSCA team.',
};

export default function ContactPage() {
  return <ContactClient />;
}
