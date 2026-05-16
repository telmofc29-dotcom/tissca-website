/**
 * i18n/translations.ts — TISSCA multilingual translation dictionary
 * ==================================================================
 * Single-file, type-safe translation dictionary for 5 languages.
 * Pattern: flat nested keys → easy to maintain, no external deps.
 *
 * SUPPORTED LANGUAGES (priority order):
 * 1. en — English (default)
 * 2. pt — Portuguese
 * 3. it — Italian
 * 4. es — Spanish
 * 5. fr — French
 */

export const SUPPORTED_LOCALES = ['en', 'pt', 'it', 'es', 'fr'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  it: 'Italiano',
  es: 'Español',
  fr: 'Français',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  pt: '🇵🇹',
  it: '🇮🇹',
  es: '🇪🇸',
  fr: '🇫🇷',
};

export const DEFAULT_LOCALE: Locale = 'en';

/* ─────────────────────── Translation shape ─────────────────────── */

export interface TranslationStrings {
  // Header nav
  nav: {
    features: string;
    pricing: string;
    download: string;
    login: string;
    getStarted: string;
    openApp: string;
  };
  // Hero
  hero: {
    title: string;
    titleAccent: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    viewPlans: string;
  };
  // Trust strip
  trust: {
    items: string[];
  };
  // Features
  features: {
    heading: string;
    subheading: string;
    cards: { title: string; description: string }[];
  };
  // Why TISSCA
  whyTissca: {
    heading: string;
    description: string;
    benefits: { title: string; description: string }[];
  };
  // Plans
  plans: {
    heading: string;
    subheading: string;
    enterprise: string;
    contactUs: string;
  };
  // Download
  download: {
    heading: string;
    subheading: string;
    googlePlay: string;
    appStore: string;
    web: string;
  };
  // Final CTA
  cta: {
    heading: string;
    subheading: string;
    primary: string;
    secondary: string;
  };
  // Footer
  footer: {
    product: string;
    resources: string;
    company: string;
    login: string;
    openApp: string;
  };
  // Cookie consent
  cookie: {
    message: string;
    privacyLink: string;
    acceptAll: string;
    essentialOnly: string;
  };
  // About page
  about: {
    title: string;
    description: string;
    whatIs: { heading: string; p1: string; p2: string };
    whatDoes: { heading: string; items: string[] };
    whoFor: { heading: string; text: string };
    approach: { heading: string; items: string[] };
    contact: { heading: string; text: string };
  };
  // Contact page
  contact: {
    title: string;
    description: string;
    form: {
      name: string;
      email: string;
      message: string;
      namePlaceholder: string;
      emailPlaceholder: string;
      messagePlaceholder: string;
      submit: string;
      sending: string;
      sentTitle: string;
      sentMessage: string;
      sendAnother: string;
      error: string;
    };
    sidebar: {
      emailLabel: string;
      responseLabel: string;
      responseText: string;
      helpLabel: string;
      helpText: string;
    };
  };
  // Member app (logged-in area)
  member: {
    nav: {
      overview: string;
      leads: string;
      jobs: string;
      quotes: string;
      invoices: string;
      history: string;
      chat: string;
      tools: string;
      planner: string;
      calendar: string;
      tasks: string;
      assets: string;
      projects: string;
      accountant: string;
      settings: string;
      dashboard: string;
      account: string;
      billing: string;
      logOut: string;
    };
    common: {
      loading: string;
      error: string;
      noData: string;
      retry: string;
      search: string;
      actions: string;
      status: string;
      date: string;
      name: string;
      email: string;
      phone: string;
      total: string;
      notes: string;
    };
    dashboard: {
      title: string;
      subtitle: string;
      outstanding: string;
      leadsWon: string;
      openQuotes: string;
      conversion: string;
      recentHistory: string;
      quickActions: string;
      newLead: string;
      newQuote: string;
      newInvoice: string;
      viewAll: string;
    };
    leads: {
      title: string;
      subtitle: string;
      empty: string;
      source: string;
      value: string;
      createTitle: string;
      createSubtitle: string;
      leadName: string;
      leadNamePlaceholder: string;
      leadStatus: string;
      leadSource: string;
      estimateValue: string;
      followUpDate: string;
      clientDetails: string;
      clientDetailsHint: string;
      clientName: string;
      clientNamePlaceholder: string;
      clientEmail: string;
      clientEmailPlaceholder: string;
      clientPhone: string;
      clientPhonePlaceholder: string;
      clientAddress: string;
      clientAddressPlaceholder: string;
      estimateAttached: string;
      createLead: string;
      creating: string;
      backToEstimate: string;
      statusNew: string;
      statusContacted: string;
      statusQuoted: string;
      statusWon: string;
      statusLost: string;
    };
    jobs: {
      title: string;
      subtitle: string;
      empty: string;
      client: string;
      priority: string;
    };
    tasks: {
      title: string;
      subtitle: string;
      empty: string;
      assignee: string;
      dueDate: string;
    };
    assets: {
      title: string;
      subtitle: string;
      empty: string;
      type: string;
      location: string;
    };
    history: {
      title: string;
      subtitle: string;
      empty: string;
      action: string;
      entity: string;
    };
    subscription: {
      title: string;
      subtitle: string;
      backToSettings: string;
      planSummary: string;
      planSummaryDesc: string;
      currentPlan: string;
      statusLabel: string;
      workspace: string;
      nextBillingDate: string;
      basedOnPeriodEnd: string;
      billingLinks: string;
      customer: string;
      subscriptionLink: string;
      returnedFromBilling: string;
      returnedFromBillingDesc: string;
      dismiss: string;
      finalising: string;
      loadingBilling: string;
      noWorkspace: string;
      plansTitle: string;
      plansSubtitle: string;
      openBillingPortal: string;
      openingBillingPortal: string;
      cancelSubscription: string;
      openingCancellation: string;
      deleteAccount: string;
      deleting: string;
      promoTitle: string;
      promoSubtitle: string;
      promoPlaceholder: string;
      applyCode: string;
      applying: string;
      plans: {
        free: { name: string; subtitle: string; features: string[]; note: string };
        pro: { name: string; subtitle: string; features: string[]; cta: string; ctaCurrent: string; ctaFinalising: string; note: string };
        teamStarter: { name: string; subtitle: string; features: string[]; cta: string; ctaCurrent: string; ctaFinalising: string; note: string };
        teamPro: { name: string; subtitle: string; features: string[]; cta: string; ctaCurrent: string; ctaFinalising: string; note: string };
      };
      current: string;
      startingCheckout: string;
      confirmCancel: {
        title: string;
        description: string;
        benefits: string[];
        note: string;
        keep: string;
        proceed: string;
      };
      confirmDelete: {
        title: string;
        description: string;
        losses: string[];
        note: string;
        keep: string;
        proceed: string;
      };
      errors: {
        supabaseUnavailable: string;
        notSignedIn: string;
        loadFailed: string;
        noWorkspace: string;
        unknownTier: string;
        checkoutFailed: string;
        invalidCheckoutUrl: string;
        portalFailed: string;
        invalidPortalUrl: string;
        cancelFailed: string;
        noPaidSubscription: string;
        enterPromoCode: string;
        promoFailed: string;
        deleteFailed: string;
      };
      status: {
        active: string;
        trial: string;
        pastDue: string;
        cancelled: string;
        inactive: string;
      };
    };
    settings: {
      profile: string;
      name: string;
      emailAddress: string;
      mobileNumber: string;
      businessAddress: string;
      businessPhone: string;
      business: string;
      workspace: string;
      vatDetails: string;
      invoiceDefaults: string;
      notifications: string;
      emailAlerts: string;
      paymentReminders: string;
      taskReminders: string;
      billingTitle: string;
      billingSubtitle: string;
      subscriptionBilling: string;
      manageSubscription: string;
      currentPlan: string;
      emailPreferences: {
        title: string;
        subtitle: string;
        manage: string;
        backToSettings: string;
        categories: string;
        categoriesDesc: string;
        productUpdates: string;
        productUpdatesDesc: string;
        featureEmails: string;
        featureEmailsDesc: string;
        upgradeEmails: string;
        upgradeEmailsDesc: string;
        billingEmails: string;
        billingEmailsDesc: string;
        reminderEmails: string;
        reminderEmailsDesc: string;
        supportFollowup: string;
        supportFollowupDesc: string;
        weeklySummary: string;
        weeklySummaryDesc: string;
        unsubscribeAll: string;
        unsubscribeAllDesc: string;
        frequencyTitle: string;
        frequencyDesc: string;
        frequencies: { immediate: string; daily: string; weekly: string };
        essentialNotice: string;
        saveSuccess: string;
        saveError: string;
      };
      personalDetails: {
        title: string;
        subtitle: string;
        manage: string;
        backToSettings: string;
        fullName: string;
        dateOfBirth: string;
        phone: string;
        address: string;
        saveSuccess: string;
        saveError: string;
        save: string;
        saving: string;
      };
      security: {
        title: string;
        subtitle: string;
        manage: string;
        backToSettings: string;
        accountEmail: string;
        accountEmailDesc: string;
        currentEmail: string;
        newEmail: string;
        updateEmail: string;
        updatingEmail: string;
        emailUpdateSuccess: string;
        emailUpdateVerify: string;
        passwordManagement: string;
        passwordManagementDesc: string;
        currentPassword: string;
        newPassword: string;
        confirmPassword: string;
        updatePassword: string;
        updatingPassword: string;
        passwordUpdateSuccess: string;
        passwordMismatch: string;
        passwordTooShort: string;
        forgotPassword: string;
        forgotPasswordDesc: string;
        sendResetEmail: string;
        sendingResetEmail: string;
        resetEmailSent: string;
        resetEmailError: string;
      };
    };
    feedback: {
      title: string;
      tooltip: string;
      tabs: { help: string; issue: string; suggestion: string; review: string };
      stepOf: string;
      headlinePlaceholder: string;
      descriptionPlaceholder: string;
      emailPlaceholder: string;
      back: string;
      close: string;
      next: string;
      submit: string;
      submitting: string;
      thankYou: string;
      thankYouMessage: string;
      contactNote: string;
      questions: {
        help: string[];
        issue: string[];
        suggestion: string[];
        review: string[];
      };
      labels: {
        whatDoing: string;
        whichArea: string;
        selectArea: string;
        blocked: string;
        blockedYes: string;
        blockedNo: string;
        extraDetail: string;
        issueTitle: string;
        affectedArea: string;
        describeIssue: string;
        expectedBehaviour: string;
        improveTitle: string;
        yourSuggestion: string;
        expectedBenefit: string;
        rateExperience: string;
        reviewTitle: string;
        reviewComments: string;
        optional: string;
        browseFaq: string;
      };
      areas: {
        homepage: string;
        pricing: string;
        download: string;
        signin: string;
        memberApp: string;
        quotesInvoices: string;
        leadsJobs: string;
        billing: string;
        settings: string;
        support: string;
        other: string;
      };
    };
    cancelReasons: {
      title: string;
      subtitle: string;
      reasons: {
        tooExpensive: string;
        notEnoughValue: string;
        cantAfford: string;
        missingFeatures: string;
        tooComplicated: string;
        switchingProvider: string;
        temporaryPause: string;
        other: string;
      };
      otherPlaceholder: string;
      requiredMessage: string;
      otherRequired: string;
      continueCancel: string;
      goBack: string;
    };
    tools: {
      title: string;
      editTitle: string;
      subtitle: string;
      editSubtitle: string;
      projectName: string;
      lineItems: string;
      addItem: string;
      description: string;
      subtotal: string;
      adjustments: string;
      discount: string;
      vat: string;
      depositPaid: string;
      notes: string;
      notesPlaceholder: string;
      summary: string;
      total: string;
      balanceDue: string;
      hideBreakdown: string;
      viewBreakdown: string;
      generateLead: string;
      addToLead: string;
      addToJob: string;
      clear: string;
      backToTools: string;
      updateEstimate: string;
      newEstimate: string;
      working: string;
      saving: string;
      generatedBreakdown: string;
      selectLead: string;
      selectJob: string;
      cancel: string;
      attach: string;
      searchLeads: string;
      searchJobs: string;
      noLeadsFound: string;
      noJobsFound: string;
      successLeadTitle: string;
      successLeadDesc: string;
      successAttachLead: string;
      successAttachJob: string;
      successUpdate: string;
      viewInLeads: string;
      viewInJobs: string;
      draftRestored: string;
      editing: string;
      discardNew: string;
      back: string;
      workspaceNote: string;
      removeItem: string;
    };
  };
}

/* ═══════════════════════════════ TRANSLATIONS ═══════════════════════════════ */

