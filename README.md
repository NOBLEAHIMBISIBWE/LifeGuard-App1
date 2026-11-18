# LifeGuard — Uganda National GBV Platform

LifeGuard is a Uganda-focused emergency and confidential incident-reporting application prototype for Gender-Based Violence (GBV), sexual harassment, medical incidents, wearable SOS reporting, and coordination between citizens and authorized response staff.

---

## 🌟 Comprehensive System Features & Functionality

### 1. 🔐 Authentication & Identity Management (`/auth`)

- **Email Sign-In**: Email/password registration and sign-in through Supabase Auth. Phone details are retained in the profile metadata; phone/password sign-in remains disabled until an SMS verification provider is configured.
- **Registration Form**: Captures Full Name, National ID Number (NIN), Gender selection, Email Address, Password (with eye toggle visibility), and Ugandan Phone Number with `+256` flag selector.
- **Session Persistence**: Supabase Auth sessions only; mock/local-storage sign-in fallbacks are disabled.

### 2. 📋 Incident Reporting Engine (`/home`)

- **Standard Incident Reporting**:
  - **Category Selection**: GBV, Sexual Harassment, Medical Emergency, Domestic Violence, Assault, Robbery, etc.
  - **District Selection**: Full dropdown list of Ugandan districts (Kampala, Wakiso, Mukono, Jinja, Gulu, Mbarara, etc.).
  - **Location & GPS**: Automatic device geolocation coordinates (`lat, lng`) with manual landmark override.
  - **Private Evidence Upload**: Authenticated reporters can upload up to 10 image, audio, or video files (20 MB each) to a private Supabase Storage bucket. Only the case owner and authorized response staff can read them.
- **Anonymous Incident Reporting**:
  - **Identity Shielding**: Submits reports confidentially without attaching user profile data, email, or phone numbers.
  - **Secret Tracking Token**: Generates a high-entropy tracking code and provides a 1-tap **Copy** button. A rate-limited Edge Function returns only case status, incident category, date, and district; it never returns reporter identity, narrative, or precise coordinates.

### 3. 📂 Case Tracking & Management (`/history`)

- **Submitted Cases List**: Displays all user-submitted incident reports with status badges (_Submitted_, _Under Review_, _Dispatched_, _Resolved_).
- **Anonymous Case Lookup**: A protected, rate-limited Supabase Edge Function lets reporters check a limited case summary using their tracking token without signing in. Anonymous evidence attachments are intentionally disabled until a separate token-authorized upload flow is implemented.

### 4. 🚨 Emergency Danger Banner & Contacts (`/contacts`)

- **Immediate Danger Banner**: Prominent red banner on the main dashboard for single-tap emergency action.
- **National Hotline Quick-Dial**:
  - Police Emergency: `999`
  - National GBV Helpline: `0800 200 600`
  - Childline Uganda: `116`
  - Medical Ambulance Dispatch

### 5. ⌚ Wearable SOS Integration (`/device` & `/sos`)

- **Bluetooth Low Energy (BLE)**: The device screen supports the browser/device BLE workflow where supported. Compatibility must be tested with the target wearable hardware before field use.
- **Screening Health Metrics**: Displays heart-rate (BPM) and SpO₂ readings supplied by the connected device; readings are not medical diagnoses.
- **SOS Alarm Sequence**: The app records an SOS incident and makes it visible to authorized responders through the connected Supabase dashboard when online. SMS, voice-call, and external emergency-service dispatch require separate provider integrations and are not yet enabled.

### 6. 💬 Automated Support Guide

- **Guided Support Messages**: The in-app guide provides basic safety information and helpline details. It is not a live counselor, is not monitored, and cannot dispatch emergency services. Users in immediate danger should call the listed emergency numbers.

### 7. 🛡️ First Responder & Dispatcher Portal (`/responder`)

- **Live Incident Dashboard**: Dedicated portal for emergency dispatchers and field officers to monitor incoming incidents, filter by status, review GPS coordinates, and update case progress.

### 8. ⚙️ User Settings & Privacy Control (`/settings`)

- **User Profile Badge**: Circular red avatar badge with an edit pencil indicator, full user name, and _"Public Citizen"_ designation.
- **GENERAL**:
  - **Notifications**: Interactive toggle switch (ON / green).
  - **Change Password**: Modal dialog for updating account credentials.
  - **Language**: Language preference indicator (_English_).
- **APPEARANCE**:
  - **Theme**: Light theme interface (_Light_).
- **SECURITY**:
  - **PIN Protection**: Interactive PIN lock toggle switch.
  - **Auto Logout**: Interactive auto-logout toggle switch.
- **INFORMATION**:
  - **FAQs Modal**: Answers to common questions regarding reporting, anonymity, and emergency contacts.
  - **Privacy Policy Modal**: Explains data encryption standards and anonymous reporting identity protection under Ugandan law.
  - **Terms of Service Modal**: Outlines responsible usage policy for emergency reporting services.
