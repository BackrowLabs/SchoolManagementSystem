Build a modern, mobile-friendly web application UI for a school/college management system with a strong focus on clean design, usability, and professional look.

🎨 Design Requirements
The UI must be fully responsive (mobile-first design)
Avoid low opacity and transparent dropdowns — all dropdowns must have:
Solid background (no transparency)
High contrast text
Clear hover and selected states
Use a clean design system (similar to modern SaaS dashboards)
Maintain proper:
Spacing
Typography hierarchy
Button styles
Form inputs
Use a consistent color palette (primary, secondary, success, warning)
Add subtle shadows, rounded corners, and card-based layout
Ensure accessibility (good contrast, readable fonts)

If needed, use a design approach similar to modern admin dashboards (like Stripe, Notion, or clean Tailwind UI style).

👥 User Roles & Permissions
1. Admin (Super User)
Full access to all features
Capabilities:
Create and manage fee structures
Publish fee structures to student profiles
Approve new student admissions
Approve fee payment entries
2. Office Staff
Capabilities:
Add new students
Update existing student details
Collect fee payments
Submit payments for admin approval
Generate receipts:
If not approved → clearly show “Unapproved Receipt” watermark or label
If approved → normal receipt
3. Teacher
Capabilities:
Mark attendance (based on class)
Add grades (based on subject)
📱 UX Features to Include
Dashboard per role
Sidebar navigation (collapsible for mobile)
Tables with sorting, filtering, and search
Forms with validation
Status indicators:
Approved / Pending / Rejected
Clear CTA buttons (Approve, Submit, Save, etc.)
Toast notifications or alerts for actions
⚙️ Technical Expectations
Use modern frontend practices (React + Tailwind preferred)
Component-based structure
Reusable UI components
Clean state handling
Well-structured code
❗ Important Fixes (Must Address)
Remove any transparent or hard-to-read UI elements
Improve dropdown visibility and usability
Ensure the app does NOT look dull or outdated
Focus heavily on professional, polished UI

------------------------
Student

* Add Studen