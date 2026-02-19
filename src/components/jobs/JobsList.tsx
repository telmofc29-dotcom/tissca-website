import React from 'react';
import { formatDate } from '@/lib/utils';

interface Job {
  id: string;
  status: string;
  scheduledDate: string | null;
  dueDate: string | null;
  paymentDueDate: string | null;
  value: number;
  notes: string | null;
  createdAt: string;
  linkedLeadId: string | null;
  lead?: any;
}

interface JobsListProps {
  jobs: Job[];
}

export default function JobsList({
  jobs,
}: JobsListProps) {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'On Hold':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No jobs found. Create one to get started!</p>
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
              Scheduled Date
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Payment Due
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Value
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              From Lead
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Notes
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                    job.status
                  )}`}
                >
                  {job.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {job.scheduledDate
                  ? formatDate(new Date(job.scheduledDate))
                  : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {job.dueDate ? formatDate(new Date(job.dueDate)) : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {job.paymentDueDate
                  ? formatDate(new Date(job.paymentDueDate))
                  : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {job.value > 0 ? `$${job.value}` : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700">
                {job.linkedLeadId ? '✓' : '-'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                {job.notes || '-'}
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex gap-2">
                  <button
                    className="text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => {
                      // TODO: Implement edit functionality
                      console.log('Edit job:', job.id);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800 font-medium"
                    onClick={() => {
                      // TODO: Implement delete
                      console.log('Delete job:', job.id);
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