- **Account Actions**:
  - **Delete Account**: Confirmation dialog for account deletion.
  - **Log Out**: Card button that safely signs out the user and redirects to `/auth`.

### 9. 🗺️ Location Services & Google Maps

- **Automatic Geolocation**: Uses browser GPS (`navigator.geolocation`) to auto-populate coordinates.
- **Google Maps Integration**: Set `VITE_GOOGLE_MAPS_API_KEY` for high-precision interactive Google Maps embeds with automatic OpenStreetMap fallback when unconfigured.

### 10. 🛡️ Admin Incident Panel (`/admin`)

- **Incoming Sender Reports Queue**: Full-width administrative dashboard receiving standard, anonymous, and SOS reports directly from senders in real time.
- **Sender & Privacy Handling**: Displays sender identity (name, phone, email, NIN) on standard/SOS reports while keeping anonymous reports strictly identity-shielded via a high-entropy tracking token (`TOKEN-LG-...`).
- **Triage, Dispatch & Notes**: Filter by queue, district, or status; inspect GPS map pins and wearable vitals; update case status (`Acknowledge`, `Dispatch Unit`, `Mark Resolved`, `Dismiss`); post official timeline notes synced to the sender; and export filtered reports to CSV.

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env` and set the values from the Supabase project settings.

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are browser-safe configuration.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are used by server-side functions.
- `SUPABASE_SERVICE_ROLE_KEY` is a server-only secret. Never prefix it with `VITE_`, commit it, or expose it to a browser.

For the configured Supabase project, use its Project URL and publishable key from the Supabase API settings. Add the variables to your local `.env` and to the environment-variable settings of the deployment host.

### Database and access control

The `lifeguard` Supabase project has the core LifeGuard schema provisioned. The repeatable schema definition is tracked in `supabase/migrations/20261118113000_lifeguard_core_schema.sql`:

- `profiles`, `user_roles`, `contacts`
- `incidents`, `incident_events`, `health_readings`

Row Level Security is enabled on all six tables. Citizens can access their own records; responders and administrators receive incident access through database roles. Anonymous reports can be submitted without a signed-in account. The `anonymous-case-status` Edge Function performs token lookup, rate-limits attempts, and returns only a limited case summary.

After creating your first account, promote the trusted administrator from the Supabase SQL Editor. Replace the email with the administrator's verified sign-in email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id, role) do nothing;
```

Create responder accounts in the same way, changing `'admin'` to `'responder'`. Do not let users assign their own roles.

Email/password authentication is wired to Supabase Auth. Registration stores the Ugandan phone number as profile metadata. Phone-based sign-in is intentionally hidden until an SMS provider and verified-phone registration flow are configured. Configure email confirmation and password-reset redirect URLs for your deployed app domain.

The private `incident-evidence` Storage bucket is provisioned with a 20 MB per-file limit and MIME restrictions. Authenticated reporters can upload evidence under their own incident folder; case owners and authorized response staff can read it. Anonymous evidence uploads remain disabled until a token-authorized upload workflow is implemented.

---

## 🚀 Vercel Deployment

The repository includes `vercel.json` and a Vercel-aware Nitro configuration for TanStack Start. Import `NOBLEAHIMBISIBWE/LifeGuard-App1` into Vercel and use the **TanStack Start** framework preset. Keep the root directory at the repository root and use `npm run build` as the build command.

Add these environment variables for Production, Preview, and Development:

- `VITE_SUPABASE_URL` = `https://dsrzhljdjenxttququlo.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = the Supabase project's publishable key
- `SUPABASE_URL` = the same Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = the same publishable key
- `VITE_GOOGLE_MAPS_API_KEY` = optional; only if Google Maps features are enabled

Do not put a Supabase service-role or secret key in any `VITE_` variable. The anonymous case lookup Edge Function uses the Supabase-managed Edge Function environment and does not require its service-role key in Vercel.

After the first deployment, set the deployed domain as the Supabase Auth Site URL and add the deployed domain's auth callback/redirect URL in Supabase Authentication → URL Configuration. Redeploy after changing Vercel environment variables.

GitHub Actions runs a production build check on pushes and pull requests to `main`.

---

## 🚀 Getting Started locally

### Prerequisites

- Node.js 22
- npm / bun

### Installation & Execution

```sh
# 1. Clone repository
git clone https://github.com/NOBLEAHIMBISIBWE/LifeGuard-App1.git
cd LifeGuard-App1

# 2. Install dependencies
npm install

# 3. Start development server (Port 3000)
npm run dev

# 4. Build for production
npm run build
```

---

## 🧱 Tech Stack

- **Frontend Framework**: React 19 + Vite + TanStack Router / Start
- **Styling**: Tailwind CSS + Lucide React Icons
- **Backend & Auth**: Supabase Auth & Database Client
- **Type Safety**: TypeScript
