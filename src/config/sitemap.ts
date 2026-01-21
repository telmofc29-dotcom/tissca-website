/**
 * BUILDR Platform - Complete Page Index & Sitemap
 * ================================================
 * 
 * This file documents all pages in the platform, their purposes,
 * and the scalable structure they support.
 */

export const sitePages = {
  // Root Pages
  root: [
    {
      path: '/',
      title: 'Home',
      description: 'BUILDR homepage with platform overview and entry points',
      type: 'homepage',
      template: 'hero + grid cards',
    },
    {
      path: '/not-found',
      title: '404 Page',
      description: 'Page not found with helpful links',
      type: 'error',
    },
  ],

  // Main Sections
  workmanship: {
    path: '/workmanship',
    title: 'Is This Done Properly?',
    description: 'Construction quality assessment and defect identification',
    subpages: [
      {
        path: '/workmanship/[defect-slug]',
        title: 'Specific Defect Guide',
        description: 'Deep dive into specific construction defects',
        examples: [
          '/workmanship/cracked-tiles',
          '/workmanship/poor-pointing',
          '/workmanship/uneven-plastering',
        ],
      },
    ],
  },

  constructionCosts: {
    path: '/construction-costs',
    title: 'How Much Should This Cost?',
    description: 'Honest cost breakdowns and pricing factors',
    subpages: [
      {
        path: '/construction-costs/[trade]',
        title: 'Cost Breakdown by Trade',
        description: 'Detailed costs for specific trades',
        examples: [
          '/construction-costs/tiling',
          '/construction-costs/painting',
          '/construction-costs/plastering',
          '/construction-costs/electrical',
          '/construction-costs/plumbing',
        ],
      },
    ],
  },

  avoidScams: {
    path: '/avoid-scams',
    title: 'Avoid Scams & Costly Mistakes',
    description: 'Protection strategies and red flags',
    subpages: [
      {
        path: '/avoid-scams/[topic]',
        title: 'Specific Scam Type or Strategy',
        description: 'In-depth guide to protecting yourself',
        examples: [
          '/avoid-scams/builder-red-flags',
          '/avoid-scams/contract-tricks',
          '/avoid-scams/fake-warranties',
          '/avoid-scams/payment-protection',
        ],
      },
    ],
  },

  calculators: {
    path: '/calculators',
    title: 'Pro Calculators',
    description: 'Directory of professional construction calculators',
    staticCalculators: [
      {
        path: '/calculators/tiling',
        name: 'Tiling Calculator',
        inputs: ['square meters', 'waste percentage', 'adhesive type', 'grout type'],
        outputs: ['tiles needed', 'adhesive liters', 'grout kilos'],
      },
      {
        path: '/calculators/painting',
        name: 'Painting Calculator',
        inputs: ['area (sqm)', 'number of coats', 'paint type'],
        outputs: ['liters needed', 'coats coverage', 'cost estimate'],
      },
      {
        path: '/calculators/plastering',
        name: 'Plastering Calculator',
        inputs: ['area (sqm)', 'plaster thickness', 'plaster type'],
        outputs: ['bags needed', 'water needed', 'coverage time'],
      },
      {
        path: '/calculators/flooring',
        name: 'Flooring Calculator',
        inputs: ['area (sqm)', 'material type', 'waste %'],
        outputs: ['material needed', 'underlay needed', 'cost estimate'],
      },
      {
        path: '/calculators/concrete',
        name: 'Concrete Calculator',
        inputs: ['length (m)', 'width (m)', 'depth (cm)', 'concrete type'],
        outputs: ['cubic meters', 'bags needed', 'cost estimate'],
      },
      {
        path: '/calculators/insulation',
        name: 'Insulation Calculator',
        inputs: ['area (sqm)', 'insulation type', 'required R-value'],
        outputs: ['material needed', 'thickness', 'cost estimate'],
      },
      {
        path: '/calculators/brick-block',
        name: 'Brick & Block Calculator',
        inputs: ['area (sqm)', 'brick/block type', 'mortar type'],
        outputs: ['units needed', 'mortar needed', 'cost estimate'],
      },
      {
        path: '/calculators/labour',
        name: 'Labour Estimator',
        inputs: ['task type', 'area/quantity', 'skill level', 'region'],
        outputs: ['labour hours', 'labour cost', 'team size'],
      },
      {
        path: '/calculators/waste',
        name: 'Material Waste Calculator',
        inputs: ['material type', 'quantity', 'application type'],
        outputs: ['waste percentage', 'extra needed', 'net cost'],
      },
    ],
  },

  guides: {
    path: '/guides',
    title: 'How To Do It Properly',
    description: 'Step-by-step guides with videos and professional tips',
    subpages: [
      {
        path: '/guides/[slug]',
        title: 'Individual How-To Guide',
        description: 'Comprehensive guide with steps, video, tools list',
        examples: [
          '/guides/how-to-tile-a-bathroom',
          '/guides/painting-exterior-walls',
          '/guides/laying-concrete-floor',
          '/guides/installing-insulation',
        ],
        structure: {
          sections: [
            'introduction',
            'tools & materials',
            'step-by-step instructions',
            'video tutorials',
            'common mistakes',
            'safety notes',
            'pro tips',
            'related guides',
          ],
        },
      },
    ],
  },

  education: {
    path: '/education',
    title: 'Construction Education',
    description: 'Learning hub for construction principles and standards',
    subpages: [
      {
        path: '/education/[topic]',
        title: 'Educational Topic',
        description: 'In-depth learning on construction topics',
        examples: [
          '/education/renovation-sequence',
          '/education/material-selection',
          '/education/building-codes',
          '/education/professional-standards',
          '/education/quality-assurance',
        ],
      },
    ],
  },

  // Info Pages
  info: [
    {
      path: '/about',
      title: 'About BUILDR',
      description: 'Platform mission and philosophy',
      type: 'static',
    },
    {
      path: '/privacy',
      title: 'Privacy Policy',
      description: 'Data handling and privacy practices',
      type: 'legal',
    },
    {
      path: '/terms',
      title: 'Terms of Service',
      description: 'Platform terms and conditions',
      type: 'legal',
    },
    {
      path: '/contact',
      title: 'Contact Us',
      description: 'Get in touch with BUILDR',
      type: 'contact',
    },
  ],
};

