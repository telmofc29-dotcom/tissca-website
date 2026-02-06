import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Overhead & Management Costs - Business Expenses | TISSCA',
  description: 'Understand project overhead and management costs. Why contractors charge for more than just labour and materials.',
  keywords: 'project overhead, management fees, business costs, contractor pricing',
};

export default function ProjectOverheadAndManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Project Overhead & Management</h1>
          <p className="text-lg text-slate-200">
            Understanding the costs of running a construction business. Overhead isn't waste—it's essential to professional service delivery.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">What Is Project Overhead?</h2>
          <p className="text-slate-700 mb-6">
            Overhead costs are the business expenses required to operate a construction company and deliver professional service. These include rent, insurance, management, planning, and profit. Typical overhead is 20-35% of labour cost, though this varies by company size and type.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Business Overhead Costs</h2>

          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold text-lg mb-2">Rent & Facilities</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Office/workshop rent:</strong> £1,000-5,000+ per month</p>
                <p><strong>Utilities (electricity, water, heating):</strong> £200-800 per month</p>
                <p><strong>Facility maintenance:</strong> £300-1,000 per month</p>
                <p><strong>Parking/storage for vehicles & equipment:</strong> £200-1,000 per month</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>A 10-person construction company typically has £3,000-8,000/month in facility costs.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold text-lg mb-2">Insurance</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Public liability insurance:</strong> £500-2,000 per year</p>
                <p><strong>Employers' liability insurance:</strong> £600-2,000 per year</p>
                <p><strong>Professional indemnity insurance:</strong> £800-3,000 per year</p>
                <p><strong>Vehicle insurance (multiple vehicles):</strong> £2,000-8,000 per year</p>
                <p><strong>Tools & equipment insurance:</strong> £500-2,000 per year</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Total insurance: typically £1,500-3,000 per month for established company.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold text-lg mb-2">Administrative & Management</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Office staff salaries:</strong> £2,000-6,000 per month (if employed)</p>
                <p><strong>Accountant/bookkeeper fees:</strong> £200-600 per month</p>
                <p><strong>Legal fees (contracts, disputes):</strong> £100-400 per month (average)</p>
                <p><strong>Business software subscriptions:</strong> £100-300 per month</p>
                <p><strong>Phone & internet:</strong> £50-150 per month</p>
                <p><strong>Office supplies:</strong> £100-300 per month</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Small companies often subcontract these. Larger companies employ staff.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold text-lg mb-2">Vehicles & Transport</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Vehicle lease/finance:</strong> £300-800 per vehicle per month</p>
                <p><strong>Fuel costs:</strong> £200-600 per vehicle per month</p>
                <p><strong>Maintenance & repairs:</strong> £100-400 per vehicle per month</p>
                <p><strong>Vehicle tax/MOT:</strong> £50-100 per vehicle per month</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>A company with 5 vehicles: £3,000-8,000/month in transport costs.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-orange-400 p-4 bg-orange-50">
              <h3 className="font-bold text-lg mb-2">Marketing & Business Development</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Website & SEO:</strong> £200-500 per month</p>
                <p><strong>Local advertising:</strong> £200-800 per month</p>
                <p><strong>Google Ads:</strong> £300-1,000 per month</p>
                <p><strong>Printed materials (business cards, flyers):</strong> £100-300 per month</p>
                <p className="text-sm text-slate-600 mt-3">
                  <em>Companies spend 5-10% of turnover on marketing/business development.</em>
                </p>
              </div>
            </div>

            <div className="border-l-4 border-pink-400 p-4 bg-pink-50">
              <h3 className="font-bold text-lg mb-2">Training & Compliance</h3>
              <div className="space-y-2 text-slate-700">
                <p><strong>Staff training (health & safety, skills):</strong> £200-600 per year per employee</p>
                <p><strong>Health & safety compliance:</strong> £300-800 per year</p>
                <p><strong>Certifications/memberships:</strong> £200-500 per year</p>
                <p><strong>PPE (hard hats, vests, boots):</strong> £500-2,000 per year for team</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Project-Specific Management Costs</h2>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Site Supervision & Coordination</h3>
            <div className="space-y-2 text-slate-700">
              <p><strong>Project manager/supervisor time:</strong> £50-150/hour</p>
              <p><strong>Daily site visits/coordination:</strong> Usually 2-4 hours per day on larger projects</p>
              <p><strong>Communication with client, trades, suppliers:</strong> 1-2 hours per day typical</p>
              <p className="text-sm text-slate-600 mt-4">
                <em>A 5-day project with supervisor: 3 hours/day × £80/hour × 5 days = £1,200 in management time alone.</em>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">Non-Billable Time</h3>
            <div className="space-y-2 text-slate-700">
              <p><strong>Site quotes/consultations:</strong> 1-3 hours (often unpaid)</p>
              <p><strong>Tender/proposal preparation:</strong> 2-4 hours (often unpaid, won't be used)</p>
              <p><strong>Site setup/cleanup (management):</strong> 1-2 hours before/after work</p>
              <p><strong>Paperwork/documentation:</strong> 30 minutes per day typical</p>
              <p><strong>Travel time between sites:</strong> 30 minutes to 2 hours depending on location</p>
              <p className="text-sm text-slate-600 mt-4">
                <em>For every billable hour, contractors often spend 0.5-1 hour on non-billable work.</em>
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Profit Margin</h2>

          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-green-500 p-4 bg-green-50">
              <h3 className="font-bold text-lg mb-2">Is Profit Margin "Extra Charge"?</h3>
              <p className="text-slate-700 mb-4">
                No. Profit margin (typically 15-20% for quality contractors) is essential for business viability. It covers:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700">
                <li>Business growth and investment in better equipment</li>
                <li>Cash flow—contractors have to buy materials before invoicing you</li>
                <li>Bad debts—some customers don't pay</li>
                <li>Slow periods when there's no billable work</li>
                <li>Paying staff holidays and sick leave</li>
                <li>Reinvestment in training and certification</li>
              </ul>
            </div>

            <div className="bg-slate-100 rounded p-6 mb-8">
              <h3 className="font-bold text-lg mb-3">Profit Tier Expectations</h3>
              <div className="space-y-3 text-slate-700">
                <div className="border-b pb-2">
                  <p><strong>10-12% profit:</strong> Budget contractors, high-volume, lower service level</p>
                </div>
                <div className="border-b pb-2">
                  <p><strong>15-20% profit:</strong> Standard professional contractors, sustainable business model</p>
                </div>
                <div className="border-b pb-2">
                  <p><strong>20-30% profit:</strong> Premium/specialist contractors, high-end projects, comprehensive service</p>
                </div>
                <div>
                  <p><strong>Over 30% profit:</strong> Either taking on excessive risk or potentially overpricing</p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Cost Breakdown</h2>

          <div className="bg-slate-50 p-6 rounded-lg mb-8">
            <h3 className="font-bold mb-4">10-Person Construction Company - Monthly Costs</h3>
            <div className="space-y-2 text-slate-700 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span>Office rent & facilities:</span>
                <span>£5,000</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Insurance (vehicles, liability, etc.):</span>
                <span>£2,500</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Office admin staff (1 person):</span>
                <span>£2,500</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Professional services (accountant, lawyer):</span>
                <span>£800</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Vehicle costs (5 vehicles):</span>
                <span>£6,000</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Marketing & business development:</span>
                <span>£2,000</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Training, compliance, PPE:</span>
                <span>£1,000</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span>Tools & equipment maintenance:</span>
                <span>£1,200</span>
              </div>
              <div className="flex justify-between font-bold pt-2">
                <span>Total Monthly Overhead:</span>
                <span className="text-orange-600">£21,000</span>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              <em>This overhead must be spread across billable hours. If company works 800 billable hours/month (10 people × 40 hours × 2 weeks), overhead is £26/hour minimum.</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Why Overhead Varies</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Company size:</strong> Solo operator has lower overhead than 20-person firm</li>
            <li><strong>Location:</strong> London office rent: £3,000-5,000. Northern city: £1,000-2,000</li>
            <li><strong>Service level:</strong> Premium companies with better equipment/training spend more on overhead</li>
            <li><strong>Specialisation:</strong> Specialist work (listed buildings, heritage) has higher overhead</li>
            <li><strong>Business model:</strong> Companies with office staff have higher overhead than solo traders</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags in Overhead Pricing</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Quote with no overhead/management mentioned:</strong> Unrealistic—overhead always exists</li>
            <li><strong>Excessive overhead charges:</strong> Over 30% of labour cost is high (unless premium service)</li>
            <li><strong>Vague "management fee":</strong> Should be itemised or as percentage clearly stated</li>
            <li><strong>"No overhead" promise:</strong> Impossible. Either deliberately misleading or unsustainable pricing</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Key Takeaways</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Overhead costs are real and substantial—£15,000-30,000+ per month for professional firms</li>
            <li>Professional service (reliable, insured, trained) requires overhead investment</li>
            <li>Profit margin 15-20% is normal and healthy for sustainable business</li>
            <li>Extremely cheap contractors are either taking unsustainable risk or cutting corners</li>
          </ul>
        </div>

        {/* Related Pages */}
        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/contingency-and-unknowns" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Contingency & Unknowns
            </Link>
            <Link href="/costs/labour-costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Labour Costs
            </Link>
            <Link href="/avoid-scams" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Avoiding Construction Scams
            </Link>
            <Link href="/costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Back to All Cost Categories
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
