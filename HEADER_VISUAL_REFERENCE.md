# Standard Website Header - Visual Reference

## Header Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                         │
│  BUILDR                                    About  |  Costs  |  Standards  |  Pricing  │
│  [Logo]                                                                                 │
│                                                                   [Sign in] [Create acc]│
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## NOT Logged In - Unauthenticated User

### Header State
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BUILDR                    Navigation Links                  [Sign in] [CrAc] │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Buttons Detail
- **Sign in button**
  - Border: 1px primary color
  - Text: Primary color, small, medium weight
  - Height: 40px (Tailwind h-10)
  - Padding: px-4 py-2
  - Hover: Light gray background
  - Border radius: Rounded corners

- **Create account button**
  - Background: Primary color
  - Text: White, small, medium weight
  - Height: 40px (Tailwind h-10) - **matches Sign in button**
  - Padding: px-4 py-2
  - Hover: Accent color background
  - Border radius: Rounded corners

Both buttons are exactly the same height, creating visual consistency.

## Logged In - Authenticated User

### Header State (Closed)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BUILDR                    Navigation Links              [john@example.com] ▾ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Button Detail
- **User menu button**
  - Shows: User's full name (or email as fallback)
  - Has dropdown chevron icon
  - Height: 40px (matches login buttons)
  - Hover: Light gray background, text changes to accent color
  - Icon: 16x16 SVG, rotates 180° when menu open

### Header State (Dropdown Open)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BUILDR                    Navigation Links              [john@example.com] ▲ │
│                                                                               │
│                                          ┌─────────────────────────────────┐ │
│                                          │ 👤 Account settings             │ │
│                                          │ 📄 My quotes                    │ │
│                                          │ 📋 My invoices                  │ │
│                                          │ ─────────────────────────────── │ │
│                                          │ 🚪 Log out                      │ │
│                                          └─────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Dropdown Menu Detail
- **Position**: Absolute, right-aligned below button
- **Width**: 224px (Tailwind w-56)
- **Top offset**: 8px below button (mt-2)
- **Background**: White with gray border
- **Shadow**: Standard shadow-lg

### Menu Items
1. **Account settings**
   - Icon: User avatar (16x16)
   - Text: "Account settings"
   - Link: `/account/profile`
   - Hover: Light gray background

2. **My quotes**
   - Icon: Document/notes (16x16)
   - Text: "My quotes"
   - Link: `/account/quotes`
   - Hover: Light gray background

3. **My invoices**
   - Icon: Document/list (16x16)
   - Text: "My invoices"
   - Link: `/account/invoices`
   - Hover: Light gray background

4. **Divider** (horizontal line)
   - Visual separator before logout

