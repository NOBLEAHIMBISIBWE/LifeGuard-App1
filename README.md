# LifeGuard — Uganda National GBV Platform

LifeGuard is Uganda's national digital platform for Gender-Based Violence (GBV) and sexual harassment prevention, confidential incident reporting, wearable SOS dispatch, AI counseling support, and emergency responder coordination.

---

## 🌟 Comprehensive System Features & Functionality

### 1. 🔐 Authentication & Identity Management (`/auth`)

- **Dual Sign-In Modes**: Toggle between **Email Address** and **Ugandan Phone Number** authentication.
- **Registration Form**: Captures Full Name, National ID Number (NIN), Gender selection, Email Address, Password (with eye toggle visibility), and Ugandan Phone Number with `+256` flag selector.
- **Session Persistence**: Secure persistent authentication state integrated with Supabase and fallback session management.

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

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env` and configure your API keys:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

# Google Maps Platform (Optional for interactive maps)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

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
