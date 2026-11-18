import type { Database } from "@/integrations/supabase/types";
import type { CoordinateSource } from "@/lib/location";

export type DbIncidentType = Database["public"]["Enums"]["incident_type"];
export type DbIncidentStatus = Database["public"]["Enums"]["incident_status"];

export type IncidentNote = {
  id: string;
  note: string;
  author: string;
  created_at: string;
};

export type StoredIncident = {
  id: string;
  type: string;
  db_type: DbIncidentType;
  status: string;
  created_at: string;
  is_test: boolean;
  is_anonymous?: boolean;
  tracking_token?: string | null;
  district?: string | null;
  description?: string | null;
  location?: string | null;
  persons_involved?: string | null;
  date_of_incident?: string | null;
  evidence_names?: string[];
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  coordinate_source?: CoordinateSource | null;
  heart_rate: number | null;
  spo2: number | null;
  user_id?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  sender_phone?: string | null;
  sender_nin?: string | null;
  reviewer_notes?: IncidentNote[];
};

const STORAGE_KEY = "lifeguard_incidents";
export const INCIDENTS_CHANGE_EVENT = "lifeguard-incidents-change";

function emitIncidentsChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(INCIDENTS_CHANGE_EVENT));
  }
}

function writeLocalIncidents(list: StoredIncident[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    emitIncidentsChange();
  } catch {
    /* ignore storage quota errors */
  }
}

export function mapCategoryToIncidentType(category: string): DbIncidentType {
  const lower = category.toLowerCase();
  if (lower.includes("medical")) return "medical";
  if (lower.includes("fall") || lower.includes("accident")) return "fall";
  if (
    lower.includes("gbv") ||
    lower.includes("gender") ||
    lower.includes("harassment") ||
    lower.includes("assault") ||
    lower.includes("violence") ||
    lower.includes("safety") ||
    lower.includes("robbery")
  ) {
    return "safety";
  }
  return "other";
}

export function mapUiStatusToDbStatus(status: string): DbIncidentStatus {
  switch (status) {
    case "sending":
      return "sending";
    case "submitted":
    case "delivered":
      return "delivered";
    case "acknowledged":
    case "dispatched":
      return "acknowledged";
    case "resolved":
      return "resolved";
    case "cancelled":
      return "cancelled";
    case "failed":
      return "failed";
    default:
      return "delivered";
  }
}