5. **Log out** (Last item)
   - Icon: Exit/sign-out (16x16)
   - Text: "Log out" in red
   - Color: Red (#dc2626)
   - Hover: Red background (hover:bg-red-50)
   - Action: Logs out and redirects to home

## Responsive Behavior

### Desktop (≥768px)
- Header fully visible
- Navigation in center
- Auth UI in top right
- All buttons and dropdown visible

### Mobile (<768px)
- Logo visible
- Navigation hidden (hamburger menu - existing)
- Auth UI takes right side
- Buttons stack or use mobile-optimized layout
- Dropdown menu works the same

## Interaction States

### Button States

#### Sign in / Create account (Not Logged In)
```
Default:     [Sign in]  [Create account]
Hover:       [Sign in*] [Create account*]  (* with background)
Click:       Navigate to /sign-in or /sign-up
```

#### User Menu Button (Logged In)
```
Default:     [john@example.com ▼]
Hover:       [john@example.com ▼]  (lighter bg)
Open:        [john@example.com ▲]  (chevron rotates)
Closed:      [john@example.com ▼]  (chevron rotates back)
```

#### Dropdown Menu Items
```
Default:     [Account settings    ]
Hover:       [Account settings... ]  (gray bg)
Click:       Navigate to /account/profile + close menu

Default:     [My quotes          ]
Hover:       [My quotes...       ]  (gray bg)
Click:       Navigate to /account/quotes + close menu

Default:     [My invoices        ]
Hover:       [My invoices...     ]  (gray bg)
Click:       Navigate to /account/invoices + close menu

Default:     [Log out            ]
Hover:       [Log out            ]  (red bg)
Click:       Sign out + close menu + redirect to /
```

## Spacing & Dimensions

### Header Container
- Max width: 1200px
- Horizontal padding: 16px (mobile), 32px (desktop)
- Height: 64px (h-16)
- Items vertically centered

### Auth Section (Right side)
- Gap between buttons: 12px (gap-3)
- Button padding: 16px horizontal, 8px vertical (px-4 py-2)
- Button height: 40px (h-10)

### Dropdown Menu
- Width: 224px (w-56)
- Top offset: 8px (mt-2)
- Item padding: 16px horizontal, 12px vertical (px-4 py-3)
- Icon size: 16x16 pixels
- Gap between icon and text: 8px (gap-2)

### Icons
- All icons: 16x16 pixels
- Stroke width: 1.5-2
- SVG format, inline

## Color Scheme

### Default (Light Theme)
- **Primary color**: Brand blue
- **Accent color**: Brand accent (hover state)
- **Secondary text**: Gray-600
- **Background**: White
- **Border**: Gray-200
- **Hover background**: Gray-50
- **Logout hover**: Red-50 (#fef2f2)
- **Logout text**: Red-600 (#dc2626)
- **Shadow**: Standard box-shadow

### Typography
- **Font family**: System font stack (inherited)
- **Button text**: 14px (text-sm), 500 weight (font-medium)
- **Menu items**: 14px (text-sm), normal weight
- **User name**: 14px (text-sm), 500 weight (font-medium)

## Loading State

When component mounts and auth state is being checked:
- **Rendered**: Nothing (returns null)
- **Reason**: Prevent flash of unauthenticated UI
- **Duration**: ~100-200ms typically
- **After**: Shows correct UI based on auth state

## Key Features

✅ **Visual Consistency**
- Both login buttons same height
- Menu button matches button height
- Proper spacing and alignment
- Icon sizing consistent (16x16)

✅ **User Experience**
- Instant feedback on interaction
- Smooth transitions (CSS)
- Icon rotation animation for dropdown
- Click-outside detection for menu

✅ **Accessibility**
- ARIA labels and roles
- Proper semantic HTML
- Color contrast meets WCAG
- Keyboard navigable

✅ **Performance**
- No unnecessary re-renders
- Efficient state management
- Smooth CSS animations (not JS)
- Lazy loading of profile data

✅ **Security**
- Auth tokens managed by Supabase
- Logout clears client state
- No sensitive data in DOM
- Proper API authentication

## Implementation Files

- **Component**: `src/components/AuthNav.tsx`
- **Used in**: `src/components/GlobalHeader.tsx`
- **Styling**: Tailwind CSS utility classes
- **Auth**: Supabase JavaScript client
- **Icons**: Inline SVG components

## Browser Support

✅ All modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Testing Checklist

- [ ] Not logged in: Both buttons visible and clickable
- [ ] Sign in: Redirects to /sign-in page
- [ ] Create account: Redirects to /sign-up page
- [ ] Logged in: User name appears instead of buttons
- [ ] Dropdown: Opens/closes on click
- [ ] Dropdown: Closes when clicking outside
- [ ] Account settings: Navigates to /account/profile
- [ ] My quotes: Navigates to /account/quotes
- [ ] My invoices: Navigates to /account/invoices
- [ ] Log out: Signs out, clears state, redirects to /
- [ ] No flicker: Smooth transition between states
- [ ] Mobile: Buttons/menu work on mobile devices
- [ ] Performance: No layout shift or re-renders

## Notes

- The header is sticky and stays at top on scroll
- Z-index: 50 for header, 50 for dropdown (properly layered)
- No duplicate headers in page layouts
- Single source of truth for auth state
- Real-time updates via Supabase event subscription