const en: TranslationStrings = {
  nav: {
    features: 'Features',
    pricing: 'Pricing',
    download: 'Download',
    login: 'Login',
    getStarted: 'Get Started',
    openApp: 'Open App',
  },
  hero: {
    title: 'Run your trade business',
    titleAccent: 'with TISSCA',
    subtitle: 'Quotes, jobs, tools, teams, and workflow — all in one platform built for tradespeople and construction businesses.',
    ctaPrimary: 'Open App',
    ctaSecondary: 'Download App',
    viewPlans: 'View Plans →',
  },
  trust: {
    items: ['Built for tradespeople', 'From solo to team scale', 'Tools + workflow in one place', 'Web and mobile access'],
  },
  features: {
    heading: 'Everything you need to run your business',
    subheading: 'One platform. Every tool. From first lead to final invoice.',
    cards: [
      { title: 'Leads & Jobs', description: 'Track work from first enquiry to completed project. Never lose a lead again.' },
      { title: 'Quotes & Invoices', description: 'Create professional documents in minutes. Send, track, and get paid faster.' },
      { title: 'Built-in Tools', description: 'Professional calculators and trade tools built right into the platform.' },
      { title: 'Team Workspace', description: 'Manage members, roles, and shared workflows. Collaborate without the chaos.' },
      { title: 'Assets & Organisation', description: 'Keep work, records, and operations structured in one central place.' },
      { title: 'Business Growth', description: 'Stay professional and scale cleanly — from one-person setup to full team.' },
    ],
  },
  whyTissca: {
    heading: 'One place to manage everything',
    description: "TISSCA replaces the spreadsheets, notepads, and scattered apps you're juggling today. Manage your leads, create professional quotes, send invoices, organise your team — all from one platform that's built for how tradespeople actually work.",
    benefits: [
      { title: 'Stop juggling separate tools', description: 'Everything in one platform — no more spreadsheets, notepads, and scattered apps.' },
      { title: 'Present a more professional business', description: 'Branded quotes, clean invoices, and organised client communications.' },
      { title: 'Stay organised across jobs and clients', description: 'From first enquiry to final invoice — every job tracked and nothing lost.' },
      { title: 'Grow from solo to full team', description: 'Start free, add team members when ready. The platform scales with you.' },
    ],
  },
  plans: {
    heading: 'Plans that grow with you',
    subheading: "Start free. Upgrade when you're ready. No pressure.",
    enterprise: 'Need more than 200 members?',
    contactUs: 'Contact us',
  },
  download: {
    heading: 'Take TISSCA wherever you work',
    subheading: 'Use TISSCA on the move, on-site, or at your desk.',
    googlePlay: 'Google Play',
    appStore: 'App Store',
    web: 'Web',
  },
  cta: {
    heading: 'Ready to run your business with TISSCA?',
    subheading: 'Join tradespeople and construction businesses already using the platform.',
    primary: 'Open App',
    secondary: 'Download App',
  },
  footer: {
    product: 'Product',
    resources: 'Resources',
    company: 'Company',
    login: 'Login',
    openApp: 'Open App',
  },
  cookie: {
    message: 'We use cookies to keep you signed in and improve your experience.',
    privacyLink: 'Privacy policy',
    acceptAll: 'Accept all',
    essentialOnly: 'Essential only',
  },
  about: {
    title: 'About TISSCA',
    description: 'The platform built for tradespeople and construction businesses.',
    whatIs: {
      heading: 'What is TISSCA?',
      p1: 'TISSCA is an all-in-one platform designed for tradespeople, contractors, and construction businesses. It brings together the tools you need to manage work, run operations, simplify admin, and scale your business — all from one place.',
      p2: 'Whether you\'re a sole trader managing quotes and invoices, or a team of 200 coordinating jobs across sites, TISSCA gives you the structure and tools to work smarter.',
    },
    whatDoes: {
      heading: 'What TISSCA does',
      items: [
        'Create and send professional quotes and invoices in minutes',
        'Track leads, jobs, and clients from first enquiry to completion',
        'Access built-in trade calculators and professional tools',
        'Manage your team, roles, and shared workflows in one workspace',
        'Keep your business records and assets organised and accessible',
        'Use TISSCA on web, Android, or iOS — wherever you work',
      ],
    },
    whoFor: {
      heading: 'Who it\'s for',
      text: 'Solo tradespeople. Growing teams. Established construction businesses. TISSCA is built to scale with you — start free and upgrade when you\'re ready. No pressure, no lock-in.',
    },
    approach: {
      heading: 'Our approach',
      items: [
        'Built for the trade — designed around how tradespeople actually work',
        'Simple and structured — no clutter, no unnecessary complexity',
        'One platform — replace the spreadsheets, notepads, and scattered apps',
        'Scalable — from a one-person setup to a team of 200+',
      ],
    },
    contact: {
      heading: 'Get in touch',
      text: 'Have a question or feedback? Reach us at support@tissca.com or visit our contact page.',
    },
  },
  contact: {
    title: 'Contact Us',
    description: "Have a question, feedback, or need help? We'd like to hear from you.",
    form: {
      name: 'Name',
      email: 'Email',
      message: 'Message',
      namePlaceholder: 'Your name',
      emailPlaceholder: 'you@example.com',
      messagePlaceholder: 'How can we help?',
      submit: 'Send Message',
      sending: 'Sending…',
      sentTitle: 'Message sent',
      sentMessage: "Thanks for reaching out. We'll get back to you soon.",
      sendAnother: 'Send another message',
      error: 'Something went wrong. Please try again or email us directly.',
    },
    sidebar: {
      emailLabel: 'Email',
      responseLabel: 'Response time',
      responseText: 'We aim to reply within 1–2 business days.',
      helpLabel: 'Looking for help?',
      helpText: 'Check our platform features on the homepage or review our plans.',
    },
  },
  member: {
    nav: { overview: 'Overview', leads: 'Leads', jobs: 'Jobs', quotes: 'Quotes', invoices: 'Invoices', history: 'History', chat: 'TissChat', tools: 'Tools', planner: 'Planner', calendar: 'Calendar', tasks: 'Tasks', assets: 'Assets', projects: 'Projects', accountant: 'Accountant', settings: 'Settings', dashboard: 'Dashboard', account: 'Account', billing: 'Subscription & Billing', logOut: 'Log out' },
    common: { loading: 'Loading…', error: 'Something went wrong.', noData: 'No data yet.', retry: 'Retry', search: 'Search', actions: 'Actions', status: 'Status', date: 'Date', name: 'Name', email: 'Email', phone: 'Phone', total: 'Total', notes: 'Notes' },
    dashboard: { title: 'Dashboard', subtitle: 'Your business at a glance', outstanding: 'Outstanding', leadsWon: 'Leads Won', openQuotes: 'Open Quotes', conversion: 'Conversion', recentHistory: 'Recent History', quickActions: 'Quick Actions', newLead: 'New Lead', newQuote: 'New Quote', newInvoice: 'New Invoice', viewAll: 'View All' },
    leads: { title: 'Leads', subtitle: 'Track and manage your leads', empty: 'No leads yet. Create your first lead to get started.', source: 'Source', value: 'Value', createTitle: 'Create Lead', createSubtitle: 'Enter client and lead details to create a new lead.', leadName: 'Lead Name', leadNamePlaceholder: 'e.g. Kitchen renovation — Mr. Smith', leadStatus: 'Status', leadSource: 'Source', estimateValue: 'Estimated Value', followUpDate: 'Follow-up Date', clientDetails: 'Client Details', clientDetailsHint: 'Optional — link a client contact to this lead.', clientName: 'Client Name', clientNamePlaceholder: 'Full name', clientEmail: 'Email', clientEmailPlaceholder: 'client@example.com', clientPhone: 'Phone', clientPhonePlaceholder: '+44 7700 900000', clientAddress: 'Address', clientAddressPlaceholder: '123 High Street, London', estimateAttached: 'Estimate attached', createLead: 'Create Lead', creating: 'Creating...', backToEstimate: 'Back to Estimate', statusNew: 'New', statusContacted: 'Contacted', statusQuoted: 'Quoted', statusWon: 'Won', statusLost: 'Lost' },
    jobs: { title: 'Jobs', subtitle: 'Active and completed jobs', empty: 'No jobs yet. Jobs appear here once created.', client: 'Client', priority: 'Priority' },
    tasks: { title: 'Tasks', subtitle: 'Your task list', empty: 'No tasks yet. Add tasks to stay organised.', assignee: 'Assignee', dueDate: 'Due Date' },
    assets: { title: 'Assets', subtitle: 'Equipment and tools', empty: 'No assets tracked yet.', type: 'Type', location: 'Location' },
    history: { title: 'History', subtitle: 'Activity log', empty: 'No activity recorded yet.', action: 'Action', entity: 'Entity' },
    subscription: {
      title: 'Subscription & Billing',
      subtitle: 'Manage your plan, subscription status, and billing details.',
      backToSettings: 'Back to Settings',
      planSummary: 'Plan summary',
      planSummaryDesc: 'Proof-based from your current workspace billing container.',
      currentPlan: 'Current plan',
      statusLabel: 'Status',
      workspace: 'Workspace',
      nextBillingDate: 'Next billing date',
      basedOnPeriodEnd: 'Based on current_period_end',
      billingLinks: 'Billing links',
      customer: 'Customer',
      subscriptionLink: 'Subscription',
      returnedFromBilling: 'Returned from billing.',
      returnedFromBillingDesc: 'If you made changes in Stripe, they\'ll appear here shortly.',
      dismiss: 'Dismiss',
      finalising: 'Finalising your subscription… Please wait while we confirm billing.',
      loadingBilling: 'Loading billing details…',
      noWorkspace: 'No active workspace found for this account. Billing is workspace-scoped, so there is nothing to manage yet.',
      plansTitle: 'Plans',
      plansSubtitle: 'Billing actions are owner-only and handled via Supabase Edge Functions.',
      openBillingPortal: 'Open billing portal',
      openingBillingPortal: 'Opening billing portal…',
      cancelSubscription: 'Cancel subscription',
      openingCancellation: 'Opening cancellation…',
      deleteAccount: 'Delete account',
      deleting: 'Deleting…',
      promoTitle: 'Have a promo code?',
      promoSubtitle: 'Apply a discount even if you\'ve been subscribed for months. Owner-only.',
      promoPlaceholder: 'Enter promo code',
      applyCode: 'Apply code',
      applying: 'Applying…',
      plans: {
        free: { name: 'Free', subtitle: '1 user', features: ['Basic tools & app access', 'TISSCA watermark on PDFs', 'Limited exports & automation'], note: 'Upgrade to unlock subscriptions and billing management.' },
        pro: { name: 'Pro', subtitle: '1 user', features: ['Unlimited leads & jobs', 'PDF exports (quotes & invoices)', 'No watermark + branding support'], cta: 'Upgrade to Pro', ctaCurrent: 'You are on Pro', ctaFinalising: 'Finalising…', note: 'Owner-only billing. Workspace-scoped plan.' },
        teamStarter: { name: 'Team Starter', subtitle: 'Up to 5 users', features: ['Multi-user workspace access', 'Roles & permissions', 'Everything in Pro'], cta: 'Upgrade to Team Starter', ctaCurrent: 'You are on Team Starter', ctaFinalising: 'Finalising…', note: 'Best for small teams. Up to 5 members.' },
        teamPro: { name: 'Team Pro', subtitle: 'Up to 200 users', features: ['Everything in Team Starter', 'Audit trail + approvals', 'Priority support + SLA'], cta: 'Upgrade to Team Pro', ctaCurrent: 'You are on Team Pro', ctaFinalising: 'Finalising…', note: 'Best for larger teams. Up to 200 members.' },
      },
      current: 'Current',
      startingCheckout: 'Starting checkout…',
      confirmCancel: {
        title: 'Cancel subscription',
        description: 'You\'ll be taken to Stripe to cancel. If you cancel, you\'ll lose Pro/Team benefits such as:',
        benefits: ['Unlimited leads & jobs', 'PDF exports (quotes & invoices) without watermark', 'Branding & premium workflow features'],
        note: 'You can always re-activate later, but access may change immediately depending on your plan status.',
        keep: 'Keep subscription',
        proceed: 'Continue to cancellation',
      },
      confirmDelete: {
        title: 'Delete account',
        description: 'This is permanent. Your account will be deleted and you may lose access to:',
        losses: ['Workspaces and access to member areas', 'Quotes, invoices, and saved history (where applicable)', 'Support threads and future upgrades'],
        note: 'If you only want to stop billing, cancel your subscription instead.',
        keep: 'Keep account',
        proceed: 'Delete permanently',
      },
      errors: {
        supabaseUnavailable: 'Supabase client unavailable.',
        notSignedIn: 'You are not signed in.',
        loadFailed: 'Failed to load billing details.',
        noWorkspace: 'No active workspace found. Billing is workspace-scoped.',
        unknownTier: 'Unknown plan tier.',
        checkoutFailed: 'Checkout failed. Please try again.',
        invalidCheckoutUrl: 'Checkout returned an invalid response. Please try again.',
        portalFailed: 'Billing portal failed. Please try again.',
        invalidPortalUrl: 'Portal returned an invalid URL.',
        cancelFailed: 'Unable to open billing portal.',
        noPaidSubscription: 'No active paid subscription to cancel.',
        enterPromoCode: 'Enter a promo code.',
        promoFailed: 'Unable to apply promo code. Please try again.',
        deleteFailed: 'Unable to delete account.',
      },
      status: {
        active: 'Active',
        trial: 'Trial',
        pastDue: 'Past due',
        cancelled: 'Cancelled',
        inactive: 'Inactive',
      },
    },
    settings: {
      profile: 'Profile',
      name: 'Name',
      emailAddress: 'Email address',
      mobileNumber: 'Mobile number',
      businessAddress: 'Business address',
      businessPhone: 'Business phone',
      business: 'Business',
      workspace: 'Workspace',
      vatDetails: 'VAT details',
      invoiceDefaults: 'Invoice defaults',
      notifications: 'Notifications',
      emailAlerts: 'Email alerts',
      paymentReminders: 'Payment reminders',
      taskReminders: 'Task reminders',
      billingTitle: 'Billing & Subscription',
      billingSubtitle: 'Manage your plan and subscription options.',
      subscriptionBilling: 'Subscription & billing',
      manageSubscription: 'Manage subscription',
      currentPlan: 'Current plan',
      emailPreferences: {
        title: 'Email Preferences',
        subtitle: 'Control which emails you receive from TISSCA.',
        manage: 'Manage',
        backToSettings: 'Back to Settings',
        categories: 'Email Categories',
        categoriesDesc: 'Choose which types of emails you want to receive.',
        productUpdates: 'Product Updates',
        productUpdatesDesc: 'News about new features and improvements.',
        featureEmails: 'Feature Tips',
        featureEmailsDesc: 'Tips on features you haven\'t tried yet.',
        upgradeEmails: 'Upgrade Suggestions',
        upgradeEmailsDesc: 'Recommendations based on your usage.',
        billingEmails: 'Billing Notifications',
        billingEmailsDesc: 'Payment confirmations and billing updates.',
        reminderEmails: 'Reminders',
        reminderEmailsDesc: 'Task and deadline reminders.',
        supportFollowup: 'Support Follow-ups',
        supportFollowupDesc: 'Responses to your support requests.',
        weeklySummary: 'Weekly Summary',
        weeklySummaryDesc: 'A weekly overview of your workspace activity.',
        unsubscribeAll: 'Unsubscribe from All',
        unsubscribeAllDesc: 'Turn off all non-essential emails. Essential account notifications will still be sent.',
        frequencyTitle: 'Email Frequency',
        frequencyDesc: 'How often should we batch non-urgent emails?',
        frequencies: { immediate: 'Immediate', daily: 'Daily Digest', weekly: 'Weekly Digest' },
        essentialNotice: 'Essential account notifications (password resets, security alerts) are always sent regardless of your preferences.',
        saveSuccess: 'Email preferences saved successfully.',
        saveError: 'Failed to save preferences. Please try again.',
      },
      personalDetails: {
        title: 'Personal Details',
        subtitle: 'Manage your name, date of birth, phone number, and address.',
        manage: 'Manage',
        backToSettings: 'Back to Settings',
        fullName: 'Full name',
        dateOfBirth: 'Date of birth',
        phone: 'Phone number',
        address: 'Address',
        saveSuccess: 'Personal details saved successfully.',
        saveError: 'Failed to save. Please try again.',
        save: 'Save',
        saving: 'Saving…',
      },
      security: {
        title: 'Security',
        subtitle: 'Manage your account email, password, and security settings.',
        manage: 'Manage',
        backToSettings: 'Back to Settings',
        accountEmail: 'Account Email',
        accountEmailDesc: 'The email address associated with your account.',
        currentEmail: 'Current email',
        newEmail: 'New email address',
        updateEmail: 'Update email',
        updatingEmail: 'Updating…',
        emailUpdateSuccess: 'Verification email sent to your new address. Please check your inbox.',
        emailUpdateVerify: 'You will need to verify your new email before the change takes effect.',
        passwordManagement: 'Password',
        passwordManagementDesc: 'Update your account password.',
        currentPassword: 'Current password',
        newPassword: 'New password',
        confirmPassword: 'Confirm new password',
        updatePassword: 'Update password',
        updatingPassword: 'Updating…',
        passwordUpdateSuccess: 'Password updated successfully.',
        passwordMismatch: 'Passwords do not match.',
        passwordTooShort: 'Password must be at least 8 characters.',
        forgotPassword: 'Forgot Password',
        forgotPasswordDesc: 'Send a password reset link to your account email.',
        sendResetEmail: 'Send reset email',
        sendingResetEmail: 'Sending…',
        resetEmailSent: 'Password reset email sent. Check your inbox.',
        resetEmailError: 'Failed to send reset email. Please try again.',
      },
    },
    feedback: {
      title: 'Help & Feedback',
      tooltip: 'Help & Feedback',
      tabs: { help: '🤔 Help', issue: '🐛 Issue', suggestion: '💡 Improve', review: '⭐ Review' },
      stepOf: 'Step {step} of {total}',
      headlinePlaceholder: 'Brief headline (required)',
      descriptionPlaceholder: 'Tell us more... (required)',
      emailPlaceholder: 'Email (optional - if you\'d like a response)',
      back: '← Back',
      close: 'Close',
      next: 'Next →',
      submit: '✓ Submit',
      submitting: 'Submitting...',
      thankYou: 'Thank You!',
      thankYouMessage: 'Your feedback has been received and will help us improve TISSCA.',
      contactNote: 'We\'ll contact you at {email} if you need a response.',
      questions: {
        help: ['What are you trying to do?', 'Which part of TISSCA are you using?', 'Can you describe what happened?'],
        issue: ['What went wrong?', 'Which part of TISSCA?', 'Can you describe the issue in detail?', 'What did you expect to happen?'],
        suggestion: ['What would you like to see improved?', 'Which area would you like us to focus on?', 'How would this improvement help you?'],
        review: ['What\'s your overall experience?', 'What\'s working well?', 'What could we improve?'],
      },
      labels: {
        whatDoing: 'What are you trying to do?',
        whichArea: 'Which part of TISSCA are you using?',
        selectArea: 'Select an area',
        blocked: 'Are you blocked right now?',
        blockedYes: 'Yes, I\'m stuck',
        blockedNo: 'No, just asking',
        extraDetail: 'Extra detail (optional)',
        issueTitle: 'What\'s the issue?',
        affectedArea: 'Which area is affected?',
        describeIssue: 'Describe the problem',
        expectedBehaviour: 'What did you expect to happen? (optional)',
        improveTitle: 'What would you like to improve?',
        yourSuggestion: 'Describe your suggestion',
        expectedBenefit: 'How would this help you? (optional)',
        rateExperience: 'How would you rate your experience?',
        reviewTitle: 'Title (optional)',
        reviewComments: 'Any comments? (optional)',
        optional: 'optional',
        browseFaq: 'Browse FAQ & help articles',
      },
      areas: {
        homepage: 'Homepage',
        pricing: 'Pricing',
        download: 'Download',
        signin: 'Sign in / Account',
        memberApp: 'Member app',
        quotesInvoices: 'Quotes / Invoices',
        leadsJobs: 'Leads / Jobs',
        billing: 'Billing / Subscription',
        settings: 'Settings',
        support: 'Support / Help centre',
        other: 'Other',
      },
    },
    cancelReasons: {
      title: 'Before you go…',
      subtitle: 'Help us improve — please select at least one reason.',
      reasons: {
        tooExpensive: 'Too expensive per month',
        notEnoughValue: 'Not enough value for money',
        cantAfford: 'I can\'t afford it right now',
        missingFeatures: 'Missing features I need',
        tooComplicated: 'Too complicated / hard to use',
        switchingProvider: 'Switching to another tool',
        temporaryPause: 'Temporary pause',
        other: 'Other',
      },
      otherPlaceholder: 'Tell us more…',
      requiredMessage: 'Please select at least one reason to continue.',
      otherRequired: 'Please describe your reason.',
      continueCancel: 'Continue to cancellation',
      goBack: 'Go back',
    },
    tools: {
      title: 'General Estimate',
      editTitle: 'Edit Estimate',
      subtitle: 'Quick quote tool — add items, adjust, and attach to a lead or job.',
      editSubtitle: 'Editing an existing estimate — changes will update the attachment.',
      projectName: 'Project / Client Name',
      lineItems: 'Line Items',
      addItem: 'Add Item',
      description: 'Description',
      subtotal: 'Subtotal',
      adjustments: 'Adjustments',
      discount: 'Discount',
      vat: 'VAT',
      depositPaid: 'Deposit Paid',
      notes: 'Notes',
      notesPlaceholder: 'Any additional notes, terms, or conditions...',
      summary: 'Summary',
      total: 'Total',
      balanceDue: 'Balance due',
      hideBreakdown: 'Hide breakdown',
      viewBreakdown: 'View generated breakdown',
      generateLead: 'Generate Lead',
      addToLead: 'Add to Lead',
      addToJob: 'Add to Job',
      clear: 'Clear',
      backToTools: 'Back to Tools',
      updateEstimate: 'Update Estimate',
      newEstimate: 'New Estimate',
      working: 'Working...',
      saving: 'Saving...',
      generatedBreakdown: 'Generated Breakdown',
      selectLead: 'Select a Lead',
      selectJob: 'Select a Job',
      cancel: 'Cancel',
      attach: 'Attach',
      searchLeads: 'Search leads...',
      searchJobs: 'Search jobs...',
      noLeadsFound: 'No leads found. Create a new lead first.',
      noJobsFound: 'No jobs found. Create a job first.',
      successLeadTitle: 'Lead Generated',
      successLeadDesc: 'Your estimate has been saved as a new lead with the full breakdown attached.',
      successAttachLead: 'Estimate Attached to Lead',
      successAttachJob: 'Estimate Attached to Job',
      successUpdate: 'Estimate Updated',
      viewInLeads: 'View in Leads',
      viewInJobs: 'View in Jobs',
      draftRestored: 'Draft restored',
      editing: 'Editing',
      discardNew: 'Discard & Start New',
      back: '← Back',
      workspaceNote: 'Set up your workspace in Settings to enable lead generation. You can still build estimates without a workspace.',
      removeItem: 'Remove item',
    },
  },
};

