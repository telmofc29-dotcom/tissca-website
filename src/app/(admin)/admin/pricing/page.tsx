import { tradeConfigs, regionMultipliers, pricingDisclaimer } from '@/config/pricing';

export default function AdminPricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin: Pricing Management</h1>
        <p className="text-gray-600 mb-8">View and manage professional benchmark pricing configurations</p>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold text-amber-900 mb-2">Pricing Philosophy</h2>
          <p className="text-sm text-amber-900 mb-4">{pricingDisclaimer}</p>
          <div className="text-sm text-amber-900 space-y-2">
            <p><span className="font-semibold">Budget Mode:</span> Cost-conscious approach. Basic quality, standard materials, quicker timeline.</p>
            <p><span className="font-semibold">Standard Mode:</span> Professional standard. Typical market quality, conventional materials, standard timeline.</p>
            <p><span className="font-semibold">Premium Mode:</span> TISSCA Pro Benchmark. Premium finishes, high-quality materials, meticulous workmanship.</p>
          </div>
        </div>

        {/* Trade Configurations */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-slate-900">Trade Configurations</h2>
            <p className="text-gray-600 mt-1">Labour rates (£/day) and productivity (units/day) by pricing mode</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Trade</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Unit</th>
                  <th colSpan={3} className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Daily Rate (£/day)</th>
                  <th colSpan={3} className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Base Productivity</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3"></th>
                  <th className="px-6 py-3"></th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Budget</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Standard</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Premium</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Budget</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Standard</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600">Premium</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tradeConfigs).map(([key, config], idx) => (
                  <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{config.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{config.unit}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">£{config.dailyRate.budget}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">£{config.dailyRate.standard}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 font-semibold">£{config.dailyRate.premium}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">{config.baseProductivity.budget}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900">{config.baseProductivity.standard}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-900 font-semibold">{config.baseProductivity.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Region Multipliers */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-slate-900">Region Cost Adjusters</h2>
            <p className="text-gray-600 mt-1">Labour cost multipliers by UK region (1.0 = baseline)</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
            {Object.entries(regionMultipliers).map(([region, multiplier]) => (
              <div key={region} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-slate-900 capitalize">{region}</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{(multiplier * 100).toFixed(0)}%</p>
                <p className="text-xs text-gray-600 mt-1">
                  {multiplier > 1 ? '+' : ''}
                  {Math.round((multiplier - 1) * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Multipliers Example */}
        <div className="bg-white rounded-lg border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-slate-900">Difficulty Multipliers</h2>
            <p className="text-gray-600 mt-1">Applied to productivity rates (example: Painting)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900">Easy</p>
              <p className="text-3xl font-bold text-green-600 mt-2">0.90×</p>
              <p className="text-xs text-green-900 mt-1">Simple walls, minimal obstacles</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900">Standard</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">1.00×</p>
              <p className="text-xs text-blue-900 mt-1">Normal work, typical conditions</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm font-semibold text-orange-900">Hard</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">1.25×</p>
              <p className="text-xs text-orange-900 mt-1">Complex surfaces, difficult access</p>
            </div>
          </div>
        </div>

        {/* Pricing Mode Summary */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-slate-900">Pricing Mode Multipliers</h2>
            <p className="text-gray-600 mt-1">Relative cost vs. Standard baseline</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 capitalize">Budget</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">0.75×</p>
              <p className="text-xs text-blue-900 mt-2">25% cheaper than Standard</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900 capitalize">Standard</p>
              <p className="text-3xl font-bold text-green-600 mt-2">1.00×</p>
              <p className="text-xs text-green-900 mt-2">Baseline professional pricing</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-semibold text-purple-900 capitalize">Premium</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">1.50×</p>
              <p className="text-xs text-purple-900 mt-2">50% more than Standard (benchmark)</p>
            </div>
          </div>
        </div>

        {/* Configuration Notes */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Configuration Notes</h3>
          <ul className="text-sm text-blue-900 space-y-2">
            <li>• All rates are in GBP (£) per day</li>
            <li>• Productivity figures vary by unit (sqm, linear metres, items, etc.)</li>
            <li>• Region multipliers apply to final labour costs</li>
            <li>• Difficulty multipliers affect estimated timeline</li>
            <li>• Premium mode reflects professional benchmark work (meticulous, high-quality finishes)</li>
            <li>• To update rates, modify src/config/pricing.ts directly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
