'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { createLead } from '../actions';

export default function NewLeadPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    status: 'New',
    followUpDate: '',
    valueEstimate: '',
    tags: '',
    notes: '',
    source: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!supabase) {
        setError('Supabase client not initialized');
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      await createLead(user.id, {
        status: formData.status,
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : undefined,
        valueEstimate: formData.valueEstimate ? parseInt(formData.valueEstimate) : 0,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        notes: formData.notes || undefined,
        source: formData.source || undefined,
      });

      router.push('/dashboard/app/leads');
    } catch (err) {
      console.error('[NewLeadPage] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:text-blue-800"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Lead</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option>New</option>
                <option>Contacted</option>
                <option>Quoted</option>
                <option>Won</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-Up Date
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) =>
                  setFormData({ ...formData, followUpDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Value Estimate
              </label>
              <input
                type="number"
                value={formData.valueEstimate}
                onChange={(e) =>
                  setFormData({ ...formData, valueEstimate: e.target.value })
                }
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                placeholder="e.g., Referral, Website, Phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="e.g., urgent, premium, follow-up"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any notes about this lead"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