const pt: TranslationStrings = {
  nav: {
    features: 'Funcionalidades',
    pricing: 'Preços',
    download: 'Download',
    login: 'Entrar',
    getStarted: 'Começar',
    openApp: 'Abrir App',
  },
  hero: {
    title: 'Gerir o seu negócio',
    titleAccent: 'com TISSCA',
    subtitle: 'Orçamentos, trabalhos, ferramentas, equipas e fluxo de trabalho — tudo numa plataforma para profissionais da construção.',
    ctaPrimary: 'Abrir App',
    ctaSecondary: 'Descarregar App',
    viewPlans: 'Ver Planos →',
  },
  trust: {
    items: ['Feito para profissionais', 'De individual a equipa', 'Ferramentas + fluxo num só lugar', 'Acesso web e móvel'],
  },
  features: {
    heading: 'Tudo o que precisa para gerir o seu negócio',
    subheading: 'Uma plataforma. Todas as ferramentas. Do primeiro contacto à fatura final.',
    cards: [
      { title: 'Contactos e Trabalhos', description: 'Acompanhe trabalhos desde o primeiro contacto até à conclusão. Nunca perca um cliente.' },
      { title: 'Orçamentos e Faturas', description: 'Crie documentos profissionais em minutos. Envie, acompanhe e receba mais rápido.' },
      { title: 'Ferramentas Integradas', description: 'Calculadoras profissionais e ferramentas integradas na plataforma.' },
      { title: 'Espaço de Equipa', description: 'Gerir membros, funções e fluxos partilhados. Colaborar sem caos.' },
      { title: 'Recursos e Organização', description: 'Mantenha trabalho, registos e operações organizados num só lugar.' },
      { title: 'Crescimento do Negócio', description: 'Mantenha-se profissional e cresça — de trabalho individual a equipa completa.' },
    ],
  },
  whyTissca: {
    heading: 'Um único lugar para gerir tudo',
    description: 'O TISSCA substitui as folhas de cálculo, blocos de notas e aplicações dispersas que usa hoje. Gerir contactos, criar orçamentos profissionais, enviar faturas, organizar a equipa — tudo numa plataforma pensada para profissionais da construção.',
    benefits: [
      { title: 'Pare de saltar entre ferramentas', description: 'Tudo numa plataforma — sem mais folhas de cálculo, blocos de notas e apps dispersas.' },
      { title: 'Apresente um negócio mais profissional', description: 'Orçamentos com marca, faturas limpas e comunicação organizada com clientes.' },
      { title: 'Mantenha-se organizado', description: 'Do primeiro contacto à fatura final — cada trabalho acompanhado, nada perdido.' },
      { title: 'Cresça de individual a equipa', description: 'Comece grátis, adicione membros quando estiver pronto. A plataforma cresce consigo.' },
    ],
  },
  plans: {
    heading: 'Planos que crescem consigo',
    subheading: 'Comece grátis. Atualize quando estiver pronto. Sem pressão.',
    enterprise: 'Precisa de mais de 200 membros?',
    contactUs: 'Contacte-nos',
  },
  download: {
    heading: 'Leve o TISSCA para onde trabalhar',
    subheading: 'Use o TISSCA em movimento, em obra ou no escritório.',
    googlePlay: 'Google Play',
    appStore: 'App Store',
    web: 'Web',
  },
  cta: {
    heading: 'Pronto para gerir o seu negócio com TISSCA?',
    subheading: 'Junte-se aos profissionais da construção que já usam a plataforma.',
    primary: 'Abrir App',
    secondary: 'Descarregar App',
  },
  footer: {
    product: 'Produto',
    resources: 'Recursos',
    company: 'Empresa',
    login: 'Entrar',
    openApp: 'Abrir App',
  },
  cookie: {
    message: 'Usamos cookies para manter a sua sessão e melhorar a experiência.',
    privacyLink: 'Política de privacidade',
    acceptAll: 'Aceitar todos',
    essentialOnly: 'Apenas essenciais',
  },
  about: {
    title: 'Sobre o TISSCA',
    description: 'A plataforma criada para profissionais da construção.',
    whatIs: {
      heading: 'O que é o TISSCA?',
      p1: 'O TISSCA é uma plataforma completa para profissionais da construção e empresas. Reúne as ferramentas necessárias para gerir trabalho, operações, administração e crescer o negócio — tudo num só lugar.',
      p2: 'Quer seja um trabalhador independente a gerir orçamentos e faturas, ou uma equipa de 200 a coordenar trabalhos, o TISSCA dá-lhe a estrutura e ferramentas para trabalhar melhor.',
    },
    whatDoes: {
      heading: 'O que o TISSCA faz',
      items: [
        'Criar e enviar orçamentos e faturas profissionais em minutos',
        'Acompanhar contactos, trabalhos e clientes do início ao fim',
        'Aceder a calculadoras e ferramentas profissionais integradas',
        'Gerir equipa, funções e fluxos de trabalho partilhados',
        'Manter registos e recursos do negócio organizados e acessíveis',
        'Usar o TISSCA na web, Android ou iOS — onde quer que trabalhe',
      ],
    },
    whoFor: {
      heading: 'Para quem é',
      text: 'Profissionais individuais. Equipas em crescimento. Empresas de construção estabelecidas. O TISSCA escala consigo — comece grátis e atualize quando estiver pronto. Sem pressão.',
    },
    approach: {
      heading: 'A nossa abordagem',
      items: [
        'Feito para o sector — desenhado para como os profissionais realmente trabalham',
        'Simples e estruturado — sem confusão, sem complexidade desnecessária',
        'Uma plataforma — substituir folhas de cálculo, blocos e apps dispersas',
        'Escalável — de trabalho individual a equipa de 200+',
      ],
    },
    contact: {
      heading: 'Entre em contacto',
      text: 'Tem alguma questão ou sugestão? Contacte-nos em support@tissca.com ou visite a nossa página de contacto.',
    },
  },
  contact: {
    title: 'Contacte-nos',
    description: 'Tem uma pergunta, sugestão ou precisa de ajuda? Gostaríamos de ouvi-lo.',
    form: {
      name: 'Nome',
      email: 'Email',
      message: 'Mensagem',
      namePlaceholder: 'O seu nome',
      emailPlaceholder: 'voce@exemplo.com',
      messagePlaceholder: 'Como podemos ajudar?',
      submit: 'Enviar Mensagem',
      sending: 'A enviar…',
      sentTitle: 'Mensagem enviada',
      sentMessage: 'Obrigado pelo contacto. Responderemos em breve.',
      sendAnother: 'Enviar outra mensagem',
      error: 'Algo correu mal. Tente novamente ou envie-nos um email diretamente.',
    },
    sidebar: {
      emailLabel: 'Email',
      responseLabel: 'Tempo de resposta',
      responseText: 'Procuramos responder em 1–2 dias úteis.',
      helpLabel: 'Precisa de ajuda?',
      helpText: 'Consulte as funcionalidades na página inicial ou reveja os nossos planos.',
    },
  },
  member: {
    nav: { overview: 'Visão Geral', leads: 'Contactos', jobs: 'Trabalhos', quotes: 'Orçamentos', invoices: 'Faturas', history: 'Histórico', chat: 'TissChat', tools: 'Ferramentas', planner: 'Planeador', calendar: 'Calendário', tasks: 'Tarefas', assets: 'Ativos', projects: 'Projetos', accountant: 'Contabilista', settings: 'Definições', dashboard: 'Painel', account: 'Conta', billing: 'Subscrição e Faturação', logOut: 'Terminar sessão' },
    common: { loading: 'A carregar…', error: 'Algo correu mal.', noData: 'Sem dados ainda.', retry: 'Tentar novamente', search: 'Pesquisar', actions: 'Ações', status: 'Estado', date: 'Data', name: 'Nome', email: 'Email', phone: 'Telefone', total: 'Total', notes: 'Notas' },
    dashboard: { title: 'Painel', subtitle: 'O seu negócio num relance', outstanding: 'Pendente', leadsWon: 'Contactos Ganhos', openQuotes: 'Orçamentos Abertos', conversion: 'Conversão', recentHistory: 'Histórico Recente', quickActions: 'Ações Rápidas', newLead: 'Novo Contacto', newQuote: 'Novo Orçamento', newInvoice: 'Nova Fatura', viewAll: 'Ver Tudo' },
    leads: { title: 'Contactos', subtitle: 'Gerir os seus contactos', empty: 'Sem contactos ainda. Crie o primeiro para começar.', source: 'Origem', value: 'Valor', createTitle: 'Criar Contacto', createSubtitle: 'Preencha os dados do cliente e do contacto para criar um novo.', leadName: 'Nome do Contacto', leadNamePlaceholder: 'ex. Renovação de cozinha — Sr. Silva', leadStatus: 'Estado', leadSource: 'Origem', estimateValue: 'Valor Estimado', followUpDate: 'Data de Seguimento', clientDetails: 'Dados do Cliente', clientDetailsHint: 'Opcional — associe um contacto de cliente a este lead.', clientName: 'Nome do Cliente', clientNamePlaceholder: 'Nome completo', clientEmail: 'Email', clientEmailPlaceholder: 'cliente@exemplo.pt', clientPhone: 'Telefone', clientPhonePlaceholder: '+351 912 345 678', clientAddress: 'Morada', clientAddressPlaceholder: 'Rua Principal 123, Lisboa', estimateAttached: 'Orçamento anexado', createLead: 'Criar Contacto', creating: 'A criar...', backToEstimate: 'Voltar ao Orçamento', statusNew: 'Novo', statusContacted: 'Contactado', statusQuoted: 'Orçamentado', statusWon: 'Ganho', statusLost: 'Perdido' },
    jobs: { title: 'Trabalhos', subtitle: 'Trabalhos ativos e concluídos', empty: 'Sem trabalhos ainda. Aparecem aqui quando criados.', client: 'Cliente', priority: 'Prioridade' },
    tasks: { title: 'Tarefas', subtitle: 'A sua lista de tarefas', empty: 'Sem tarefas ainda. Adicione tarefas para se organizar.', assignee: 'Responsável', dueDate: 'Data Limite' },
    assets: { title: 'Ativos', subtitle: 'Equipamentos e ferramentas', empty: 'Sem ativos registados ainda.', type: 'Tipo', location: 'Localização' },
    history: { title: 'Histórico', subtitle: 'Registo de atividade', empty: 'Sem atividade registada ainda.', action: 'Ação', entity: 'Entidade' },
    subscription: {
      title: 'Subscrição e Faturação',
      subtitle: 'Gerir o seu plano, estado da subscrição e detalhes de faturação.',
      backToSettings: 'Voltar às Definições',
      planSummary: 'Resumo do plano',
      planSummaryDesc: 'Baseado nos dados reais do seu espaço de trabalho.',
      currentPlan: 'Plano atual',
      statusLabel: 'Estado',
      workspace: 'Espaço de trabalho',
      nextBillingDate: 'Próxima data de faturação',
      basedOnPeriodEnd: 'Baseado em current_period_end',
      billingLinks: 'Ligações de faturação',
      customer: 'Cliente',
      subscriptionLink: 'Subscrição',
      returnedFromBilling: 'Voltou da faturação.',
      returnedFromBillingDesc: 'Se fez alterações no Stripe, aparecerão aqui em breve.',
      dismiss: 'Dispensar',
      finalising: 'A finalizar a sua subscrição… Aguarde enquanto confirmamos a faturação.',
      loadingBilling: 'A carregar detalhes de faturação…',
      noWorkspace: 'Nenhum espaço de trabalho ativo encontrado para esta conta. A faturação é por espaço de trabalho, portanto não há nada para gerir ainda.',
      plansTitle: 'Planos',
      plansSubtitle: 'Ações de faturação são exclusivas do proprietário e geridas via Edge Functions.',
      openBillingPortal: 'Abrir portal de faturação',
      openingBillingPortal: 'A abrir portal de faturação…',
      cancelSubscription: 'Cancelar subscrição',
      openingCancellation: 'A abrir cancelamento…',
      deleteAccount: 'Eliminar conta',
      deleting: 'A eliminar…',
      promoTitle: 'Tem um código promocional?',
      promoSubtitle: 'Aplique um desconto mesmo que já esteja subscrito há meses. Apenas proprietário.',
      promoPlaceholder: 'Introduza o código promocional',
      applyCode: 'Aplicar código',
      applying: 'A aplicar…',
      plans: {
        free: { name: 'Grátis', subtitle: '1 utilizador', features: ['Ferramentas básicas e acesso à app', 'Marca de água TISSCA nos PDFs', 'Exportações e automação limitadas'], note: 'Atualize para desbloquear subscrições e gestão de faturação.' },
        pro: { name: 'Pro', subtitle: '1 utilizador', features: ['Contactos e trabalhos ilimitados', 'Exportação PDF (orçamentos e faturas)', 'Sem marca de água + suporte de marca'], cta: 'Atualizar para Pro', ctaCurrent: 'Está no plano Pro', ctaFinalising: 'A finalizar…', note: 'Faturação exclusiva do proprietário. Plano por espaço de trabalho.' },
        teamStarter: { name: 'Team Starter', subtitle: 'Até 5 utilizadores', features: ['Acesso multi-utilizador ao espaço de trabalho', 'Funções e permissões', 'Tudo incluído no Pro'], cta: 'Atualizar para Team Starter', ctaCurrent: 'Está no plano Team Starter', ctaFinalising: 'A finalizar…', note: 'Ideal para equipas pequenas. Até 5 membros.' },
        teamPro: { name: 'Team Pro', subtitle: 'Até 200 utilizadores', features: ['Tudo incluído no Team Starter', 'Registo de auditoria + aprovações', 'Suporte prioritário + SLA'], cta: 'Atualizar para Team Pro', ctaCurrent: 'Está no plano Team Pro', ctaFinalising: 'A finalizar…', note: 'Ideal para equipas maiores. Até 200 membros.' },
      },
      current: 'Atual',
      startingCheckout: 'A iniciar checkout…',
      confirmCancel: {
        title: 'Cancelar subscrição',
        description: 'Será redirecionado para o Stripe para cancelar. Se cancelar, perderá benefícios Pro/Team como:',
        benefits: ['Contactos e trabalhos ilimitados', 'Exportação PDF (orçamentos e faturas) sem marca de água', 'Marca e funcionalidades premium de fluxo de trabalho'],
        note: 'Pode sempre reativar mais tarde, mas o acesso pode mudar imediatamente dependendo do estado do plano.',
        keep: 'Manter subscrição',
        proceed: 'Continuar para cancelamento',
      },
      confirmDelete: {
        title: 'Eliminar conta',
        description: 'Esta ação é permanente. A sua conta será eliminada e poderá perder acesso a:',
        losses: ['Espaços de trabalho e acesso a áreas de membros', 'Orçamentos, faturas e histórico guardado (quando aplicável)', 'Threads de suporte e atualizações futuras'],
        note: 'Se apenas quer parar a faturação, cancele a subscrição.',
        keep: 'Manter conta',
        proceed: 'Eliminar permanentemente',
      },
      errors: {
        supabaseUnavailable: 'Cliente Supabase indisponível.',
        notSignedIn: 'Não está autenticado.',
        loadFailed: 'Falha ao carregar detalhes de faturação.',
        noWorkspace: 'Nenhum espaço de trabalho ativo encontrado. A faturação é por espaço de trabalho.',
        unknownTier: 'Plano desconhecido.',
        checkoutFailed: 'Falha no checkout. Tente novamente.',
        invalidCheckoutUrl: 'O checkout devolveu uma resposta inválida. Tente novamente.',
        portalFailed: 'Falha no portal de faturação. Tente novamente.',
        invalidPortalUrl: 'O portal devolveu um URL inválido.',
        cancelFailed: 'Não foi possível abrir o portal de faturação.',
        noPaidSubscription: 'Nenhuma subscrição paga ativa para cancelar.',
        enterPromoCode: 'Introduza um código promocional.',
        promoFailed: 'Não foi possível aplicar o código promocional. Tente novamente.',
        deleteFailed: 'Não foi possível eliminar a conta.',
      },
      status: {
        active: 'Ativo',
        trial: 'Teste',
        pastDue: 'Em atraso',
        cancelled: 'Cancelado',
        inactive: 'Inativo',
      },
    },
    settings: {
      profile: 'Perfil',
      name: 'Nome',
      emailAddress: 'Endereço de email',
      mobileNumber: 'Número de telemóvel',
      businessAddress: 'Morada do negócio',
      businessPhone: 'Telefone do negócio',
      business: 'Negócio',
      workspace: 'Espaço de trabalho',
      vatDetails: 'Dados de IVA',
      invoiceDefaults: 'Predefinições de fatura',
      notifications: 'Notificações',
      emailAlerts: 'Alertas por email',
      paymentReminders: 'Lembretes de pagamento',
      taskReminders: 'Lembretes de tarefas',
      billingTitle: 'Faturação e Subscrição',
      billingSubtitle: 'Gerir o seu plano e opções de subscrição.',
      subscriptionBilling: 'Subscrição e faturação',
      manageSubscription: 'Gerir subscrição',
      currentPlan: 'Plano atual',
      emailPreferences: {
        title: 'Preferências de Email',
        subtitle: 'Controle quais emails recebe da TISSCA.',
        manage: 'Gerir',
        backToSettings: 'Voltar às Definições',
        categories: 'Categorias de Email',
        categoriesDesc: 'Escolha os tipos de emails que deseja receber.',
        productUpdates: 'Atualizações do Produto',
        productUpdatesDesc: 'Novidades sobre funcionalidades e melhorias.',
        featureEmails: 'Dicas de Funcionalidades',
        featureEmailsDesc: 'Dicas sobre funcionalidades que ainda não experimentou.',
        upgradeEmails: 'Sugestões de Upgrade',
        upgradeEmailsDesc: 'Recomendações baseadas na sua utilização.',
        billingEmails: 'Notificações de Faturação',
        billingEmailsDesc: 'Confirmações de pagamento e atualizações de faturação.',
        reminderEmails: 'Lembretes',
        reminderEmailsDesc: 'Lembretes de tarefas e prazos.',
        supportFollowup: 'Respostas de Suporte',
        supportFollowupDesc: 'Respostas aos seus pedidos de suporte.',
        weeklySummary: 'Resumo Semanal',
        weeklySummaryDesc: 'Resumo semanal da atividade do seu workspace.',
        unsubscribeAll: 'Cancelar Todas as Subscrições',
        unsubscribeAllDesc: 'Desativar todos os emails não essenciais. Notificações essenciais continuarão a ser enviadas.',
        frequencyTitle: 'Frequência de Email',
        frequencyDesc: 'Com que frequência devemos agrupar emails não urgentes?',
        frequencies: { immediate: 'Imediato', daily: 'Resumo Diário', weekly: 'Resumo Semanal' },
        essentialNotice: 'Notificações essenciais (redefinição de senha, alertas de segurança) são sempre enviadas independentemente das suas preferências.',
        saveSuccess: 'Preferências de email guardadas com sucesso.',
        saveError: 'Falha ao guardar preferências. Tente novamente.',
      },
      personalDetails: {
        title: 'Dados Pessoais',
        subtitle: 'Gerir o seu nome, data de nascimento, número de telefone e morada.',
        manage: 'Gerir',
        backToSettings: 'Voltar às Definições',
        fullName: 'Nome completo',
        dateOfBirth: 'Data de nascimento',
        phone: 'Número de telefone',
        address: 'Morada',
        saveSuccess: 'Dados pessoais guardados com sucesso.',
        saveError: 'Falha ao guardar. Tente novamente.',
        save: 'Guardar',
        saving: 'A guardar…',
      },
      security: {
        title: 'Segurança',
        subtitle: 'Gerir o email da conta, palavra-passe e definições de segurança.',
        manage: 'Gerir',
        backToSettings: 'Voltar às Definições',
        accountEmail: 'Email da Conta',
        accountEmailDesc: 'O endereço de email associado à sua conta.',
        currentEmail: 'Email atual',
        newEmail: 'Novo endereço de email',
        updateEmail: 'Atualizar email',
        updatingEmail: 'A atualizar…',
        emailUpdateSuccess: 'Email de verificação enviado para o novo endereço. Verifique a sua caixa de entrada.',
        emailUpdateVerify: 'Terá de verificar o novo email antes da alteração entrar em vigor.',
        passwordManagement: 'Palavra-passe',
        passwordManagementDesc: 'Atualizar a palavra-passe da sua conta.',
        currentPassword: 'Palavra-passe atual',
        newPassword: 'Nova palavra-passe',
        confirmPassword: 'Confirmar nova palavra-passe',
        updatePassword: 'Atualizar palavra-passe',
        updatingPassword: 'A atualizar…',
        passwordUpdateSuccess: 'Palavra-passe atualizada com sucesso.',
        passwordMismatch: 'As palavras-passe não coincidem.',
        passwordTooShort: 'A palavra-passe deve ter pelo menos 8 caracteres.',
        forgotPassword: 'Esqueci a Palavra-passe',
        forgotPasswordDesc: 'Enviar um link de redefinição para o email da sua conta.',
        sendResetEmail: 'Enviar email de redefinição',
        sendingResetEmail: 'A enviar…',
        resetEmailSent: 'Email de redefinição enviado. Verifique a sua caixa de entrada.',
        resetEmailError: 'Falha ao enviar email de redefinição. Tente novamente.',
      },
    },
    feedback: {
      title: 'Ajuda e Feedback',
      tooltip: 'Ajuda e Feedback',
      tabs: { help: '🤔 Ajuda', issue: '🐛 Problema', suggestion: '💡 Melhorar', review: '⭐ Avaliação' },
      stepOf: 'Passo {step} de {total}',
      headlinePlaceholder: 'Título breve (obrigatório)',
      descriptionPlaceholder: 'Conte-nos mais... (obrigatório)',
      emailPlaceholder: 'Email (opcional — se quiser resposta)',
      back: '← Voltar',
      close: 'Fechar',
      next: 'Seguinte →',
      submit: '✓ Enviar',
      submitting: 'A enviar...',
      thankYou: 'Obrigado!',
      thankYouMessage: 'O seu feedback foi recebido e vai ajudar-nos a melhorar o TISSCA.',
      contactNote: 'Entraremos em contacto através de {email} se precisar de uma resposta.',
      questions: {
        help: ['O que está a tentar fazer?', 'Que parte do TISSCA está a usar?', 'Pode descrever o que aconteceu?'],
        issue: ['O que correu mal?', 'Que parte do TISSCA?', 'Pode descrever o problema em detalhe?', 'O que esperava que acontecesse?'],
        suggestion: ['O que gostaria de ver melhorado?', 'Em que área gostaria que nos focássemos?', 'Como é que esta melhoria o ajudaria?'],
        review: ['Qual é a sua experiência geral?', 'O que está a funcionar bem?', 'O que podemos melhorar?'],
      },
      labels: {
        whatDoing: 'O que está a tentar fazer?',
        whichArea: 'Que parte do TISSCA está a usar?',
        selectArea: 'Selecionar área',
        blocked: 'Está bloqueado neste momento?',
        blockedYes: 'Sim, estou preso',
        blockedNo: 'Não, só a perguntar',
        extraDetail: 'Detalhe adicional (opcional)',
        issueTitle: 'Qual é o problema?',
        affectedArea: 'Que área é afetada?',
        describeIssue: 'Descreva o problema',
        expectedBehaviour: 'O que esperava que acontecesse? (opcional)',
        improveTitle: 'O que gostaria de melhorar?',
        yourSuggestion: 'Descreva a sua sugestão',
        expectedBenefit: 'Como é que isto o ajudaria? (opcional)',
        rateExperience: 'Como avalia a sua experiência?',
        reviewTitle: 'Título (opcional)',
        reviewComments: 'Algum comentário? (opcional)',
        optional: 'opcional',
        browseFaq: 'Ver FAQ e artigos de ajuda',
      },
      areas: {
        homepage: 'Página inicial',
        pricing: 'Preços',
        download: 'Download',
        signin: 'Entrar / Conta',
        memberApp: 'App de membro',
        quotesInvoices: 'Orçamentos / Faturas',
        leadsJobs: 'Contactos / Trabalhos',
        billing: 'Faturação / Subscrição',
        settings: 'Definições',
        support: 'Suporte / Centro de ajuda',
        other: 'Outro',
      },
    },
    cancelReasons: {
      title: 'Antes de ir…',
      subtitle: 'Ajude-nos a melhorar — selecione pelo menos um motivo.',
      reasons: {
        tooExpensive: 'Demasiado caro por mês',
        notEnoughValue: 'Valor insuficiente pelo preço',
        cantAfford: 'Não posso pagar agora',
        missingFeatures: 'Faltam funcionalidades que preciso',
        tooComplicated: 'Demasiado complicado / difícil de usar',
        switchingProvider: 'A mudar para outra ferramenta',
        temporaryPause: 'Pausa temporária',
        other: 'Outro',
      },
      otherPlaceholder: 'Conte-nos mais…',
      requiredMessage: 'Selecione pelo menos um motivo para continuar.',
      otherRequired: 'Descreva o seu motivo.',
      continueCancel: 'Continuar para cancelamento',
      goBack: 'Voltar',
    },
    tools: {
      title: 'Orçamento Geral',
      editTitle: 'Editar Orçamento',
      subtitle: 'Ferramenta de orçamento rápido — adicione itens, ajuste e associe a um contacto ou trabalho.',
      editSubtitle: 'A editar um orçamento existente — as alterações atualizam o anexo.',
      projectName: 'Nome do Projeto / Cliente',
      lineItems: 'Itens',
      addItem: 'Adicionar Item',
      description: 'Descrição',
      subtotal: 'Subtotal',
      adjustments: 'Ajustes',
      discount: 'Desconto',
      vat: 'IVA',
      depositPaid: 'Sinal Pago',
      notes: 'Notas',
      notesPlaceholder: 'Notas adicionais, termos ou condições...',
      summary: 'Resumo',
      total: 'Total',
      balanceDue: 'Saldo em dívida',
      hideBreakdown: 'Ocultar detalhe',
      viewBreakdown: 'Ver detalhe gerado',
      generateLead: 'Gerar Contacto',
      addToLead: 'Adicionar a Contacto',
      addToJob: 'Adicionar a Trabalho',
      clear: 'Limpar',
      backToTools: 'Voltar às Ferramentas',
      updateEstimate: 'Atualizar Orçamento',
      newEstimate: 'Novo Orçamento',
      working: 'A processar...',
      saving: 'A guardar...',
      generatedBreakdown: 'Detalhe Gerado',
      selectLead: 'Selecionar Contacto',
      selectJob: 'Selecionar Trabalho',
      cancel: 'Cancelar',
      attach: 'Anexar',
      searchLeads: 'Pesquisar contactos...',
      searchJobs: 'Pesquisar trabalhos...',
      noLeadsFound: 'Nenhum contacto encontrado. Crie um primeiro.',
      noJobsFound: 'Nenhum trabalho encontrado. Crie um primeiro.',
      successLeadTitle: 'Contacto Gerado',
      successLeadDesc: 'O seu orçamento foi guardado como novo contacto com o detalhe completo em anexo.',
      successAttachLead: 'Orçamento Anexado ao Contacto',
      successAttachJob: 'Orçamento Anexado ao Trabalho',
      successUpdate: 'Orçamento Atualizado',
      viewInLeads: 'Ver Contactos',
      viewInJobs: 'Ver Trabalhos',
      draftRestored: 'Rascunho restaurado',
      editing: 'A editar',
      discardNew: 'Descartar e Começar Novo',
      back: '← Voltar',
      workspaceNote: 'Configure o seu espaço de trabalho em Definições para ativar a geração de contactos. Pode criar orçamentos sem espaço de trabalho.',
      removeItem: 'Remover item',
    },
  },
};

