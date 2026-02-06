import React from 'react';
import { formatDate } from '@/lib/utils';

interface Lead {
  id: string;
  status: string;
  followUpDate: string | null;
  valueEstimate: number;
  notes: string | null;
  source: string | null;
  createdAt: string;
  tags: string[];
  jobs?: any[];
}

interface LeadsTableProps {
  leads: Lead[];
  userId: string;
  onRefresh: () => void;
}

export default function LeadsTable({
  leads,
  userId,
  onRefresh,
}: LeadsTableProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-100 text-blue-800';
      case 'Contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'Quoted':
        return 'bg-purple-100 text-purple-800';
      case 'Won':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No leads found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Follow-Up Date
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Value Estimate
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Source
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Notes
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Created
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {lead.followUpDate
                  ? formatDate(new Date(lead.followUpDate))
                  : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {lead.valueEstimate > 0 ? `$${lead.valueEstimate}` : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {lead.source || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                {lead.notes || '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {formatDate(new Date(lead.createdAt))}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => {
                      // TODO: Implement edit functionality
                      console.log('Edit lead:', lead.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-green-600 hover:text-green-800 font-medium"
                    onClick={() => {
                      // TODO: Implement convert to job
                      console.log('Convert to job:', lead.id);
                    }}
                  >
                    Convert
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 font-medium"
                    onClick={() => {
                      // TODO: Implement delete
                      console.log('Delete lead:', lead.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