export function getLocalIncidents(): StoredIncident[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredIncident[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalIncident(incident: StoredIncident): StoredIncident[] {
  const existing = getLocalIncidents().filter((item) => item.id !== incident.id);
  const next = [incident, ...existing];
  writeLocalIncidents(next);
  return next;
}

export function updateLocalIncidentStatus(
  id: string,
  status: string,
  fallbackBase?: StoredIncident,
): StoredIncident[] {
  if (typeof window === "undefined") return [];
  const list = getLocalIncidents();
  const exists = list.some((item) => item.id === id);
  const next = exists
    ? list.map((item) => (item.id === id ? { ...item, status } : item))
    : fallbackBase
      ? [{ ...fallbackBase, status }, ...list]
      : list;
  writeLocalIncidents(next);
  return next;
}

export function addIncidentNote(
  id: string,
  noteText: string,
  author = "Admin Desk",
  fallbackBase?: StoredIncident,
): StoredIncident[] {
  const clean = noteText.trim();
  if (!clean) return getLocalIncidents();
  const entry: IncidentNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    note: clean,
    author,
    created_at: new Date().toISOString(),
  };

  const list = getLocalIncidents();
  const exists = list.some((item) => item.id === id);
  const next = exists
    ? list.map((item) =>
        item.id === id
          ? { ...item, reviewer_notes: [entry, ...(item.reviewer_notes ?? [])] }
          : item,
      )
    : fallbackBase
      ? [
          {
            ...fallbackBase,
            reviewer_notes: [entry, ...(fallbackBase.reviewer_notes ?? [])],
          },
          ...list,
        ]
      : list;

  writeLocalIncidents(next);
  return next;
}

export function findIncidentByToken(token: string): StoredIncident | undefined {
  const normalized = token.trim().toUpperCase();
  if (!normalized) return undefined;
  return getAllIncidentsForAdmin().find(
    (item) => item.tracking_token && item.tracking_token.toUpperCase() === normalized,
  );
}

export const BASELINE_SENDER_REPORTS: StoredIncident[] = [
  {
    id: "rep-ug-1042",
    type: "Gender-Based Violence (GBV)",
    db_type: "safety",
    status: "submitted",
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    is_test: false,
    is_anonymous: false,
    district: "Kampala",
    description:
      "Urgent domestic violence disturbance reported near Ntinda Trading Centre. Caller requested immediate confidential social worker & police liaison support.",
    location: "Ntinda Stretch, Plot 14 Bukoto Rd, Kampala",
    persons_involved: "1 survivor (female, 29), 1 suspect on premises",
    date_of_incident: new Date(Date.now() - 25 * 60 * 1000).toISOString().slice(0, 16),
    evidence_names: ["voice_memo_01.m4a"],
    latitude: 0.3547,
    longitude: 32.6135,
    heart_rate: null,
    spo2: null,
    sender_name: "Namukasa Grace",
    sender_email: "grace.namukasa@example.ug",
    sender_phone: "+256 772 418 902",
    sender_nin: "CM95042108KL1A",
    reviewer_notes: [],
  },
  {
    id: "rep-ug-1041",
    type: "Sexual Harassment",
    db_type: "safety",
    status: "acknowledged",
    created_at: new Date(Date.now() - 62 * 60 * 1000).toISOString(),
    is_test: false,
    is_anonymous: true,
    tracking_token: "TOKEN-LG-849201",
    district: "Wakiso",
    description:
      "Anonymous workplace coercion and intimidation report submitted with document screenshots. Requester asked for legal aid guidance via tracking token.",
    location: "Kira Municipality, Wakiso District",
    date_of_incident: new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 16),
    evidence_names: ["chat_export_redacted.png", "incident_log.pdf"],
    latitude: 0.3982,
    longitude: 32.6391,
    heart_rate: null,
    spo2: null,
    user_id: null,
    sender_name: "Anonymous Sender",
    sender_email: null,
    sender_phone: null,
    sender_nin: null,
    reviewer_notes: [
      {
        id: "note-seed-1",
        author: "Intake Officer A. Kato",
        note: "Case verified and queued for FIDA Uganda confidential legal callback via token portal.",
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "rep-ug-1040",
    type: "Medical Emergency",
    db_type: "medical",
    status: "dispatched",
    created_at: new Date(Date.now() - 145 * 60 * 1000).toISOString(),
    is_test: false,
    is_anonymous: false,
    district: "Gulu",
    description:
      "SOS wearable trigger with elevated heart rate telemetry near Lacor Junction. Ambulance unit notified and en route.",
    location: "Gulu-Nimule Hwy, Lacor Junction, Gulu",
    persons_involved: "1 adult male experiencing acute chest pain",
    date_of_incident: new Date(Date.now() - 150 * 60 * 1000).toISOString().slice(0, 16),
    evidence_names: [],
    latitude: 2.7724,
    longitude: 32.2531,
    heart_rate: 128,
    spo2: 91,
    sender_name: "Okello Denis",
    sender_email: "denis.okello@example.ug",
    sender_phone: "+256 781 304 119",
    sender_nin: "CM89011204GL8D",
    reviewer_notes: [
      {
        id: "note-seed-2",
        author: "Dispatch Desk",
        note: "St. Mary's Hospital Lacor ambulance unit UG-AMB-09 dispatched. ETA 7 mins.",
        created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: "rep-ug-1039",
    type: "Personal Safety / Assault",
    db_type: "safety",
    status: "resolved",
    created_at: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    is_test: false,
    is_anonymous: false,
    district: "Mbarara",
    description:
      "Late evening street harassment incident near Mbarara Central Market. Local patrol arrived and escorted complainant safely home.",
    location: "High Street, Mbarara City",
    persons_involved: "1 complainant, local patrol unit MBR-04",
    date_of_incident: new Date(Date.now() - 8 * 3600 * 1000).toISOString().slice(0, 16),
    evidence_names: ["street_cam_ref.jpg"],
    latitude: -0.6072,
    longitude: 30.6545,
    heart_rate: null,
    spo2: null,
    sender_name: "Tumusiime Claire",
    sender_email: "claire.tumusiime@example.ug",
    sender_phone: "+256 704 882 510",
    sender_nin: "CF98081409MB3F",
    reviewer_notes: [
      {
        id: "note-seed-3",
        author: "Mbarara Desk",
        note: "Complainant safely escorted; follow-up psychosocial referral shared.",
        created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      },
    ],
  },
];

export function getAllIncidentsForAdmin(remote: StoredIncident[] = []): StoredIncident[] {
  // The live admin inbox must contain real submitted cases only, never demonstration seed reports.
  const map = new Map<string, StoredIncident>();
  for (const item of remote) {
    const prev = map.get(item.id);
    map.set(item.id, { ...prev, ...item });
  }
  for (const local of getLocalIncidents()) {
    const prev = map.get(local.id);
    map.set(local.id, { ...prev, ...local });
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