const it: TranslationStrings = {
  nav: {
    features: 'Funzionalità',
    pricing: 'Prezzi',
    download: 'Download',
    login: 'Accedi',
    getStarted: 'Inizia',
    openApp: 'Apri App',
  },
  hero: {
    title: 'Gestisci la tua attività',
    titleAccent: 'con TISSCA',
    subtitle: 'Preventivi, lavori, strumenti, team e flusso di lavoro — tutto in una piattaforma per professionisti edili.',
    ctaPrimary: 'Apri App',
    ctaSecondary: 'Scarica App',
    viewPlans: 'Vedi Piani →',
  },
  trust: {
    items: ['Fatto per professionisti', 'Da singolo a team', 'Strumenti + flusso in un unico posto', 'Accesso web e mobile'],
  },
  features: {
    heading: 'Tutto ciò che serve per gestire la tua attività',
    subheading: 'Una piattaforma. Ogni strumento. Dal primo contatto alla fattura finale.',
    cards: [
      { title: 'Contatti e Lavori', description: 'Segui i lavori dal primo contatto al completamento. Non perdere mai un cliente.' },
      { title: 'Preventivi e Fatture', description: 'Crea documenti professionali in pochi minuti. Invia, traccia e incassa più velocemente.' },
      { title: 'Strumenti Integrati', description: 'Calcolatori professionali e strumenti integrati nella piattaforma.' },
      { title: 'Spazio Team', description: 'Gestisci membri, ruoli e flussi di lavoro condivisi. Collabora senza caos.' },
      { title: 'Risorse e Organizzazione', description: 'Mantieni lavoro, registri e operazioni organizzati in un unico posto.' },
      { title: 'Crescita Aziendale', description: 'Resta professionale e cresci — da singolo operatore a team completo.' },
    ],
  },
  whyTissca: {
    heading: 'Un unico posto per gestire tutto',
    description: 'TISSCA sostituisce fogli di calcolo, appunti e app sparse che usi oggi. Gestisci contatti, crea preventivi professionali, invia fatture, organizza il team — tutto da una piattaforma pensata per i professionisti edili.',
    benefits: [
      { title: 'Smetti di destreggiarti tra strumenti', description: 'Tutto in una piattaforma — basta fogli di calcolo, appunti e app sparse.' },
      { title: 'Presenta un\'attività più professionale', description: 'Preventivi brandizzati, fatture pulite e comunicazioni organizzate.' },
      { title: 'Resta organizzato su lavori e clienti', description: 'Dal primo contatto alla fattura finale — ogni lavoro tracciato, nulla perso.' },
      { title: 'Cresci da singolo a team', description: 'Inizia gratis, aggiungi membri quando sei pronto. La piattaforma cresce con te.' },
    ],
  },
  plans: {
    heading: 'Piani che crescono con te',
    subheading: 'Inizia gratis. Aggiorna quando sei pronto. Senza pressione.',
    enterprise: 'Hai bisogno di più di 200 membri?',
    contactUs: 'Contattaci',
  },
  download: {
    heading: 'Porta TISSCA ovunque lavori',
    subheading: 'Usa TISSCA in movimento, in cantiere o alla scrivania.',
    googlePlay: 'Google Play',
    appStore: 'App Store',
    web: 'Web',
  },
  cta: {
    heading: 'Pronto a gestire la tua attività con TISSCA?',
    subheading: 'Unisciti ai professionisti edili che già usano la piattaforma.',
    primary: 'Apri App',
    secondary: 'Scarica App',
  },
  footer: {
    product: 'Prodotto',
    resources: 'Risorse',
    company: 'Azienda',
    login: 'Accedi',
    openApp: 'Apri App',
  },
  cookie: {
    message: 'Usiamo cookie per mantenere la sessione e migliorare la tua esperienza.',
    privacyLink: 'Privacy policy',
    acceptAll: 'Accetta tutti',
    essentialOnly: 'Solo essenziali',
  },
  about: {
    title: 'Informazioni su TISSCA',
    description: 'La piattaforma creata per professionisti edili e imprese di costruzione.',
    whatIs: {
      heading: 'Cos\'è TISSCA?',
      p1: 'TISSCA è una piattaforma completa per professionisti edili, appaltatori e imprese di costruzione. Riunisce gli strumenti necessari per gestire il lavoro, le operazioni, semplificare l\'amministrazione e far crescere l\'attività — tutto in un unico posto.',
      p2: 'Che tu sia un lavoratore autonomo che gestisce preventivi e fatture, o un team di 200 che coordina lavori su più cantieri, TISSCA ti dà la struttura e gli strumenti per lavorare meglio.',
    },
    whatDoes: {
      heading: 'Cosa fa TISSCA',
      items: [
        'Creare e inviare preventivi e fatture professionali in pochi minuti',
        'Tracciare contatti, lavori e clienti dall\'inizio alla fine',
        'Accedere a calcolatori e strumenti professionali integrati',
        'Gestire team, ruoli e flussi di lavoro condivisi',
        'Mantenere registri e risorse aziendali organizzati e accessibili',
        'Usare TISSCA su web, Android o iOS — ovunque lavori',
      ],
    },
    whoFor: {
      heading: 'Per chi è',
      text: 'Professionisti singoli. Team in crescita. Imprese di costruzione affermate. TISSCA cresce con te — inizia gratis e aggiorna quando sei pronto. Senza pressione.',
    },
    approach: {
      heading: 'Il nostro approccio',
      items: [
        'Fatto per il settore — progettato per come i professionisti lavorano davvero',
        'Semplice e strutturato — niente confusione, niente complessità inutile',
        'Una piattaforma — sostituire fogli di calcolo, appunti e app sparse',
        'Scalabile — da singolo operatore a team di 200+',
      ],
    },
    contact: {
      heading: 'Contattaci',
      text: 'Hai domande o suggerimenti? Scrivici a support@tissca.com o visita la nostra pagina contatti.',
    },
  },
  contact: {
    title: 'Contattaci',
    description: 'Hai una domanda, un suggerimento o hai bisogno di aiuto? Ci piacerebbe sentirti.',
    form: {
      name: 'Nome',
      email: 'Email',
      message: 'Messaggio',
      namePlaceholder: 'Il tuo nome',
      emailPlaceholder: 'tu@esempio.com',
      messagePlaceholder: 'Come possiamo aiutarti?',
      submit: 'Invia Messaggio',
      sending: 'Invio in corso…',
      sentTitle: 'Messaggio inviato',
      sentMessage: 'Grazie per averci contattato. Ti risponderemo presto.',
      sendAnother: 'Invia un altro messaggio',
      error: 'Qualcosa è andato storto. Riprova o scrivici direttamente via email.',
    },
    sidebar: {
      emailLabel: 'Email',
      responseLabel: 'Tempo di risposta',
      responseText: 'Rispondiamo entro 1–2 giorni lavorativi.',
      helpLabel: 'Cerchi aiuto?',
      helpText: 'Consulta le funzionalità nella homepage o i nostri piani.',
    },
  },
  member: {
    nav: { overview: 'Panoramica', leads: 'Contatti', jobs: 'Lavori', quotes: 'Preventivi', invoices: 'Fatture', history: 'Cronologia', chat: 'TissChat', tools: 'Strumenti', planner: 'Pianificatore', calendar: 'Calendario', tasks: 'Attività', assets: 'Risorse', projects: 'Progetti', accountant: 'Commercialista', settings: 'Impostazioni', dashboard: 'Dashboard', account: 'Account', billing: 'Abbonamento e Fatturazione', logOut: 'Esci' },
    common: { loading: 'Caricamento…', error: 'Qualcosa è andato storto.', noData: 'Nessun dato ancora.', retry: 'Riprova', search: 'Cerca', actions: 'Azioni', status: 'Stato', date: 'Data', name: 'Nome', email: 'Email', phone: 'Telefono', total: 'Totale', notes: 'Note' },
    dashboard: { title: 'Dashboard', subtitle: 'Il tuo business a colpo d\'occhio', outstanding: 'In sospeso', leadsWon: 'Contatti Acquisiti', openQuotes: 'Preventivi Aperti', conversion: 'Conversione', recentHistory: 'Cronologia Recente', quickActions: 'Azioni Rapide', newLead: 'Nuovo Contatto', newQuote: 'Nuovo Preventivo', newInvoice: 'Nuova Fattura', viewAll: 'Vedi Tutto' },
    leads: { title: 'Contatti', subtitle: 'Gestisci i tuoi contatti', empty: 'Nessun contatto ancora. Crea il primo per iniziare.', source: 'Origine', value: 'Valore', createTitle: 'Crea Contatto', createSubtitle: 'Inserisci i dati del cliente e del contatto per crearne uno nuovo.', leadName: 'Nome Contatto', leadNamePlaceholder: 'es. Ristrutturazione cucina — Sig. Rossi', leadStatus: 'Stato', leadSource: 'Origine', estimateValue: 'Valore Stimato', followUpDate: 'Data di Follow-up', clientDetails: 'Dati del Cliente', clientDetailsHint: 'Opzionale — collega un contatto cliente a questo lead.', clientName: 'Nome del Cliente', clientNamePlaceholder: 'Nome completo', clientEmail: 'Email', clientEmailPlaceholder: 'cliente@esempio.it', clientPhone: 'Telefono', clientPhonePlaceholder: '+39 333 123 4567', clientAddress: 'Indirizzo', clientAddressPlaceholder: 'Via Roma 123, Milano', estimateAttached: 'Preventivo allegato', createLead: 'Crea Contatto', creating: 'Creazione in corso...', backToEstimate: 'Torna al Preventivo', statusNew: 'Nuovo', statusContacted: 'Contattato', statusQuoted: 'Preventivato', statusWon: 'Vinto', statusLost: 'Perso' },
    jobs: { title: 'Lavori', subtitle: 'Lavori attivi e completati', empty: 'Nessun lavoro ancora. Appaiono qui una volta creati.', client: 'Cliente', priority: 'Priorità' },
    tasks: { title: 'Attività', subtitle: 'La tua lista di attività', empty: 'Nessuna attività ancora. Aggiungi attività per restare organizzato.', assignee: 'Assegnatario', dueDate: 'Scadenza' },
    assets: { title: 'Risorse', subtitle: 'Attrezzature e strumenti', empty: 'Nessuna risorsa tracciata ancora.', type: 'Tipo', location: 'Posizione' },
    history: { title: 'Cronologia', subtitle: 'Registro attività', empty: 'Nessuna attività registrata ancora.', action: 'Azione', entity: 'Entità' },
    subscription: {
      title: 'Abbonamento e Fatturazione',
      subtitle: 'Gestisci il tuo piano, lo stato dell\'abbonamento e i dettagli di fatturazione.',
      backToSettings: 'Torna alle Impostazioni',
      planSummary: 'Riepilogo piano',
      planSummaryDesc: 'Basato sui dati reali del tuo workspace di fatturazione.',
      currentPlan: 'Piano attuale',
      statusLabel: 'Stato',
      workspace: 'Workspace',
      nextBillingDate: 'Prossima data di fatturazione',
      basedOnPeriodEnd: 'Basato su current_period_end',
      billingLinks: 'Link di fatturazione',
      customer: 'Cliente',
      subscriptionLink: 'Abbonamento',
      returnedFromBilling: 'Tornato dalla fatturazione.',
      returnedFromBillingDesc: 'Se hai apportato modifiche in Stripe, appariranno qui a breve.',
      dismiss: 'Chiudi',
      finalising: 'Finalizzazione abbonamento… Attendi la conferma della fatturazione.',
      loadingBilling: 'Caricamento dettagli fatturazione…',
      noWorkspace: 'Nessun workspace attivo trovato per questo account. La fatturazione è per workspace, quindi non c\'è nulla da gestire.',
      plansTitle: 'Piani',
      plansSubtitle: 'Le azioni di fatturazione sono riservate al proprietario e gestite tramite Edge Functions.',
      openBillingPortal: 'Apri portale fatturazione',
      openingBillingPortal: 'Apertura portale fatturazione…',
      cancelSubscription: 'Cancella abbonamento',
      openingCancellation: 'Apertura cancellazione…',
      deleteAccount: 'Elimina account',
      deleting: 'Eliminazione…',
      promoTitle: 'Hai un codice promozionale?',
      promoSubtitle: 'Applica uno sconto anche se sei abbonato da mesi. Solo proprietario.',
      promoPlaceholder: 'Inserisci codice promozionale',
      applyCode: 'Applica codice',
      applying: 'Applicazione…',
      plans: {
        free: { name: 'Gratuito', subtitle: '1 utente', features: ['Strumenti base e accesso all\'app', 'Filigrana TISSCA sui PDF', 'Esportazioni e automazione limitate'], note: 'Aggiorna per sbloccare abbonamenti e gestione fatturazione.' },
        pro: { name: 'Pro', subtitle: '1 utente', features: ['Contatti e lavori illimitati', 'Esportazione PDF (preventivi e fatture)', 'Nessuna filigrana + supporto brand'], cta: 'Aggiorna a Pro', ctaCurrent: 'Sei su Pro', ctaFinalising: 'Finalizzazione…', note: 'Fatturazione solo proprietario. Piano per workspace.' },
        teamStarter: { name: 'Team Starter', subtitle: 'Fino a 5 utenti', features: ['Accesso multi-utente al workspace', 'Ruoli e permessi', 'Tutto incluso in Pro'], cta: 'Aggiorna a Team Starter', ctaCurrent: 'Sei su Team Starter', ctaFinalising: 'Finalizzazione…', note: 'Ideale per piccoli team. Fino a 5 membri.' },
        teamPro: { name: 'Team Pro', subtitle: 'Fino a 200 utenti', features: ['Tutto incluso in Team Starter', 'Audit trail + approvazioni', 'Supporto prioritario + SLA'], cta: 'Aggiorna a Team Pro', ctaCurrent: 'Sei su Team Pro', ctaFinalising: 'Finalizzazione…', note: 'Ideale per team più grandi. Fino a 200 membri.' },
      },
      current: 'Attuale',
      startingCheckout: 'Avvio checkout…',
      confirmCancel: {
        title: 'Cancella abbonamento',
        description: 'Verrai reindirizzato a Stripe per cancellare. Se cancelli, perderai i benefici Pro/Team come:',
        benefits: ['Contatti e lavori illimitati', 'Esportazione PDF (preventivi e fatture) senza filigrana', 'Brand e funzionalità premium del flusso di lavoro'],
        note: 'Puoi sempre riattivare in seguito, ma l\'accesso potrebbe cambiare immediatamente in base allo stato del piano.',
        keep: 'Mantieni abbonamento',
        proceed: 'Continua con la cancellazione',
      },
      confirmDelete: {
        title: 'Elimina account',
        description: 'Questa azione è permanente. Il tuo account verrà eliminato e potresti perdere l\'accesso a:',
        losses: ['Workspace e accesso alle aree membri', 'Preventivi, fatture e cronologia salvata (dove applicabile)', 'Thread di supporto e aggiornamenti futuri'],
        note: 'Se vuoi solo interrompere la fatturazione, cancella il tuo abbonamento.',
        keep: 'Mantieni account',
        proceed: 'Elimina permanentemente',
      },
      errors: {
        supabaseUnavailable: 'Client Supabase non disponibile.',
        notSignedIn: 'Non sei autenticato.',
        loadFailed: 'Impossibile caricare i dettagli di fatturazione.',
        noWorkspace: 'Nessun workspace attivo trovato. La fatturazione è per workspace.',
        unknownTier: 'Piano sconosciuto.',
        checkoutFailed: 'Checkout fallito. Riprova.',
        invalidCheckoutUrl: 'Il checkout ha restituito una risposta non valida. Riprova.',
        portalFailed: 'Portale fatturazione fallito. Riprova.',
        invalidPortalUrl: 'Il portale ha restituito un URL non valido.',
        cancelFailed: 'Impossibile aprire il portale di fatturazione.',
        noPaidSubscription: 'Nessun abbonamento a pagamento attivo da cancellare.',
        enterPromoCode: 'Inserisci un codice promozionale.',
        promoFailed: 'Impossibile applicare il codice promozionale. Riprova.',
        deleteFailed: 'Impossibile eliminare l\'account.',
      },
      status: {
        active: 'Attivo',
        trial: 'Prova',
        pastDue: 'In ritardo',
        cancelled: 'Cancellato',
        inactive: 'Inattivo',
      },
    },
    settings: {
      profile: 'Profilo',
      name: 'Nome',
      emailAddress: 'Indirizzo email',
      mobileNumber: 'Numero di cellulare',
      businessAddress: 'Indirizzo aziendale',
      businessPhone: 'Telefono aziendale',
      business: 'Azienda',
      workspace: 'Spazio di lavoro',
      vatDetails: 'Dati IVA',
      invoiceDefaults: 'Impostazioni fattura',
      notifications: 'Notifiche',
      emailAlerts: 'Avvisi email',
      paymentReminders: 'Promemoria pagamento',
      taskReminders: 'Promemoria attività',
      billingTitle: 'Fatturazione e Abbonamento',
      billingSubtitle: 'Gestisci il tuo piano e le opzioni di abbonamento.',
      subscriptionBilling: 'Abbonamento e fatturazione',
      manageSubscription: 'Gestisci abbonamento',
      currentPlan: 'Piano attuale',
      emailPreferences: {
        title: 'Preferenze Email',
        subtitle: 'Controlla quali email ricevi da TISSCA.',
        manage: 'Gestisci',
        backToSettings: 'Torna alle Impostazioni',
        categories: 'Categorie Email',
        categoriesDesc: 'Scegli quali tipi di email vuoi ricevere.',
        productUpdates: 'Aggiornamenti Prodotto',
        productUpdatesDesc: 'Novità su funzionalità e miglioramenti.',
        featureEmails: 'Suggerimenti Funzionalità',
        featureEmailsDesc: 'Suggerimenti su funzionalità che non hai ancora provato.',
        upgradeEmails: 'Suggerimenti di Upgrade',
        upgradeEmailsDesc: 'Raccomandazioni basate sul tuo utilizzo.',
        billingEmails: 'Notifiche di Fatturazione',
        billingEmailsDesc: 'Conferme di pagamento e aggiornamenti di fatturazione.',
        reminderEmails: 'Promemoria',
        reminderEmailsDesc: 'Promemoria per attività e scadenze.',
        supportFollowup: 'Risposte Supporto',
        supportFollowupDesc: 'Risposte alle tue richieste di supporto.',
        weeklySummary: 'Riepilogo Settimanale',
        weeklySummaryDesc: 'Riepilogo settimanale dell\'attività del tuo workspace.',
        unsubscribeAll: 'Annulla Tutte le Iscrizioni',
        unsubscribeAllDesc: 'Disattiva tutte le email non essenziali. Le notifiche essenziali continueranno ad essere inviate.',
        frequencyTitle: 'Frequenza Email',
        frequencyDesc: 'Con quale frequenza raggruppare le email non urgenti?',
        frequencies: { immediate: 'Immediato', daily: 'Riepilogo Giornaliero', weekly: 'Riepilogo Settimanale' },
        essentialNotice: 'Le notifiche essenziali (reset password, avvisi di sicurezza) vengono sempre inviate indipendentemente dalle tue preferenze.',
        saveSuccess: 'Preferenze email salvate con successo.',
        saveError: 'Impossibile salvare le preferenze. Riprova.',
      },
      personalDetails: {
        title: 'Dati Personali',
        subtitle: 'Gestisci il tuo nome, data di nascita, numero di telefono e indirizzo.',
        manage: 'Gestisci',
        backToSettings: 'Torna alle Impostazioni',
        fullName: 'Nome completo',
        dateOfBirth: 'Data di nascita',
        phone: 'Numero di telefono',
        address: 'Indirizzo',
        saveSuccess: 'Dati personali salvati con successo.',
        saveError: 'Impossibile salvare. Riprova.',
        save: 'Salva',
        saving: 'Salvataggio…',
      },
      security: {
        title: 'Sicurezza',
        subtitle: 'Gestisci l\'email dell\'account, la password e le impostazioni di sicurezza.',
        manage: 'Gestisci',
        backToSettings: 'Torna alle Impostazioni',
        accountEmail: 'Email dell\'Account',
        accountEmailDesc: 'L\'indirizzo email associato al tuo account.',
        currentEmail: 'Email attuale',
        newEmail: 'Nuovo indirizzo email',
        updateEmail: 'Aggiorna email',
        updatingEmail: 'Aggiornamento…',
        emailUpdateSuccess: 'Email di verifica inviata al nuovo indirizzo. Controlla la tua casella di posta.',
        emailUpdateVerify: 'Dovrai verificare la nuova email prima che la modifica abbia effetto.',
        passwordManagement: 'Password',
        passwordManagementDesc: 'Aggiorna la password del tuo account.',
        currentPassword: 'Password attuale',
        newPassword: 'Nuova password',
        confirmPassword: 'Conferma nuova password',
        updatePassword: 'Aggiorna password',
        updatingPassword: 'Aggiornamento…',
        passwordUpdateSuccess: 'Password aggiornata con successo.',
        passwordMismatch: 'Le password non corrispondono.',
        passwordTooShort: 'La password deve essere di almeno 8 caratteri.',
        forgotPassword: 'Password Dimenticata',
        forgotPasswordDesc: 'Invia un link di reimpostazione all\'email del tuo account.',
        sendResetEmail: 'Invia email di reimpostazione',
        sendingResetEmail: 'Invio…',
        resetEmailSent: 'Email di reimpostazione inviata. Controlla la tua casella di posta.',
        resetEmailError: 'Impossibile inviare l\'email di reimpostazione. Riprova.',
      },
    },
    feedback: {
      title: 'Aiuto e Feedback',
      tooltip: 'Aiuto e Feedback',
      tabs: { help: '🤔 Aiuto', issue: '🐛 Problema', suggestion: '💡 Migliorare', review: '⭐ Recensione' },
      stepOf: 'Passo {step} di {total}',
      headlinePlaceholder: 'Titolo breve (obbligatorio)',
      descriptionPlaceholder: 'Raccontaci di più... (obbligatorio)',
      emailPlaceholder: 'Email (facoltativo — se desideri una risposta)',
      back: '← Indietro',
      close: 'Chiudi',
      next: 'Avanti →',
      submit: '✓ Invia',
      submitting: 'Invio in corso...',
      thankYou: 'Grazie!',
      thankYouMessage: 'Il tuo feedback è stato ricevuto e ci aiuterà a migliorare TISSCA.',
      contactNote: 'Ti contatteremo a {email} se hai bisogno di una risposta.',
      questions: {
        help: ['Cosa stai cercando di fare?', 'Quale parte di TISSCA stai usando?', 'Puoi descrivere cosa è successo?'],
        issue: ['Cosa è andato storto?', 'Quale parte di TISSCA?', 'Puoi descrivere il problema in dettaglio?', 'Cosa ti aspettavi che succedesse?'],
        suggestion: ['Cosa vorresti vedere migliorato?', 'Su quale area vorresti che ci concentrassimo?', 'Come ti aiuterebbe questo miglioramento?'],
        review: ['Qual è la tua esperienza complessiva?', 'Cosa funziona bene?', 'Cosa potremmo migliorare?'],
      },
      labels: {
        whatDoing: 'Cosa stai cercando di fare?',
        whichArea: 'Quale parte di TISSCA stai usando?',
        selectArea: 'Seleziona un\'area',
        blocked: 'Sei bloccato in questo momento?',
        blockedYes: 'Sì, sono bloccato',
        blockedNo: 'No, sto solo chiedendo',
        extraDetail: 'Dettagli aggiuntivi (facoltativo)',
        issueTitle: 'Qual è il problema?',
        affectedArea: 'Quale area è interessata?',
        describeIssue: 'Descrivi il problema',
        expectedBehaviour: 'Cosa ti aspettavi che succedesse? (facoltativo)',
        improveTitle: 'Cosa vorresti migliorare?',
        yourSuggestion: 'Descrivi il tuo suggerimento',
        expectedBenefit: 'Come ti aiuterebbe? (facoltativo)',
        rateExperience: 'Come valuti la tua esperienza?',
        reviewTitle: 'Titolo (facoltativo)',
        reviewComments: 'Qualche commento? (facoltativo)',
        optional: 'facoltativo',
        browseFaq: 'Consulta FAQ e articoli di aiuto',
      },
      areas: {
        homepage: 'Pagina iniziale',
        pricing: 'Prezzi',
        download: 'Download',
        signin: 'Accesso / Account',
        memberApp: 'App membro',
        quotesInvoices: 'Preventivi / Fatture',
        leadsJobs: 'Contatti / Lavori',
        billing: 'Fatturazione / Abbonamento',
        settings: 'Impostazioni',
        support: 'Supporto / Centro assistenza',
        other: 'Altro',
      },
    },
    cancelReasons: {
      title: 'Prima di andare…',
      subtitle: 'Aiutaci a migliorare — seleziona almeno un motivo.',
      reasons: {
        tooExpensive: 'Troppo costoso al mese',
        notEnoughValue: 'Valore insufficiente per il prezzo',
        cantAfford: 'Non posso permettermelo ora',
        missingFeatures: 'Mancano funzionalità di cui ho bisogno',
        tooComplicated: 'Troppo complicato / difficile da usare',
        switchingProvider: 'Passo a un altro strumento',
        temporaryPause: 'Pausa temporanea',
        other: 'Altro',
      },
      otherPlaceholder: 'Raccontaci di più…',
      requiredMessage: 'Seleziona almeno un motivo per continuare.',
      otherRequired: 'Descrivi il tuo motivo.',
      continueCancel: 'Continua con la cancellazione',
      goBack: 'Torna indietro',
    },
    tools: {
      title: 'Preventivo Generale',
      editTitle: 'Modifica Preventivo',
      subtitle: 'Strumento di preventivo rapido — aggiungi voci, regola e collega a un contatto o lavoro.',
      editSubtitle: 'Modifica di un preventivo esistente — le modifiche aggiorneranno l\'allegato.',
      projectName: 'Nome Progetto / Cliente',
      lineItems: 'Voci',
      addItem: 'Aggiungi Voce',
      description: 'Descrizione',
      subtotal: 'Subtotale',
      adjustments: 'Regolazioni',
      discount: 'Sconto',
      vat: 'IVA',
      depositPaid: 'Acconto Pagato',
      notes: 'Note',
      notesPlaceholder: 'Note aggiuntive, termini o condizioni...',
      summary: 'Riepilogo',
      total: 'Totale',
      balanceDue: 'Saldo dovuto',
      hideBreakdown: 'Nascondi dettaglio',
      viewBreakdown: 'Visualizza dettaglio generato',
      generateLead: 'Genera Contatto',
      addToLead: 'Aggiungi a Contatto',
      addToJob: 'Aggiungi a Lavoro',
      clear: 'Cancella',
      backToTools: 'Torna agli Strumenti',
      updateEstimate: 'Aggiorna Preventivo',
      newEstimate: 'Nuovo Preventivo',
      working: 'In elaborazione...',
      saving: 'Salvataggio...',
      generatedBreakdown: 'Dettaglio Generato',
      selectLead: 'Seleziona Contatto',
      selectJob: 'Seleziona Lavoro',
      cancel: 'Annulla',
      attach: 'Allega',
      searchLeads: 'Cerca contatti...',
      searchJobs: 'Cerca lavori...',
      noLeadsFound: 'Nessun contatto trovato. Crea prima un contatto.',
      noJobsFound: 'Nessun lavoro trovato. Crea prima un lavoro.',
      successLeadTitle: 'Contatto Generato',
      successLeadDesc: 'Il tuo preventivo è stato salvato come nuovo contatto con il dettaglio completo allegato.',
      successAttachLead: 'Preventivo Allegato al Contatto',
      successAttachJob: 'Preventivo Allegato al Lavoro',
      successUpdate: 'Preventivo Aggiornato',
      viewInLeads: 'Vedi Contatti',
      viewInJobs: 'Vedi Lavori',
      draftRestored: 'Bozza ripristinata',
      editing: 'Modifica',
      discardNew: 'Scarta e Inizia Nuovo',
      back: '← Indietro',
      workspaceNote: 'Configura il tuo spazio di lavoro in Impostazioni per abilitare la generazione contatti. Puoi comunque creare preventivi senza spazio di lavoro.',
      removeItem: 'Rimuovi voce',
    },
  },
};

