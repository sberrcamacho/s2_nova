You are a senior frontend engineer and UI/UX engineer.

I am building a personal finance platform called S2 Nova.

The original UI design was created in Figma, but Figma's free trial ended before it provided the generated source/index. Therefore, I need you to reconstruct the design directly in production-quality code.

Do NOT treat this as a simple mockup or prototype.

Build the actual frontend application with reusable components, responsive layouts, proper routing, clean architecture, and production-quality code.

IMPORTANT:
There is NO database yet.

Do not create or configure a database.
Do not create Firebase, Supabase, PostgreSQL, MongoDB, or any other database integration yet.

Instead:
- Use realistic mock data.
- Keep data access behind clean service/repository interfaces.
- Make the architecture ready to replace mock services with a real API later.
- The UI should behave realistically even though the data is currently local/mock.
- Forms, navigation, filters, charts, and interactions should work on the frontend.

==================================================
PROJECT
==================================================

Product name:

S2 Nova

S2 Nova is a personal finance management system composed of:

1. Android mobile application
2. Web financial analytics dashboard

The mobile application is responsible primarily for recording and managing personal financial transactions.

The web dashboard is responsible primarily for visualizing and analyzing the financial information through charts, statistics, KPIs, and reports.

The target audience is individual users managing their personal finances.

Do NOT introduce enterprise/business finance features unless they are directly useful for personal finance.

==================================================
CORE FUNCTIONALITY
==================================================

The mobile application should conceptually support:

- Income tracking
- Expense tracking
- Purchase registration
- Barcode scanning
- Categories
- Budgets
- Transaction history
- Monthly summaries
- Financial statistics
- Search and filtering
- User profile
- Settings

The web dashboard should support:

- Financial overview
- Income
- Expenses
- Categories
- Budgets
- Transaction history
- Financial analytics
- Charts
- Reports
- Date filtering
- Category filtering

The mobile application and web dashboard should visually belong to the same product.

==================================================
S2 NOVA BRAND IDENTITY
==================================================

S2 Nova should feel like a modern fintech startup.

The visual identity combines:

- Personal finance
- Technology
- Innovation
- Data
- Clarity
- A subtle "Nova" concept

"Nova" represents a new beginning, financial clarity, and innovation.

Do NOT make the interface look like a sci-fi game.

Avoid:
- planets
- rockets
- galaxies
- excessive neon
- excessive glow
- futuristic HUD interfaces

Instead, use subtle references to the Nova concept:

- Small four-point sparkles
- Subtle radial gradients
- Soft light effects
- Geometric forms
- Minimal orbital-inspired curves
- Small highlight effects

The overall result should still feel like a professional fintech application.

==================================================
COLOR SYSTEM
==================================================

LIGHT MODE

The existing light-mode concept was already considered good, so preserve the general visual philosophy while refining it where necessary.

Background:
#FFFFFF

Secondary background:
#F7F7FA

Cards:
#FFFFFF

Primary brand:
#6657E8

Secondary brand:
#7B6FF6

Soft accent:
#EAE7FF

Primary text:
#111118

Secondary text:
#666673

Positive financial value:
#22A06B

Negative financial value:
#D64545


DARK MODE

The dark mode must NOT be dark gray.

It should be genuinely deep black.

Background:
#050507

Secondary background:
#09090E

Cards:
#0E0E15

Elevated cards:
#13131D

Primary brand:
#6C5CE7

Secondary brand:
#8578FF

Highlight:
#A69DFF

Primary text:
#FFFFFF

Secondary text:
#A8A8B8

Borders:
#1C1C28

Positive:
#32C98A

Negative:
#FF6262

The visual transformation should be:

LIGHT MODE:
White + green/purple financial accents

DARK MODE:
Deep black + bluish purple

Do NOT use medium gray as the primary dark background.

Do NOT make every element purple.

Purple should be the S2 Nova brand accent.

Green should still be used when it communicates positive financial information.

Red should communicate negative financial information.

==================================================
TYPOGRAPHY
==================================================

Use a modern sans-serif font.

Preferred:

Inter
Manrope
Plus Jakarta Sans

Use a clear typography hierarchy.

Large financial numbers should be prominent.

Headings should be clean and confident.

Secondary information should be visually quieter.

Make sure typography works correctly on both mobile and desktop.

==================================================
LOGO / BRANDING
==================================================

Create a simple S2 Nova wordmark.

"S2" should be the strongest visual element.

"Nova" should act as the supporting wordmark.

The logo may incorporate a very subtle four-point nova/sparkle element.

The logo must work in:

- Mobile app icon
- Header
- Sidebar
- Dashboard
- Splash screen
- Favicon

Do not create a complicated logo.

==================================================
MOBILE UI CONCEPT
==================================================

The mobile application should include the following screens.

AUTHENTICATION

- Login
- Register
- Forgot password

HOME

The home screen should prioritize:

- Current balance
- Income
- Expenses
- Savings
- Recent transactions
- Spending overview

The balance card can use a subtle black-to-bluish-purple gradient in dark mode.

TRANSACTIONS

Include:

- Transaction list
- Search
- Category filters
- Date filters
- Income/expense filtering
- Transaction details

ADD TRANSACTION

Allow:

- Expense
- Income
- Amount
- Category
- Date
- Description
- Payment method

BARCODE SCANNER

Create a modern barcode scanner screen.

Dark camera interface.

Purple scanning frame.

Subtle animated scanning line.

After scanning, show product information and allow the user to confirm the purchase.

Remember:

A barcode does not inherently contain all product information.

For now, simulate the product lookup with mock data.

The architecture should later allow a real product database/API to be connected.

BUDGETS

Show:

- Monthly budget
- Current spending
- Remaining budget
- Progress
- Category budgets

STATISTICS

Show:

- Spending by category
- Income vs expenses
- Monthly spending
- Savings trend

PROFILE

Include:

- User information
- Preferences
- Theme selection
- Currency
- Notifications
- Logout

==================================================
WEB DASHBOARD
==================================================

Build a responsive desktop-first analytics dashboard.

Use a professional SaaS/fintech layout.

Suggested structure:

SIDEBAR

- Overview
- Transactions
- Expenses
- Income
- Budgets
- Analytics
- Reports
- Settings

HEADER

- Page title
- Date selector
- Notifications
- User avatar

OVERVIEW

Include KPI cards:

- Current balance
- Total income
- Total expenses
- Savings

Charts:

- Income vs expenses
- Spending trend
- Spending by category
- Budget progress

TRANSACTIONS

Create a professional data table.

Columns can include:

- Date
- Description
- Category
- Amount
- Type
- Status

Include:

- Search
- Filters
- Sorting
- Pagination or sensible mock pagination

ANALYTICS

Include:

- Category analysis
- Spending trends
- Monthly comparison
- Savings trend
- Budget performance

REPORTS

Create a clean report-oriented page.

The actual export functionality can remain mocked for now, but the interface should be production-ready.

==================================================
CHART DESIGN
==================================================

Charts are important to the S2 Nova identity.

Use:

- Line charts
- Bar charts
- Donut charts
- Area charts

Keep charts clean and readable.

Use bluish-purple as the main visualization color.

Use green for positive financial values.

Use red for negative financial values.

Avoid overly colorful charts.

Charts should look professional rather than decorative.

==================================================
DESIGN SYSTEM
==================================================

Create reusable components.

Examples:

- Button
- Input
- Select
- Modal
- Card
- Badge
- Avatar
- Navigation item
- Sidebar
- Header
- KPI card
- Chart card
- Transaction row
- Transaction table
- Progress bar
- Tabs
- Dropdown
- Toast
- Empty state
- Loading state

Use a consistent spacing system.

Use consistent border radii.

Use consistent shadows.

Use consistent typography.

Do not hardcode the same styles repeatedly.

Create reusable design tokens for:

- Colors
- Typography
- Spacing
- Border radius
- Shadows
- Transitions

==================================================
RESPONSIVENESS
==================================================

The web dashboard must work properly on:

- Desktop
- Laptop
- Tablet

The mobile application UI should be optimized for mobile screen sizes.

Do not simply shrink the desktop dashboard.

Create intentional responsive behavior.

==================================================
ACCESSIBILITY
==================================================

Use:

- Proper semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible labels
- Sufficient color contrast
- Appropriate button sizes
- Meaningful ARIA labels where necessary

Do not rely only on color to communicate financial status.

==================================================
TECHNICAL REQUIREMENTS
==================================================

Before coding, inspect the existing project structure if files are provided.

Do not unnecessarily replace an existing working project.

If no project exists, create a clean frontend project.

Use a modern component-based architecture.

Prefer TypeScript.

Use a modern frontend framework such as React with Vite or Next.js, depending on the existing project structure.

Use a modern CSS approach such as Tailwind CSS if appropriate.

Use a chart library such as Recharts if using React.

Use Lucide or another consistent icon library.

Avoid unnecessary dependencies.

Keep components modular.

Keep business logic separated from presentation.

==================================================
DATA ARCHITECTURE
==================================================

There is NO backend/database at this stage.

Create mock services such as:

- transactionService
- budgetService
- analyticsService
- userService
- productService

These should return realistic mock data.

For example:

transactionService.getTransactions()

analyticsService.getMonthlySummary()

productService.lookupBarcode()

The UI should consume these services rather than directly depending on hardcoded arrays inside components.

This will allow us to replace the mock implementation with a real REST API later.

==================================================
MOCK DATA
==================================================

Create realistic personal-finance mock data.

Examples:

Categories:

- Food
- Transportation
- Shopping
- Entertainment
- Health
- Education
- Bills
- Subscriptions
- Other

