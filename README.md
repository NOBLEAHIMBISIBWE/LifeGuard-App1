# LifeGuard — Uganda National GBV Platform

LifeGuard is Uganda's national digital platform for Gender-Based Violence (GBV) and sexual harassment prevention, confidential incident reporting, wearable SOS dispatch, AI counseling support, and emergency responder coordination.

---

## 🌟 Comprehensive System Features & Functionality

### 1. 🔐 Authentication & Identity Management (`/auth`)

- **Dual Sign-In Modes**: Toggle between **Email Address** and **Ugandan Phone Number** authentication.
- **Registration Form**: Captures Full Name, National ID Number (NIN), Gender selection, Email Address, Password (with eye toggle visibility), and Ugandan Phone Number with `+256` flag selector.
- **Session Persistence**: Supabase Auth sessions only; mock/local-storage sign-in fallbacks are disabled.

### 2. 📋 Incident Reporting Engine (`/home`)

- **Standard Incident Reporting**:
  - **Category Selection**: GBV, Sexual Harassment, Medical Emergency, Domestic Violence, Assault, Robbery, etc.
  - **District Selection**: Full dropdown list of Ugandan districts (Kampala, Wakiso, Mukono, Jinja, Gulu, Mbarara, etc.).
  - **Location & GPS**: Automatic device geolocation coordinates (`lat, lng`) with manual landmark override.
  - **Evidence Upload**: Multi-file attachment support for evidence photos, audio clips, and video recordings.
- **Anonymous Incident Reporting**:
  - **Identity Shielding**: Submits reports confidentially without attaching user profile data, email, or phone numbers.
  - **Secret Tracking Token**: Automatically generates a unique tracking code (e.g. `TOKEN-LG-839201`) with a 1-tap **Copy** button for safe case follow-up.

### 3. 📂 Case Tracking & Management (`/history`)

- **Submitted Cases List**: Displays all user-submitted incident reports with status badges (_Submitted_, _Under Review_, _Dispatched_, _Resolved_).
- **Anonymous Case Lookup**: Dedicated search input enabling anonymous reporters to look up their case status using their secret tracking token without signing in.

### 4. 🚨 Emergency Danger Banner & Contacts (`/contacts`)

- **Immediate Danger Banner**: Prominent red banner on the main dashboard for single-tap emergency action.
- **National Hotline Quick-Dial**:
  - Police Emergency: `999`
  - National GBV Helpline: `0800 200 600`
  - Childline Uganda: `116`
  - Medical Ambulance Dispatch

### 5. ⌚ Wearable SOS Integration (`/device` & `/sos`)

- **Bluetooth Low Energy (BLE)**: Connects with LifeGuard smart wearable devices for hardware panic button triggers.
- **Screening Health Metrics**: Displays real-time screening sensor readings for Heart Rate (BPM) and SpO2.
- **SOS Alarm Sequence**: Single-button emergency alert activation with a live cancellation countdown, exact location pin sharing, and automated alert broadcast to responders.

### 6. 💬 24/7 AI Counseling & Chat Support

- **Confidential Chat Assistant**: Interactive live chat interface accessible from the main dashboard or navigation tab, offering instant confidential guidance and crisis resources.

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
- **Sender & Privacy Handling**: Displays sender identity (name, phone, email, NIN) on standard/SOS reports while keeping anonymous reports strictly identity-shielded via their tracking token (`TOKEN-LG-XXXXXX`).
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

Row Level Security is enabled on all six tables. Citizens can access their own records; responders and administrators receive incident access through database roles. Anonymous reports can be submitted without a signed-in account, but anonymous token-based status lookup still needs a protected server-side lookup endpoint before it should be treated as production-ready.

After creating your first account, promote the trusted administrator from the Supabase SQL Editor. Replace the email with the administrator's verified sign-in email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('admin@example.com')
on conflict (user_id, role) do nothing;
```

Create responder accounts in the same way, changing `'admin'` to `'responder'`. Do not let users assign their own roles.

Email/password authentication is wired to Supabase Auth. Enable and configure the Phone provider and an SMS provider in Supabase before relying on phone/password sign-in. Configure email confirmation and password-reset redirect URLs for your deployed app domain.

Evidence file names are currently stored with the incident; actual evidence file uploads to Supabase Storage require a separate private bucket and storage policies.

---

## 🚀 Getting Started locally

### Prerequisites

- Node.js (v18 or v20+)
- npm / bun

### Installation & Execution

```sh
# 1. Clone repository
git clone <repository-url>
cd lifeguard

# 2. Install dependencies
npm install

# 3. Start development server (Port 3000)
npm run dev

# 4. Build for production
npm run build
```

---

## 🧱 Tech Stack

- **Frontend Framework**: React 18 + Vite + TanStack Router / Start
- **Styling**: Tailwind CSS + Lucide React Icons
- **Backend & Auth**: Supabase Auth & Database Client
- **Type Safety**: TypeScript