/**
 * TOTAL PAGE COUNT (Current)
 * ========================
 * 
 * Static Pages: 13
 * - Homepage: 1
 * - Info/Legal: 4 (About, Privacy, Terms, Contact)
 * - Main Sections: 6 (Workmanship, Costs, Scams, Calculators, Guides, Education)
 * - 404 Page: 1
 * - Static Calculators: 9
 * 
 * SCALABILITY (Architecture Ready)
 * ================================
 * 
 * With dynamic routes, this platform can support:
 * - 100+ defect guides in /workmanship/[slug]
 * - 50+ trade cost breakdowns in /construction-costs/[trade]
 * - 100+ scam protection guides in /avoid-scams/[topic]
 * - 200+ how-to guides in /guides/[slug]
 * - 100+ educational topics in /education/[topic]
 * 
 * Total Potential: 500+ content pages with current architecture
 * Easily expandable to 1000+ with additional sections
 */

export const scalingPotential = {
  currentPages: 13,
  staticCalculators: 9,
  totalCurrentlyBuilt: 22,
  dynamicRoutesSupported: {
    workmanship: '50-100 pages',
    constructionCosts: '30-50 pages',
    avoidScams: '50-100 pages',
    guides: '200+ pages',
    education: '50-100 pages',
  },
  totalScalableTo: '500+ pages immediately, 1000+ with additional sections',
  futureExpansions: [
    'Blog section: /blog/[post-slug]',
    'User projects: /projects/[id]',
    'User saved guides: /my-guides',
    'Search results: /search?q=query',
    'Filtered content: /guides?category=flooring&skill=beginner',
  ],
};