const es: TranslationStrings = {
  nav: {
    features: 'Funciones',
    pricing: 'Precios',
    download: 'Descargar',
    login: 'Iniciar sesión',
    getStarted: 'Empezar',
    openApp: 'Abrir App',
  },
  hero: {
    title: 'Gestiona tu negocio',
    titleAccent: 'con TISSCA',
    subtitle: 'Presupuestos, trabajos, herramientas, equipos y flujo de trabajo — todo en una plataforma para profesionales de la construcción.',
    ctaPrimary: 'Abrir App',
    ctaSecondary: 'Descargar App',
    viewPlans: 'Ver Planes →',
  },
  trust: {
    items: ['Hecho para profesionales', 'De individual a equipo', 'Herramientas + flujo en un solo lugar', 'Acceso web y móvil'],
  },
  features: {
    heading: 'Todo lo que necesitas para gestionar tu negocio',
    subheading: 'Una plataforma. Cada herramienta. Del primer contacto a la factura final.',
    cards: [
      { title: 'Contactos y Trabajos', description: 'Sigue los trabajos desde el primer contacto hasta su finalización. Nunca pierdas un cliente.' },
      { title: 'Presupuestos y Facturas', description: 'Crea documentos profesionales en minutos. Envía, rastrea y cobra más rápido.' },
      { title: 'Herramientas Integradas', description: 'Calculadoras profesionales y herramientas integradas en la plataforma.' },
      { title: 'Espacio de Equipo', description: 'Gestiona miembros, roles y flujos de trabajo compartidos. Colabora sin caos.' },
      { title: 'Recursos y Organización', description: 'Mantén trabajo, registros y operaciones organizados en un solo lugar.' },
      { title: 'Crecimiento Empresarial', description: 'Mantente profesional y crece — de trabajo individual a equipo completo.' },
    ],
  },
  whyTissca: {
    heading: 'Un solo lugar para gestionar todo',
    description: 'TISSCA reemplaza las hojas de cálculo, libretas y apps dispersas que usas hoy. Gestiona contactos, crea presupuestos profesionales, envía facturas, organiza tu equipo — todo desde una plataforma pensada para profesionales de la construcción.',
    benefits: [
      { title: 'Deja de saltar entre herramientas', description: 'Todo en una plataforma — sin más hojas de cálculo, libretas y apps dispersas.' },
      { title: 'Presenta un negocio más profesional', description: 'Presupuestos con marca, facturas limpias y comunicaciones organizadas.' },
      { title: 'Mantente organizado en trabajos y clientes', description: 'Del primer contacto a la factura final — cada trabajo seguido, nada perdido.' },
      { title: 'Crece de individual a equipo', description: 'Empieza gratis, añade miembros cuando estés listo. La plataforma crece contigo.' },
    ],
  },
  plans: {
    heading: 'Planes que crecen contigo',
    subheading: 'Empieza gratis. Actualiza cuando estés listo. Sin presión.',
    enterprise: '¿Necesitas más de 200 miembros?',
    contactUs: 'Contáctanos',
  },
  download: {
    heading: 'Lleva TISSCA donde trabajes',
    subheading: 'Usa TISSCA en movimiento, en obra o en la oficina.',
    googlePlay: 'Google Play',
    appStore: 'App Store',
    web: 'Web',
  },
  cta: {
    heading: '¿Listo para gestionar tu negocio con TISSCA?',
    subheading: 'Únete a los profesionales de la construcción que ya usan la plataforma.',
    primary: 'Abrir App',
    secondary: 'Descargar App',
  },
  footer: {
    product: 'Producto',
    resources: 'Recursos',
    company: 'Empresa',
    login: 'Iniciar sesión',
    openApp: 'Abrir App',
  },
  cookie: {
    message: 'Usamos cookies para mantener tu sesión y mejorar tu experiencia.',
    privacyLink: 'Política de privacidad',
    acceptAll: 'Aceptar todo',
    essentialOnly: 'Solo esenciales',
  },
  about: {
    title: 'Sobre TISSCA',
    description: 'La plataforma creada para profesionales de la construcción.',
    whatIs: {
      heading: '¿Qué es TISSCA?',
      p1: 'TISSCA es una plataforma completa para profesionales de la construcción y empresas. Reúne las herramientas necesarias para gestionar trabajo, operaciones, simplificar administración y hacer crecer tu negocio — todo en un solo lugar.',
      p2: 'Seas un autónomo gestionando presupuestos y facturas, o un equipo de 200 coordinando trabajos en múltiples obras, TISSCA te da la estructura y herramientas para trabajar mejor.',
    },
    whatDoes: {
      heading: 'Qué hace TISSCA',
      items: [
        'Crear y enviar presupuestos y facturas profesionales en minutos',
        'Seguir contactos, trabajos y clientes de principio a fin',
        'Acceder a calculadoras y herramientas profesionales integradas',
        'Gestionar equipo, roles y flujos de trabajo compartidos',
        'Mantener registros y recursos empresariales organizados y accesibles',
        'Usar TISSCA en web, Android o iOS — donde sea que trabajes',
      ],
    },
    whoFor: {
      heading: 'Para quién es',
      text: 'Profesionales individuales. Equipos en crecimiento. Empresas de construcción establecidas. TISSCA crece contigo — empieza gratis y actualiza cuando estés listo. Sin presión.',
    },
    approach: {
      heading: 'Nuestro enfoque',
      items: [
        'Hecho para el sector — diseñado para cómo los profesionales realmente trabajan',
        'Simple y estructurado — sin desorden, sin complejidad innecesaria',
        'Una plataforma — reemplazar hojas de cálculo, libretas y apps dispersas',
        'Escalable — de trabajo individual a equipo de 200+',
      ],
    },
    contact: {
      heading: 'Contáctanos',
      text: '¿Tienes preguntas o sugerencias? Escríbenos a support@tissca.com o visita nuestra página de contacto.',
    },
  },
  contact: {
    title: 'Contáctanos',
    description: '¿Tienes una pregunta, sugerencia o necesitas ayuda? Nos encantaría escucharte.',
    form: {
      name: 'Nombre',
      email: 'Email',
      message: 'Mensaje',
      namePlaceholder: 'Tu nombre',
      emailPlaceholder: 'tu@ejemplo.com',
      messagePlaceholder: '¿Cómo podemos ayudarte?',
      submit: 'Enviar Mensaje',
      sending: 'Enviando…',
      sentTitle: 'Mensaje enviado',
      sentMessage: 'Gracias por contactarnos. Te responderemos pronto.',
      sendAnother: 'Enviar otro mensaje',
      error: 'Algo salió mal. Inténtalo de nuevo o escríbenos directamente.',
    },
    sidebar: {
      emailLabel: 'Email',
      responseLabel: 'Tiempo de respuesta',
      responseText: 'Respondemos en 1–2 días laborables.',
      helpLabel: '¿Buscas ayuda?',
      helpText: 'Consulta las funciones en la página principal o revisa nuestros planes.',
    },
  },
  member: {
    nav: { overview: 'Resumen', leads: 'Contactos', jobs: 'Trabajos', quotes: 'Presupuestos', invoices: 'Facturas', history: 'Historial', chat: 'TissChat', tools: 'Herramientas', planner: 'Planificador', calendar: 'Calendario', tasks: 'Tareas', assets: 'Activos', projects: 'Proyectos', accountant: 'Contable', settings: 'Ajustes', dashboard: 'Panel', account: 'Cuenta', billing: 'Suscripción y Facturación', logOut: 'Cerrar sesión' },
    common: { loading: 'Cargando…', error: 'Algo salió mal.', noData: 'Sin datos todavía.', retry: 'Reintentar', search: 'Buscar', actions: 'Acciones', status: 'Estado', date: 'Fecha', name: 'Nombre', email: 'Email', phone: 'Teléfono', total: 'Total', notes: 'Notas' },
    dashboard: { title: 'Panel', subtitle: 'Tu negocio de un vistazo', outstanding: 'Pendiente', leadsWon: 'Contactos Ganados', openQuotes: 'Presupuestos Abiertos', conversion: 'Conversión', recentHistory: 'Historial Reciente', quickActions: 'Acciones Rápidas', newLead: 'Nuevo Contacto', newQuote: 'Nuevo Presupuesto', newInvoice: 'Nueva Factura', viewAll: 'Ver Todo' },
    leads: { title: 'Contactos', subtitle: 'Gestiona tus contactos', empty: 'Sin contactos todavía. Crea el primero para empezar.', source: 'Origen', value: 'Valor', createTitle: 'Crear Contacto', createSubtitle: 'Introduce los datos del cliente y del contacto para crear uno nuevo.', leadName: 'Nombre del Contacto', leadNamePlaceholder: 'ej. Renovación de cocina — Sr. García', leadStatus: 'Estado', leadSource: 'Origen', estimateValue: 'Valor Estimado', followUpDate: 'Fecha de Seguimiento', clientDetails: 'Datos del Cliente', clientDetailsHint: 'Opcional — vincula un contacto de cliente a este lead.', clientName: 'Nombre del Cliente', clientNamePlaceholder: 'Nombre completo', clientEmail: 'Email', clientEmailPlaceholder: 'cliente@ejemplo.es', clientPhone: 'Teléfono', clientPhonePlaceholder: '+34 612 345 678', clientAddress: 'Dirección', clientAddressPlaceholder: 'Calle Mayor 123, Madrid', estimateAttached: 'Presupuesto adjunto', createLead: 'Crear Contacto', creating: 'Creando...', backToEstimate: 'Volver al Presupuesto', statusNew: 'Nuevo', statusContacted: 'Contactado', statusQuoted: 'Presupuestado', statusWon: 'Ganado', statusLost: 'Perdido' },
    jobs: { title: 'Trabajos', subtitle: 'Trabajos activos y completados', empty: 'Sin trabajos todavía. Aparecen aquí cuando se crean.', client: 'Cliente', priority: 'Prioridad' },
    tasks: { title: 'Tareas', subtitle: 'Tu lista de tareas', empty: 'Sin tareas todavía. Añade tareas para organizarte.', assignee: 'Responsable', dueDate: 'Fecha Límite' },
    assets: { title: 'Activos', subtitle: 'Equipos y herramientas', empty: 'Sin activos registrados todavía.', type: 'Tipo', location: 'Ubicación' },
    history: { title: 'Historial', subtitle: 'Registro de actividad', empty: 'Sin actividad registrada todavía.', action: 'Acción', entity: 'Entidad' },
    subscription: {
      title: 'Suscripción y Facturación',
      subtitle: 'Gestiona tu plan, estado de suscripción y detalles de facturación.',
      backToSettings: 'Volver a Ajustes',
      planSummary: 'Resumen del plan',
      planSummaryDesc: 'Basado en los datos reales de tu workspace de facturación.',
      currentPlan: 'Plan actual',
      statusLabel: 'Estado',
      workspace: 'Workspace',
      nextBillingDate: 'Próxima fecha de facturación',
      basedOnPeriodEnd: 'Basado en current_period_end',
      billingLinks: 'Enlaces de facturación',
      customer: 'Cliente',
      subscriptionLink: 'Suscripción',
      returnedFromBilling: 'Has vuelto de la facturación.',
      returnedFromBillingDesc: 'Si realizaste cambios en Stripe, aparecerán aquí en breve.',
      dismiss: 'Cerrar',
      finalising: 'Finalizando tu suscripción… Espera mientras confirmamos la facturación.',
      loadingBilling: 'Cargando detalles de facturación…',
      noWorkspace: 'No se encontró ningún workspace activo para esta cuenta. La facturación es por workspace, así que no hay nada que gestionar aún.',
      plansTitle: 'Planes',
      plansSubtitle: 'Las acciones de facturación son exclusivas del propietario y se gestionan mediante Edge Functions.',
      openBillingPortal: 'Abrir portal de facturación',
      openingBillingPortal: 'Abriendo portal de facturación…',
      cancelSubscription: 'Cancelar suscripción',
      openingCancellation: 'Abriendo cancelación…',
      deleteAccount: 'Eliminar cuenta',
      deleting: 'Eliminando…',
      promoTitle: '¿Tienes un código promocional?',
      promoSubtitle: 'Aplica un descuento aunque lleves meses suscrito. Solo propietario.',
      promoPlaceholder: 'Introduce el código promocional',
      applyCode: 'Aplicar código',
      applying: 'Aplicando…',
      plans: {
        free: { name: 'Gratis', subtitle: '1 usuario', features: ['Herramientas básicas y acceso a la app', 'Marca de agua TISSCA en PDFs', 'Exportaciones y automatización limitadas'], note: 'Actualiza para desbloquear suscripciones y gestión de facturación.' },
        pro: { name: 'Pro', subtitle: '1 usuario', features: ['Contactos y trabajos ilimitados', 'Exportación PDF (presupuestos y facturas)', 'Sin marca de agua + soporte de marca'], cta: 'Actualizar a Pro', ctaCurrent: 'Estás en Pro', ctaFinalising: 'Finalizando…', note: 'Facturación solo propietario. Plan por workspace.' },
        teamStarter: { name: 'Team Starter', subtitle: 'Hasta 5 usuarios', features: ['Acceso multi-usuario al workspace', 'Roles y permisos', 'Todo incluido en Pro'], cta: 'Actualizar a Team Starter', ctaCurrent: 'Estás en Team Starter', ctaFinalising: 'Finalizando…', note: 'Ideal para equipos pequeños. Hasta 5 miembros.' },
        teamPro: { name: 'Team Pro', subtitle: 'Hasta 200 usuarios', features: ['Todo incluido en Team Starter', 'Registro de auditoría + aprobaciones', 'Soporte prioritario + SLA'], cta: 'Actualizar a Team Pro', ctaCurrent: 'Estás en Team Pro', ctaFinalising: 'Finalizando…', note: 'Ideal para equipos más grandes. Hasta 200 miembros.' },
      },
      current: 'Actual',
      startingCheckout: 'Iniciando checkout…',
      confirmCancel: {
        title: 'Cancelar suscripción',
        description: 'Serás redirigido a Stripe para cancelar. Si cancelas, perderás beneficios Pro/Team como:',
        benefits: ['Contactos y trabajos ilimitados', 'Exportación PDF (presupuestos y facturas) sin marca de agua', 'Marca y funciones premium de flujo de trabajo'],
        note: 'Puedes reactivar más tarde, pero el acceso puede cambiar inmediatamente según el estado del plan.',
        keep: 'Mantener suscripción',
        proceed: 'Continuar con la cancelación',
      },
      confirmDelete: {
        title: 'Eliminar cuenta',
        description: 'Esta acción es permanente. Tu cuenta será eliminada y podrías perder acceso a:',
        losses: ['Workspaces y acceso a áreas de miembros', 'Presupuestos, facturas e historial guardado (donde aplique)', 'Hilos de soporte y actualizaciones futuras'],
        note: 'Si solo quieres dejar de pagar, cancela tu suscripción.',
        keep: 'Mantener cuenta',
        proceed: 'Eliminar permanentemente',
      },
      errors: {
        supabaseUnavailable: 'Cliente Supabase no disponible.',
        notSignedIn: 'No has iniciado sesión.',
        loadFailed: 'Error al cargar los detalles de facturación.',
        noWorkspace: 'No se encontró ningún workspace activo. La facturación es por workspace.',
        unknownTier: 'Plan desconocido.',
        checkoutFailed: 'Checkout fallido. Inténtalo de nuevo.',
        invalidCheckoutUrl: 'El checkout devolvió una respuesta no válida. Inténtalo de nuevo.',
        portalFailed: 'Portal de facturación fallido. Inténtalo de nuevo.',
        invalidPortalUrl: 'El portal devolvió un URL no válido.',
        cancelFailed: 'No se pudo abrir el portal de facturación.',
        noPaidSubscription: 'No hay suscripción de pago activa para cancelar.',
        enterPromoCode: 'Introduce un código promocional.',
        promoFailed: 'No se pudo aplicar el código promocional. Inténtalo de nuevo.',
        deleteFailed: 'No se pudo eliminar la cuenta.',
      },
      status: {
        active: 'Activo',
        trial: 'Prueba',
        pastDue: 'Vencido',
        cancelled: 'Cancelado',
        inactive: 'Inactivo',
      },
    },
    settings: {
      profile: 'Perfil',
      name: 'Nombre',
      emailAddress: 'Dirección de email',
      mobileNumber: 'Número de móvil',
      businessAddress: 'Dirección del negocio',
      businessPhone: 'Teléfono del negocio',
      business: 'Negocio',
      workspace: 'Espacio de trabajo',
      vatDetails: 'Datos de IVA',
      invoiceDefaults: 'Predeterminados de factura',
      notifications: 'Notificaciones',
      emailAlerts: 'Alertas por email',
      paymentReminders: 'Recordatorios de pago',
      taskReminders: 'Recordatorios de tareas',
      billingTitle: 'Facturación y Suscripción',
      billingSubtitle: 'Gestiona tu plan y opciones de suscripción.',
      subscriptionBilling: 'Suscripción y facturación',
      manageSubscription: 'Gestionar suscripción',
      currentPlan: 'Plan actual',
      emailPreferences: {
        title: 'Preferencias de Email',
        subtitle: 'Controla qué emails recibes de TISSCA.',
        manage: 'Gestionar',
        backToSettings: 'Volver a Configuración',
        categories: 'Categorías de Email',
        categoriesDesc: 'Elige qué tipos de emails deseas recibir.',
        productUpdates: 'Actualizaciones del Producto',
        productUpdatesDesc: 'Noticias sobre funcionalidades y mejoras.',
        featureEmails: 'Consejos de Funcionalidades',
        featureEmailsDesc: 'Consejos sobre funcionalidades que aún no has probado.',
        upgradeEmails: 'Sugerencias de Mejora',
        upgradeEmailsDesc: 'Recomendaciones basadas en tu uso.',
        billingEmails: 'Notificaciones de Facturación',
        billingEmailsDesc: 'Confirmaciones de pago y actualizaciones de facturación.',
        reminderEmails: 'Recordatorios',
        reminderEmailsDesc: 'Recordatorios de tareas y plazos.',
        supportFollowup: 'Respuestas de Soporte',
        supportFollowupDesc: 'Respuestas a tus solicitudes de soporte.',
        weeklySummary: 'Resumen Semanal',
        weeklySummaryDesc: 'Resumen semanal de la actividad de tu workspace.',
        unsubscribeAll: 'Cancelar Todas las Suscripciones',
        unsubscribeAllDesc: 'Desactivar todos los emails no esenciales. Las notificaciones esenciales seguirán enviándose.',
        frequencyTitle: 'Frecuencia de Email',
        frequencyDesc: '¿Con qué frecuencia agrupar los emails no urgentes?',
        frequencies: { immediate: 'Inmediato', daily: 'Resumen Diario', weekly: 'Resumen Semanal' },
        essentialNotice: 'Las notificaciones esenciales (restablecimiento de contraseña, alertas de seguridad) siempre se envían independientemente de tus preferencias.',
        saveSuccess: 'Preferencias de email guardadas correctamente.',
        saveError: 'Error al guardar preferencias. Inténtalo de nuevo.',
      },
      personalDetails: {
        title: 'Datos Personales',
        subtitle: 'Gestiona tu nombre, fecha de nacimiento, número de teléfono y dirección.',
        manage: 'Gestionar',
        backToSettings: 'Volver a Configuración',
        fullName: 'Nombre completo',
        dateOfBirth: 'Fecha de nacimiento',
        phone: 'Número de teléfono',
        address: 'Dirección',
        saveSuccess: 'Datos personales guardados correctamente.',
        saveError: 'Error al guardar. Inténtalo de nuevo.',
        save: 'Guardar',
        saving: 'Guardando…',
      },
      security: {
        title: 'Seguridad',
        subtitle: 'Gestiona el email de la cuenta, contraseña y configuración de seguridad.',
        manage: 'Gestionar',
        backToSettings: 'Volver a Configuración',
        accountEmail: 'Email de la Cuenta',
        accountEmailDesc: 'La dirección de email asociada a tu cuenta.',
        currentEmail: 'Email actual',
        newEmail: 'Nueva dirección de email',
        updateEmail: 'Actualizar email',
        updatingEmail: 'Actualizando…',
        emailUpdateSuccess: 'Email de verificación enviado a la nueva dirección. Revisa tu bandeja de entrada.',
        emailUpdateVerify: 'Deberás verificar el nuevo email antes de que el cambio surta efecto.',
        passwordManagement: 'Contraseña',
        passwordManagementDesc: 'Actualiza la contraseña de tu cuenta.',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar nueva contraseña',
        updatePassword: 'Actualizar contraseña',
        updatingPassword: 'Actualizando…',
        passwordUpdateSuccess: 'Contraseña actualizada correctamente.',
        passwordMismatch: 'Las contraseñas no coinciden.',
        passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
        forgotPassword: 'Olvidé mi Contraseña',
        forgotPasswordDesc: 'Enviar un enlace de restablecimiento al email de tu cuenta.',
        sendResetEmail: 'Enviar email de restablecimiento',
        sendingResetEmail: 'Enviando…',
        resetEmailSent: 'Email de restablecimiento enviado. Revisa tu bandeja de entrada.',
        resetEmailError: 'Error al enviar email de restablecimiento. Inténtalo de nuevo.',
      },
    },
    feedback: {
      title: 'Ayuda y Comentarios',
      tooltip: 'Ayuda y Comentarios',
      tabs: { help: '🤔 Ayuda', issue: '🐛 Problema', suggestion: '💡 Mejorar', review: '⭐ Reseña' },
      stepOf: 'Paso {step} de {total}',
      headlinePlaceholder: 'Título breve (obligatorio)',
      descriptionPlaceholder: 'Cuéntanos más... (obligatorio)',
      emailPlaceholder: 'Email (opcional — si deseas una respuesta)',
      back: '← Atrás',
      close: 'Cerrar',
      next: 'Siguiente →',
      submit: '✓ Enviar',
      submitting: 'Enviando...',
      thankYou: '¡Gracias!',
      thankYouMessage: 'Tu comentario ha sido recibido y nos ayudará a mejorar TISSCA.',
      contactNote: 'Te contactaremos en {email} si necesitas una respuesta.',
      questions: {
        help: ['¿Qué estás intentando hacer?', '¿Qué parte de TISSCA estás usando?', '¿Puedes describir lo que pasó?'],
        issue: ['¿Qué salió mal?', '¿Qué parte de TISSCA?', '¿Puedes describir el problema en detalle?', '¿Qué esperabas que sucediera?'],
        suggestion: ['¿Qué te gustaría ver mejorado?', '¿En qué área te gustaría que nos enfocáramos?', '¿Cómo te ayudaría esta mejora?'],
        review: ['¿Cuál es tu experiencia general?', '¿Qué funciona bien?', '¿Qué podríamos mejorar?'],
      },
      labels: {
        whatDoing: '¿Qué estás intentando hacer?',
        whichArea: '¿Qué parte de TISSCA estás usando?',
        selectArea: 'Selecciona un área',
        blocked: '¿Estás bloqueado ahora mismo?',
        blockedYes: 'Sí, estoy atascado',
        blockedNo: 'No, solo pregunto',
        extraDetail: 'Detalle adicional (opcional)',
        issueTitle: '¿Cuál es el problema?',
        affectedArea: '¿Qué área está afectada?',
        describeIssue: 'Describe el problema',
        expectedBehaviour: '¿Qué esperabas que sucediera? (opcional)',
        improveTitle: '¿Qué te gustaría mejorar?',
        yourSuggestion: 'Describe tu sugerencia',
        expectedBenefit: '¿Cómo te ayudaría? (opcional)',
        rateExperience: '¿Cómo calificarías tu experiencia?',
        reviewTitle: 'Título (opcional)',
        reviewComments: '¿Algún comentario? (opcional)',
        optional: 'opcional',
        browseFaq: 'Ver preguntas frecuentes y artículos de ayuda',
      },
      areas: {
        homepage: 'Página de inicio',
        pricing: 'Precios',
        download: 'Descargar',
        signin: 'Iniciar sesión / Cuenta',
        memberApp: 'App de miembro',
        quotesInvoices: 'Presupuestos / Facturas',
        leadsJobs: 'Contactos / Trabajos',
        billing: 'Facturación / Suscripción',
        settings: 'Configuración',
        support: 'Soporte / Centro de ayuda',
        other: 'Otro',
      },
    },
    cancelReasons: {
      title: 'Antes de irte…',
      subtitle: 'Ayúdanos a mejorar — selecciona al menos un motivo.',
      reasons: {
        tooExpensive: 'Demasiado caro al mes',
        notEnoughValue: 'Valor insuficiente por el precio',
        cantAfford: 'No puedo pagarlo ahora',
        missingFeatures: 'Faltan funciones que necesito',
        tooComplicated: 'Demasiado complicado / difícil de usar',
        switchingProvider: 'Cambio a otra herramienta',
        temporaryPause: 'Pausa temporal',
        other: 'Otro',
      },
      otherPlaceholder: 'Cuéntanos más…',
      requiredMessage: 'Selecciona al menos un motivo para continuar.',
      otherRequired: 'Describe tu motivo.',
      continueCancel: 'Continuar con la cancelación',
      goBack: 'Volver',
    },
    tools: {
      title: 'Presupuesto General',
      editTitle: 'Editar Presupuesto',
      subtitle: 'Herramienta de presupuesto rápido — añade elementos, ajusta y asocia a un contacto o trabajo.',
      editSubtitle: 'Editando un presupuesto existente — los cambios actualizarán el adjunto.',
      projectName: 'Nombre del Proyecto / Cliente',
      lineItems: 'Elementos',
      addItem: 'Añadir Elemento',
      description: 'Descripción',
      subtotal: 'Subtotal',
      adjustments: 'Ajustes',
      discount: 'Descuento',
      vat: 'IVA',
      depositPaid: 'Señal Pagada',
      notes: 'Notas',
      notesPlaceholder: 'Notas adicionales, términos o condiciones...',
      summary: 'Resumen',
      total: 'Total',
      balanceDue: 'Saldo pendiente',
      hideBreakdown: 'Ocultar desglose',
      viewBreakdown: 'Ver desglose generado',
      generateLead: 'Generar Contacto',
      addToLead: 'Añadir a Contacto',
      addToJob: 'Añadir a Trabajo',
      clear: 'Limpiar',
      backToTools: 'Volver a Herramientas',
      updateEstimate: 'Actualizar Presupuesto',
      newEstimate: 'Nuevo Presupuesto',
      working: 'Procesando...',
      saving: 'Guardando...',
      generatedBreakdown: 'Desglose Generado',
      selectLead: 'Seleccionar Contacto',
      selectJob: 'Seleccionar Trabajo',
      cancel: 'Cancelar',
      attach: 'Adjuntar',
      searchLeads: 'Buscar contactos...',
      searchJobs: 'Buscar trabajos...',
      noLeadsFound: 'No se encontraron contactos. Crea uno primero.',
      noJobsFound: 'No se encontraron trabajos. Crea uno primero.',
      successLeadTitle: 'Contacto Generado',
      successLeadDesc: 'Tu presupuesto se ha guardado como nuevo contacto con el desglose completo adjunto.',
      successAttachLead: 'Presupuesto Adjunto al Contacto',
      successAttachJob: 'Presupuesto Adjunto al Trabajo',
      successUpdate: 'Presupuesto Actualizado',
      viewInLeads: 'Ver Contactos',
      viewInJobs: 'Ver Trabajos',
      draftRestored: 'Borrador restaurado',
      editing: 'Editando',
      discardNew: 'Descartar y Empezar Nuevo',
      back: '← Atrás',
      workspaceNote: 'Configura tu espacio de trabajo en Configuración para habilitar la generación de contactos. Puedes crear presupuestos sin espacio de trabajo.',
      removeItem: 'Eliminar elemento',
    },
  },
};