Transactions should have:

- id
- description
- amount
- type
- category
- date
- paymentMethod

Use realistic Colombian financial examples if appropriate.

Currency:

COP

Use Colombian peso formatting.

Example:

$125.000

rather than:

$125,000

==================================================
INTERACTIONS
==================================================

The frontend should actually work.

Examples:

- Navigation changes pages.
- Filters modify visible transactions.
- Search filters transaction data.
- Date filters update charts using mock data.
- Theme switch changes between light and dark mode.
- Buttons have appropriate states.
- Forms validate input.
- Adding a transaction updates the local mock state.
- Barcode scanning can use a simulated scanner/product lookup.
- Budget progress updates when mock transactions change.

Do not create static screenshots disguised as an application.

==================================================
DARK MODE
==================================================

Dark mode is especially important.

It should look like:

S2 NOVA
Deep Black
Bluish Purple
White

The application should feel premium in dark mode.

Use subtle purple gradients on important elements.

Example:

background:
#050507

card:
#0E0E15

primary:
#6C5CE7

highlight:
#A69DFF

Do not make the entire interface purple.

Do not use dark gray as the main background.

==================================================
Figma-to-Code Interpretation
==================================================

The following was the original Figma design specification.

Use it as a design reference, but do not blindly reproduce it.

Improve it where necessary to create a coherent production UI.

[BEGIN FIGMA DESIGN SPECIFICATION]

Redesign the entire visual identity of this personal finance application and web dashboard around the brand "S2 Nova".

The existing design is a good foundation, but you have creative freedom to improve the visual design, components, branding, color system, typography, icons, cards, buttons, charts, navigation, and overall visual hierarchy.

Do NOT change the core functionality or information architecture.

S2 Nova should feel like a modern fintech startup.

The visual identity combines:
- Personal finance
- Technology
- Innovation
- Data
- Clarity
- A subtle "Nova" concept

"Nova" represents a new beginning, financial clarity, and innovation.

Avoid excessive sci-fi aesthetics, planets, rockets, galaxies, excessive neon, and futuristic HUD interfaces.

Instead, use subtle references to the Nova concept:
- Small four-point sparkles
- Subtle radial gradients
- Soft light effects
- Geometric forms
- Minimal orbital-inspired curves
- Small highlight effects

LIGHT MODE:
White backgrounds
Purple/green financial accents
Clean and fresh appearance

DARK MODE:
True deep-black backgrounds
Bluish-purple primary accent
White text

The dark mode should NOT be dark gray.

Use:

Background #050507
Secondary background #09090E
Cards #0E0E15
Elevated cards #13131D
Primary #6C5CE7
Secondary #8578FF
Highlight #A69DFF
Primary text #FFFFFF
Secondary text #A8A8B8
Borders #1C1C28
Positive #32C98A
Negative #FF6262

Typography:
Inter, Manrope, or Plus Jakarta Sans.

Create a simple S2 Nova wordmark.

"S2" should be the strongest visual element.

"Nova" should be the supporting wordmark.

The logo may incorporate a subtle four-point nova/sparkle element.

The mobile application should include:
- Login
- Register
- Forgot password
- Home
- Transactions
- Add transaction
- Barcode scanner
- Budgets
- Statistics
- Profile
- Settings

The web dashboard should include:
- Overview
- Transactions
- Expenses
- Income
- Budgets
- Analytics
- Reports
- Settings

The home screen should prioritize:
- Current balance
- Income
- Expenses
- Savings
- Recent transactions
- Spending overview

The barcode scanner should have:
- Dark camera interface
- Purple scanning frame
- Subtle animated scanning line
- Product information
- Purchase confirmation

The web dashboard should include:
- Current balance
- Total income
- Total expenses
- Savings
- Income vs expenses
- Spending trends
- Spending by category
- Budget progress
- Transaction tables
- Filters
- Analytics
- Reports

Use:
- Line charts
- Bar charts
- Donut charts
- Area charts

Use bluish-purple as the main visualization color.

Use green for positive financial values.

Use red for negative financial values.

Create a reusable design system.

Use responsive layouts.

Maintain strong accessibility.

[END FIGMA DESIGN SPECIFICATION]

==================================================
FINAL OBJECTIVE
==================================================

The final result should be a real production-quality frontend for S2 Nova, not a static prototype.

It should look like a polished fintech startup product.

Prioritize:

1. Visual quality
2. Usability
3. Responsive behavior
4. Component reusability
5. Clean architecture
6. Realistic interactions
7. Easy future API integration

Do not implement the database yet.

Do not implement authentication against a real backend yet.

Do not invent backend endpoints.

Use mock/local data until the backend architecture is defined.

At the end, explain:

- Project structure
- Technologies used
- Main components
- Routing structure
- Mock data architecture
- How the frontend can later connect to a backend/database
- How to run the project
- Any assumptions you made while reconstructing the Figma design
