import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Media Library',
};

export default function AdminMediaPage() {
  const mediaFiles = [
    { id: 1, name: 'bathroom-tiling.jpg', type: 'Image', size: '2.4 MB', date: '2024-01-15' },
    { id: 2, name: 'painting-guide.mp4', type: 'Video', size: '125 MB', date: '2024-01-12' },
    { id: 3, name: 'flooring-diagram.png', type: 'Image', size: '1.1 MB', date: '2024-01-10' },
    { id: 4, name: 'electrical-safety.pdf', type: 'Document', size: '3.5 MB', date: '2024-01-08' },
    { id: 5, name: 'drywall-repair.jpg', type: 'Image', size: '1.8 MB', date: '2024-01-05' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Media Library</h2>
          <p className="text-gray-600 mt-2">Upload and manage images, videos, and documents.</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors">
          + Upload Files
        </button>
      </div>

      {/* Storage Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Storage Usage</h3>
          <span className="text-sm text-gray-600">12.4 GB of 100 GB used</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-blue-500 h-3 rounded-full" style={{ width: '12.4%' }} />
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Filename</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Uploaded</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mediaFiles.map((file, idx) => (
              <tr key={file.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{file.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{file.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{file.size}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{file.date}</td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-700 font-medium mr-4">View</button>
                  <button className="text-red-600 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Upload Guidelines</h3>
        <ul className="space-y-2 text-blue-800 text-sm">
          <li>• Supported formats: JPG, PNG, GIF, MP4, PDF, and more</li>
          <li>• Maximum file size: 500 MB</li>
          <li>• Images should be optimized for web (under 5 MB)</li>
          <li>• Videos should be in MP4 format for compatibility</li>
        </ul>
      </div>
    </div>
  );
}