const fr: TranslationStrings = {
  nav: {
    features: 'Fonctionnalités',
    pricing: 'Tarifs',
    download: 'Télécharger',
    login: 'Connexion',
    getStarted: 'Commencer',
    openApp: 'Ouvrir l\'App',
  },
  hero: {
    title: 'Gérez votre activité',
    titleAccent: 'avec TISSCA',
    subtitle: 'Devis, chantiers, outils, équipes et flux de travail — tout en une plateforme pour les professionnels du bâtiment.',
    ctaPrimary: 'Ouvrir l\'App',
    ctaSecondary: 'Télécharger l\'App',
    viewPlans: 'Voir les plans →',
  },
  trust: {
    items: ['Fait pour les professionnels', 'De l\'individuel à l\'équipe', 'Outils + flux en un seul endroit', 'Accès web et mobile'],
  },
  features: {
    heading: 'Tout ce dont vous avez besoin pour gérer votre activité',
    subheading: 'Une plateforme. Chaque outil. Du premier contact à la facture finale.',
    cards: [
      { title: 'Contacts et Chantiers', description: 'Suivez les chantiers du premier contact à la réalisation. Ne perdez plus jamais un client.' },
      { title: 'Devis et Factures', description: 'Créez des documents professionnels en quelques minutes. Envoyez, suivez et encaissez plus vite.' },
      { title: 'Outils Intégrés', description: 'Calculateurs professionnels et outils intégrés dans la plateforme.' },
      { title: 'Espace Équipe', description: 'Gérez membres, rôles et flux de travail partagés. Collaborez sans chaos.' },
      { title: 'Ressources et Organisation', description: 'Gardez travail, archives et opérations organisés en un seul endroit.' },
      { title: 'Croissance de l\'Entreprise', description: 'Restez professionnel et grandissez — d\'une activité solo à une équipe complète.' },
    ],
  },
  whyTissca: {
    heading: 'Un seul endroit pour tout gérer',
    description: 'TISSCA remplace les tableurs, carnets et applications dispersées que vous utilisez. Gérez vos contacts, créez des devis professionnels, envoyez des factures, organisez votre équipe — tout depuis une plateforme conçue pour les professionnels du bâtiment.',
    benefits: [
      { title: 'Arrêtez de jongler entre les outils', description: 'Tout en une plateforme — plus de tableurs, carnets et apps dispersées.' },
      { title: 'Présentez une activité plus professionnelle', description: 'Devis brandés, factures propres et communications clients organisées.' },
      { title: 'Restez organisé sur vos chantiers et clients', description: 'Du premier contact à la facture finale — chaque chantier suivi, rien de perdu.' },
      { title: 'Évoluez de l\'individuel à l\'équipe', description: 'Commencez gratuitement, ajoutez des membres quand vous êtes prêt. La plateforme grandit avec vous.' },
    ],
  },
  plans: {
    heading: 'Des plans qui grandissent avec vous',
    subheading: 'Commencez gratuitement. Évoluez quand vous êtes prêt. Sans pression.',
    enterprise: 'Besoin de plus de 200 membres ?',
    contactUs: 'Contactez-nous',
  },
  download: {
    heading: 'Emportez TISSCA partout où vous travaillez',
    subheading: 'Utilisez TISSCA en déplacement, sur chantier ou au bureau.',
    googlePlay: 'Google Play',
    appStore: 'App Store',
    web: 'Web',
  },
  cta: {
    heading: 'Prêt à gérer votre activité avec TISSCA ?',
    subheading: 'Rejoignez les professionnels du bâtiment qui utilisent déjà la plateforme.',
    primary: 'Ouvrir l\'App',
    secondary: 'Télécharger l\'App',
  },
  footer: {
    product: 'Produit',
    resources: 'Ressources',
    company: 'Entreprise',
    login: 'Connexion',
    openApp: 'Ouvrir l\'App',
  },
  cookie: {
    message: 'Nous utilisons des cookies pour maintenir votre session et améliorer votre expérience.',
    privacyLink: 'Politique de confidentialité',
    acceptAll: 'Tout accepter',
    essentialOnly: 'Essentiels uniquement',
  },
  about: {
    title: 'À propos de TISSCA',
    description: 'La plateforme conçue pour les professionnels du bâtiment.',
    whatIs: {
      heading: 'Qu\'est-ce que TISSCA ?',
      p1: 'TISSCA est une plateforme complète pour les professionnels du bâtiment, artisans et entreprises de construction. Elle rassemble les outils nécessaires pour gérer le travail, les opérations, simplifier l\'administration et développer l\'activité — tout en un seul endroit.',
      p2: 'Que vous soyez un artisan gérant des devis et factures, ou une équipe de 200 coordonnant des chantiers, TISSCA vous donne la structure et les outils pour travailler mieux.',
    },
    whatDoes: {
      heading: 'Ce que fait TISSCA',
      items: [
        'Créer et envoyer des devis et factures professionnels en minutes',
        'Suivre contacts, chantiers et clients du début à la fin',
        'Accéder à des calculateurs et outils professionnels intégrés',
        'Gérer l\'équipe, les rôles et les flux de travail partagés',
        'Garder archives et ressources de l\'entreprise organisées et accessibles',
        'Utiliser TISSCA sur web, Android ou iOS — où que vous travailliez',
      ],
    },
    whoFor: {
      heading: 'Pour qui',
      text: 'Professionnels indépendants. Équipes en croissance. Entreprises de construction établies. TISSCA grandit avec vous — commencez gratuitement et évoluez quand vous êtes prêt. Sans pression.',
    },
    approach: {
      heading: 'Notre approche',
      items: [
        'Fait pour le métier — conçu pour comment les professionnels travaillent vraiment',
        'Simple et structuré — pas de désordre, pas de complexité inutile',
        'Une plateforme — remplacer tableurs, carnets et apps dispersées',
        'Évolutif — d\'une activité solo à une équipe de 200+',
      ],
    },
    contact: {
      heading: 'Contactez-nous',
      text: 'Des questions ou suggestions ? Écrivez-nous à support@tissca.com ou visitez notre page contact.',
    },
  },
  contact: {
    title: 'Contactez-nous',
    description: 'Une question, un retour ou besoin d\'aide ? Nous serions ravis de vous entendre.',
    form: {
      name: 'Nom',
      email: 'Email',
      message: 'Message',
      namePlaceholder: 'Votre nom',
      emailPlaceholder: 'vous@exemple.com',
      messagePlaceholder: 'Comment pouvons-nous vous aider ?',
      submit: 'Envoyer le message',
      sending: 'Envoi en cours…',
      sentTitle: 'Message envoyé',
      sentMessage: 'Merci pour votre message. Nous vous répondrons bientôt.',
      sendAnother: 'Envoyer un autre message',
      error: 'Une erreur s\'est produite. Réessayez ou écrivez-nous directement.',
    },
    sidebar: {
      emailLabel: 'Email',
      responseLabel: 'Délai de réponse',
      responseText: 'Nous répondons sous 1–2 jours ouvrés.',
      helpLabel: 'Besoin d\'aide ?',
      helpText: 'Consultez les fonctionnalités sur la page d\'accueil ou nos plans.',
    },
  },
  member: {
    nav: { overview: 'Aperçu', leads: 'Prospects', jobs: 'Chantiers', quotes: 'Devis', invoices: 'Factures', history: 'Historique', chat: 'TissChat', tools: 'Outils', planner: 'Planificateur', calendar: 'Calendrier', tasks: 'Tâches', assets: 'Équipements', projects: 'Projets', accountant: 'Comptable', settings: 'Paramètres', dashboard: 'Tableau de bord', account: 'Compte', billing: 'Abonnement et Facturation', logOut: 'Déconnexion' },
    common: { loading: 'Chargement…', error: 'Une erreur est survenue.', noData: 'Aucune donnée pour le moment.', retry: 'Réessayer', search: 'Rechercher', actions: 'Actions', status: 'Statut', date: 'Date', name: 'Nom', email: 'Email', phone: 'Téléphone', total: 'Total', notes: 'Notes' },
    dashboard: { title: 'Tableau de bord', subtitle: 'Votre activité en un coup d\'œil', outstanding: 'En attente', leadsWon: 'Prospects Gagnés', openQuotes: 'Devis Ouverts', conversion: 'Conversion', recentHistory: 'Historique Récent', quickActions: 'Actions Rapides', newLead: 'Nouveau Prospect', newQuote: 'Nouveau Devis', newInvoice: 'Nouvelle Facture', viewAll: 'Voir Tout' },
    leads: { title: 'Prospects', subtitle: 'Gérez vos prospects', empty: 'Aucun prospect encore. Créez le premier pour commencer.', source: 'Source', value: 'Valeur', createTitle: 'Créer un Prospect', createSubtitle: 'Saisissez les coordonnées du client et du prospect pour en créer un nouveau.', leadName: 'Nom du Prospect', leadNamePlaceholder: 'ex. Rénovation cuisine — M. Dupont', leadStatus: 'Statut', leadSource: 'Source', estimateValue: 'Valeur Estimée', followUpDate: 'Date de Suivi', clientDetails: 'Coordonnées du Client', clientDetailsHint: 'Facultatif — associez un contact client à ce prospect.', clientName: 'Nom du Client', clientNamePlaceholder: 'Nom complet', clientEmail: 'E-mail', clientEmailPlaceholder: 'client@exemple.fr', clientPhone: 'Téléphone', clientPhonePlaceholder: '+33 6 12 34 56 78', clientAddress: 'Adresse', clientAddressPlaceholder: '123 rue de Paris, 75001 Paris', estimateAttached: 'Devis joint', createLead: 'Créer le Prospect', creating: 'Création...', backToEstimate: 'Retour au Devis', statusNew: 'Nouveau', statusContacted: 'Contacté', statusQuoted: 'Devisé', statusWon: 'Gagné', statusLost: 'Perdu' },
    jobs: { title: 'Chantiers', subtitle: 'Chantiers actifs et terminés', empty: 'Aucun chantier encore. Ils apparaissent ici une fois créés.', client: 'Client', priority: 'Priorité' },
    tasks: { title: 'Tâches', subtitle: 'Votre liste de tâches', empty: 'Aucune tâche encore. Ajoutez des tâches pour rester organisé.', assignee: 'Responsable', dueDate: 'Date Limite' },
    assets: { title: 'Équipements', subtitle: 'Matériel et outils', empty: 'Aucun équipement suivi encore.', type: 'Type', location: 'Emplacement' },
    history: { title: 'Historique', subtitle: 'Journal d\'activité', empty: 'Aucune activité enregistrée encore.', action: 'Action', entity: 'Entité' },
    subscription: {
      title: 'Abonnement et Facturation',
      subtitle: 'Gérez votre plan, l\'état de l\'abonnement et les détails de facturation.',
      backToSettings: 'Retour aux Paramètres',
      planSummary: 'Résumé du plan',
      planSummaryDesc: 'Basé sur les données réelles de votre workspace de facturation.',
      currentPlan: 'Plan actuel',
      statusLabel: 'Statut',
      workspace: 'Workspace',
      nextBillingDate: 'Prochaine date de facturation',
      basedOnPeriodEnd: 'Basé sur current_period_end',
      billingLinks: 'Liens de facturation',
      customer: 'Client',
      subscriptionLink: 'Abonnement',
      returnedFromBilling: 'Retour de la facturation.',
      returnedFromBillingDesc: 'Si vous avez effectué des modifications dans Stripe, elles apparaîtront ici sous peu.',
      dismiss: 'Fermer',
      finalising: 'Finalisation de votre abonnement… Veuillez patienter pendant la confirmation.',
      loadingBilling: 'Chargement des détails de facturation…',
      noWorkspace: 'Aucun workspace actif trouvé pour ce compte. La facturation est par workspace, il n\'y a donc rien à gérer pour le moment.',
      plansTitle: 'Plans',
      plansSubtitle: 'Les actions de facturation sont réservées au propriétaire et gérées via Edge Functions.',
      openBillingPortal: 'Ouvrir le portail de facturation',
      openingBillingPortal: 'Ouverture du portail de facturation…',
      cancelSubscription: 'Annuler l\'abonnement',
      openingCancellation: 'Ouverture de l\'annulation…',
      deleteAccount: 'Supprimer le compte',
      deleting: 'Suppression…',
      promoTitle: 'Vous avez un code promo ?',
      promoSubtitle: 'Appliquez une réduction même si vous êtes abonné depuis des mois. Propriétaire uniquement.',
      promoPlaceholder: 'Entrez le code promo',
      applyCode: 'Appliquer le code',
      applying: 'Application…',
      plans: {
        free: { name: 'Gratuit', subtitle: '1 utilisateur', features: ['Outils de base et accès à l\'app', 'Filigrane TISSCA sur les PDF', 'Exportations et automatisation limitées'], note: 'Mettez à niveau pour débloquer les abonnements et la gestion de facturation.' },
        pro: { name: 'Pro', subtitle: '1 utilisateur', features: ['Contacts et chantiers illimités', 'Export PDF (devis et factures)', 'Sans filigrane + support de marque'], cta: 'Passer à Pro', ctaCurrent: 'Vous êtes sur Pro', ctaFinalising: 'Finalisation…', note: 'Facturation propriétaire uniquement. Plan par workspace.' },
        teamStarter: { name: 'Team Starter', subtitle: 'Jusqu\'à 5 utilisateurs', features: ['Accès multi-utilisateur au workspace', 'Rôles et permissions', 'Tout inclus dans Pro'], cta: 'Passer à Team Starter', ctaCurrent: 'Vous êtes sur Team Starter', ctaFinalising: 'Finalisation…', note: 'Idéal pour les petites équipes. Jusqu\'à 5 membres.' },
        teamPro: { name: 'Team Pro', subtitle: 'Jusqu\'à 200 utilisateurs', features: ['Tout inclus dans Team Starter', 'Piste d\'audit + approbations', 'Support prioritaire + SLA'], cta: 'Passer à Team Pro', ctaCurrent: 'Vous êtes sur Team Pro', ctaFinalising: 'Finalisation…', note: 'Idéal pour les grandes équipes. Jusqu\'à 200 membres.' },
      },
      current: 'Actuel',
      startingCheckout: 'Lancement du checkout…',
      confirmCancel: {
        title: 'Annuler l\'abonnement',
        description: 'Vous serez redirigé vers Stripe pour annuler. Si vous annulez, vous perdrez les avantages Pro/Team tels que :',
        benefits: ['Contacts et chantiers illimités', 'Export PDF (devis et factures) sans filigrane', 'Marque et fonctionnalités premium de flux de travail'],
        note: 'Vous pouvez toujours réactiver plus tard, mais l\'accès peut changer immédiatement selon l\'état du plan.',
        keep: 'Garder l\'abonnement',
        proceed: 'Continuer vers l\'annulation',
      },
      confirmDelete: {
        title: 'Supprimer le compte',
        description: 'Cette action est permanente. Votre compte sera supprimé et vous pourriez perdre l\'accès à :',
        losses: ['Workspaces et accès aux espaces membres', 'Devis, factures et historique sauvegardé (le cas échéant)', 'Fils de support et mises à jour futures'],
        note: 'Si vous souhaitez seulement arrêter la facturation, annulez votre abonnement.',
        keep: 'Garder le compte',
        proceed: 'Supprimer définitivement',
      },
      errors: {
        supabaseUnavailable: 'Client Supabase indisponible.',
        notSignedIn: 'Vous n\'êtes pas connecté.',
        loadFailed: 'Échec du chargement des détails de facturation.',
        noWorkspace: 'Aucun workspace actif trouvé. La facturation est par workspace.',
        unknownTier: 'Plan inconnu.',
        checkoutFailed: 'Échec du checkout. Veuillez réessayer.',
        invalidCheckoutUrl: 'Le checkout a renvoyé une réponse invalide. Veuillez réessayer.',
        portalFailed: 'Échec du portail de facturation. Veuillez réessayer.',
        invalidPortalUrl: 'Le portail a renvoyé un URL invalide.',
        cancelFailed: 'Impossible d\'ouvrir le portail de facturation.',
        noPaidSubscription: 'Aucun abonnement payant actif à annuler.',
        enterPromoCode: 'Entrez un code promo.',
        promoFailed: 'Impossible d\'appliquer le code promo. Veuillez réessayer.',
        deleteFailed: 'Impossible de supprimer le compte.',
      },
      status: {
        active: 'Actif',
        trial: 'Essai',
        pastDue: 'En retard',
        cancelled: 'Annulé',
        inactive: 'Inactif',
      },
    },
    settings: {
      profile: 'Profil',
      name: 'Nom',
      emailAddress: 'Adresse e-mail',
      mobileNumber: 'Numéro de portable',
      businessAddress: 'Adresse professionnelle',
      businessPhone: 'Téléphone professionnel',
      business: 'Entreprise',
      workspace: 'Espace de travail',
      vatDetails: 'Données TVA',
      invoiceDefaults: 'Paramètres de facture',
      notifications: 'Notifications',
      emailAlerts: 'Alertes par e-mail',
      paymentReminders: 'Rappels de paiement',
      taskReminders: 'Rappels de tâches',
      billingTitle: 'Facturation et Abonnement',
      billingSubtitle: 'Gérez votre plan et vos options d\'abonnement.',
      subscriptionBilling: 'Abonnement et facturation',
      manageSubscription: 'Gérer l\'abonnement',
      currentPlan: 'Plan actuel',
      emailPreferences: {
        title: 'Préférences Email',
        subtitle: 'Contrôlez quels emails vous recevez de TISSCA.',
        manage: 'Gérer',
        backToSettings: 'Retour aux Paramètres',
        categories: 'Catégories d\'Email',
        categoriesDesc: 'Choisissez les types d\'emails que vous souhaitez recevoir.',
        productUpdates: 'Mises à Jour Produit',
        productUpdatesDesc: 'Actualités sur les fonctionnalités et améliorations.',
        featureEmails: 'Conseils Fonctionnalités',
        featureEmailsDesc: 'Conseils sur les fonctionnalités que vous n\'avez pas encore essayées.',
        upgradeEmails: 'Suggestions de Mise à Niveau',
        upgradeEmailsDesc: 'Recommandations basées sur votre utilisation.',
        billingEmails: 'Notifications de Facturation',
        billingEmailsDesc: 'Confirmations de paiement et mises à jour de facturation.',
        reminderEmails: 'Rappels',
        reminderEmailsDesc: 'Rappels de tâches et d\'échéances.',
        supportFollowup: 'Réponses Support',
        supportFollowupDesc: 'Réponses à vos demandes de support.',
        weeklySummary: 'Résumé Hebdomadaire',
        weeklySummaryDesc: 'Résumé hebdomadaire de l\'activité de votre espace de travail.',
        unsubscribeAll: 'Se Désabonner de Tout',
        unsubscribeAllDesc: 'Désactiver tous les emails non essentiels. Les notifications essentielles continueront d\'être envoyées.',
        frequencyTitle: 'Fréquence des Emails',
        frequencyDesc: 'À quelle fréquence regrouper les emails non urgents ?',
        frequencies: { immediate: 'Immédiat', daily: 'Résumé Quotidien', weekly: 'Résumé Hebdomadaire' },
        essentialNotice: 'Les notifications essentielles (réinitialisation de mot de passe, alertes de sécurité) sont toujours envoyées indépendamment de vos préférences.',
        saveSuccess: 'Préférences email enregistrées avec succès.',
        saveError: 'Échec de l\'enregistrement des préférences. Veuillez réessayer.',
      },
      personalDetails: {
        title: 'Données Personnelles',
        subtitle: 'Gérez votre nom, date de naissance, numéro de téléphone et adresse.',
        manage: 'Gérer',
        backToSettings: 'Retour aux Paramètres',
        fullName: 'Nom complet',
        dateOfBirth: 'Date de naissance',
        phone: 'Numéro de téléphone',
        address: 'Adresse',
        saveSuccess: 'Données personnelles enregistrées avec succès.',
        saveError: 'Échec de l\'enregistrement. Veuillez réessayer.',
        save: 'Enregistrer',
        saving: 'Enregistrement…',
      },
      security: {
        title: 'Sécurité',
        subtitle: 'Gérez l\'email de votre compte, le mot de passe et les paramètres de sécurité.',
        manage: 'Gérer',
        backToSettings: 'Retour aux Paramètres',
        accountEmail: 'Email du Compte',
        accountEmailDesc: 'L\'adresse email associée à votre compte.',
        currentEmail: 'Email actuel',
        newEmail: 'Nouvelle adresse email',
        updateEmail: 'Mettre à jour l\'email',
        updatingEmail: 'Mise à jour…',
        emailUpdateSuccess: 'Email de vérification envoyé à la nouvelle adresse. Vérifiez votre boîte de réception.',
        emailUpdateVerify: 'Vous devrez vérifier votre nouvel email avant que la modification ne prenne effet.',
        passwordManagement: 'Mot de passe',
        passwordManagementDesc: 'Mettez à jour le mot de passe de votre compte.',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le nouveau mot de passe',
        updatePassword: 'Mettre à jour le mot de passe',
        updatingPassword: 'Mise à jour…',
        passwordUpdateSuccess: 'Mot de passe mis à jour avec succès.',
        passwordMismatch: 'Les mots de passe ne correspondent pas.',
        passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
        forgotPassword: 'Mot de Passe Oublié',
        forgotPasswordDesc: 'Envoyer un lien de réinitialisation à l\'email de votre compte.',
        sendResetEmail: 'Envoyer l\'email de réinitialisation',
        sendingResetEmail: 'Envoi…',
        resetEmailSent: 'Email de réinitialisation envoyé. Vérifiez votre boîte de réception.',
        resetEmailError: 'Échec de l\'envoi de l\'email de réinitialisation. Veuillez réessayer.',
      },
    },
    feedback: {
      title: 'Aide et Commentaires',
      tooltip: 'Aide et Commentaires',
      tabs: { help: '🤔 Aide', issue: '🐛 Problème', suggestion: '💡 Améliorer', review: '⭐ Avis' },
      stepOf: 'Étape {step} sur {total}',
      headlinePlaceholder: 'Titre bref (obligatoire)',
      descriptionPlaceholder: 'Dites-nous en plus... (obligatoire)',
      emailPlaceholder: 'E-mail (facultatif — si vous souhaitez une réponse)',
      back: '← Retour',
      close: 'Fermer',
      next: 'Suivant →',
      submit: '✓ Envoyer',
      submitting: 'Envoi en cours...',
      thankYou: 'Merci !',
      thankYouMessage: 'Votre commentaire a été reçu et nous aidera à améliorer TISSCA.',
      contactNote: 'Nous vous contacterons à {email} si vous avez besoin d\'une réponse.',
      questions: {
        help: ['Qu\'essayez-vous de faire ?', 'Quelle partie de TISSCA utilisez-vous ?', 'Pouvez-vous décrire ce qui s\'est passé ?'],
        issue: ['Qu\'est-ce qui n\'a pas fonctionné ?', 'Quelle partie de TISSCA ?', 'Pouvez-vous décrire le problème en détail ?', 'Qu\'attendiez-vous qu\'il se passe ?'],
        suggestion: ['Qu\'aimeriez-vous voir amélioré ?', 'Sur quel domaine aimeriez-vous que nous nous concentrions ?', 'Comment cette amélioration vous aiderait-elle ?'],
        review: ['Quelle est votre expérience globale ?', 'Qu\'est-ce qui fonctionne bien ?', 'Que pourrions-nous améliorer ?'],
      },
      labels: {
        whatDoing: 'Qu\'essayez-vous de faire ?',
        whichArea: 'Quelle partie de TISSCA utilisez-vous ?',
        selectArea: 'Sélectionnez un domaine',
        blocked: 'Êtes-vous bloqué en ce moment ?',
        blockedYes: 'Oui, je suis bloqué',
        blockedNo: 'Non, je demande simplement',
        extraDetail: 'Détail supplémentaire (facultatif)',
        issueTitle: 'Quel est le problème ?',
        affectedArea: 'Quelle zone est concernée ?',
        describeIssue: 'Décrivez le problème',
        expectedBehaviour: 'Qu\'attendiez-vous qu\'il se passe ? (facultatif)',
        improveTitle: 'Qu\'aimeriez-vous améliorer ?',
        yourSuggestion: 'Décrivez votre suggestion',
        expectedBenefit: 'Comment cela vous aiderait-il ? (facultatif)',
        rateExperience: 'Comment évaluez-vous votre expérience ?',
        reviewTitle: 'Titre (facultatif)',
        reviewComments: 'Un commentaire ? (facultatif)',
        optional: 'facultatif',
        browseFaq: 'Consulter la FAQ et les articles d\'aide',
      },
      areas: {
        homepage: 'Page d\'accueil',
        pricing: 'Tarifs',
        download: 'Téléchargement',
        signin: 'Connexion / Compte',
        memberApp: 'App membre',
        quotesInvoices: 'Devis / Factures',
        leadsJobs: 'Prospects / Chantiers',
        billing: 'Facturation / Abonnement',
        settings: 'Paramètres',
        support: 'Support / Centre d\'aide',
        other: 'Autre',
      },
    },
    cancelReasons: {
      title: 'Avant de partir…',
      subtitle: 'Aidez-nous à nous améliorer — sélectionnez au moins un motif.',
      reasons: {
        tooExpensive: 'Trop cher par mois',
        notEnoughValue: 'Pas assez de valeur pour le prix',
        cantAfford: 'Je ne peux pas me le permettre pour le moment',
        missingFeatures: 'Fonctionnalités manquantes dont j\'ai besoin',
        tooComplicated: 'Trop compliqué / difficile à utiliser',
        switchingProvider: 'Je passe à un autre outil',
        temporaryPause: 'Pause temporaire',
        other: 'Autre',
      },
      otherPlaceholder: 'Dites-nous en plus…',
      requiredMessage: 'Veuillez sélectionner au moins un motif pour continuer.',
      otherRequired: 'Veuillez décrire votre motif.',
      continueCancel: 'Continuer vers l\'annulation',
      goBack: 'Revenir',
    },
    tools: {
      title: 'Devis Général',
      editTitle: 'Modifier le Devis',
      subtitle: 'Outil de devis rapide — ajoutez des postes, ajustez et associez à un prospect ou chantier.',
      editSubtitle: 'Modification d\'un devis existant — les changements mettront à jour la pièce jointe.',
      projectName: 'Nom du Projet / Client',
      lineItems: 'Postes',
      addItem: 'Ajouter un Poste',
      description: 'Description',
      subtotal: 'Sous-total',
      adjustments: 'Ajustements',
      discount: 'Remise',
      vat: 'TVA',
      depositPaid: 'Acompte Versé',
      notes: 'Notes',
      notesPlaceholder: 'Notes supplémentaires, conditions ou termes...',
      summary: 'Récapitulatif',
      total: 'Total',
      balanceDue: 'Solde dû',
      hideBreakdown: 'Masquer le détail',
      viewBreakdown: 'Voir le détail généré',
      generateLead: 'Générer un Prospect',
      addToLead: 'Ajouter au Prospect',
      addToJob: 'Ajouter au Chantier',
      clear: 'Effacer',
      backToTools: 'Retour aux Outils',
      updateEstimate: 'Mettre à jour le Devis',
      newEstimate: 'Nouveau Devis',
      working: 'En cours...',
      saving: 'Enregistrement...',
      generatedBreakdown: 'Détail Généré',
      selectLead: 'Sélectionner un Prospect',
      selectJob: 'Sélectionner un Chantier',
      cancel: 'Annuler',
      attach: 'Joindre',
      searchLeads: 'Rechercher des prospects...',
      searchJobs: 'Rechercher des chantiers...',
      noLeadsFound: 'Aucun prospect trouvé. Créez-en un d\'abord.',
      noJobsFound: 'Aucun chantier trouvé. Créez-en un d\'abord.',
      successLeadTitle: 'Prospect Généré',
      successLeadDesc: 'Votre devis a été enregistré comme nouveau prospect avec le détail complet en pièce jointe.',
      successAttachLead: 'Devis Joint au Prospect',
      successAttachJob: 'Devis Joint au Chantier',
      successUpdate: 'Devis Mis à Jour',
      viewInLeads: 'Voir les Prospects',
      viewInJobs: 'Voir les Chantiers',
      draftRestored: 'Brouillon restauré',
      editing: 'Modification',
      discardNew: 'Abandonner et Recommencer',
      back: '← Retour',
      workspaceNote: 'Configurez votre espace de travail dans les Paramètres pour activer la génération de prospects. Vous pouvez quand même créer des devis sans espace de travail.',
      removeItem: 'Supprimer le poste',
    },
  },
};

/* ─────────────────────── Export map ─────────────────────── */

export const translations: Record<Locale, TranslationStrings> = {
  en,
  pt,
  it,
  es,
  fr,
};
