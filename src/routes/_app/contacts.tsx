import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  Trash2,
  Pencil,
  HeartHandshake,
  Stethoscope,
  Star,
  UserPlus,
  ShieldAlert,
  Check,
  Plus,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({
    meta: [
      { title: "Emergency Contacts — LifeGuard" },
      {
        name: "description",
        content: "Manage your primary emergency contacts, phone numbers, and relationships.",
      },
      { property: "og:title", content: "Emergency Contacts — LifeGuard" },
      {
        property: "og:description",
        content: "Manage your primary emergency contacts and relationships.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contacts,
});

export type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
  notify_sms: boolean;
  share_location: boolean;
};

const RELATIONSHIP_PRESETS = [
  "Spouse / Partner",
  "Parent",
  "Sibling",
  "Child",
  "Friend",
  "Guardian",
  "Doctor / Physician",
  "Neighbor",
  "Colleague",
  "Other",
];

const LOCAL_STORAGE_KEY = "lifeguard_emergency_contacts";

const INITIAL_DEMO_CONTACTS: Contact[] = [
  {
    id: "demo-1",
    name: "Sarah Namubiru",
    phone: "+256 772 123 456",
    relationship: "Spouse / Partner",
    is_primary: true,
    notify_sms: true,
    share_location: true,
  },
  {
    id: "demo-2",
    name: "David Mukasa",
    phone: "+256 701 987 654",
    relationship: "Sibling",
    is_primary: false,
    notify_sms: true,
    share_location: true,
  },
];

function getStoredContacts(): Contact[] {
  if (typeof window === "undefined") return INITIAL_DEMO_CONTACTS;
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_CONTACTS));
    return INITIAL_DEMO_CONTACTS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_CONTACTS;
  }
}

function saveStoredContacts(contacts: Contact[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contacts));
}

const emptyForm: Omit<Contact, "id"> & { id?: string } = {
  name: "",
  phone: "",
  relationship: "Spouse / Partner",
  is_primary: false,
  notify_sms: true,
  share_location: true,
};

function Contacts() {
  const [list, setList] = useState<Contact[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase.from("contacts").select("*").order("created_at");
      if (!error && data && data.length > 0) {
        const formatted: Contact[] = data.map((item) => ({
          id: item.id,
          name: item.name,
          phone: item.phone,
          relationship: item.relationship ?? "Other",
          is_primary: Boolean((item as { is_primary?: boolean }).is_primary),
          notify_sms: item.notify_sms ?? true,
          share_location: item.share_location ?? true,
        }));
        setList(formatted);
        saveStoredContacts(formatted);
        return;
      }
    } catch {
      /* fall back to local storage */
    }
    const local = getStoredContacts();
    setList(local);
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Please enter a valid full name");
      return;
    }
    if (!/^\+?[0-9 ()-]{7,20}$/.test(form.phone.trim())) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const isFirstContact = list.length === 0;
    const shouldBePrimary = form.is_primary || isFirstContact;

    let updatedList: Contact[] = [];

    if (form.id) {
      // Edit mode
      updatedList = list.map((c) => {
        if (c.id === form.id) {
          return { ...c, ...form, is_primary: shouldBePrimary };
        }
        return shouldBePrimary ? { ...c, is_primary: false } : c;
      });
    } else {
      // Create mode
      const newContact: Contact = {
        id: `contact-${Date.now()}`,
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship || "Other",
        is_primary: shouldBePrimary,
        notify_sms: form.notify_sms,
        share_location: form.share_location,
      };

      if (shouldBePrimary) {
        updatedList = [newContact, ...list.map((c) => ({ ...c, is_primary: false }))];
      } else {
        updatedList = [...list, newContact];
      }
    }

    // Try DB sync
    try {
      const dbRow = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship || null,
        notify_sms: form.notify_sms,
        share_location: form.share_location,
      };
      if (form.id) {
        await supabase.from("contacts").update(dbRow).eq("id", form.id);
      } else {
        await supabase.from("contacts").insert(dbRow);
      }
    } catch {
      /* ignore db errors in mock mode */
    }

    setList(updatedList);
    saveStoredContacts(updatedList);
    setForm(emptyForm);
    setIsEditing(false);
    toast.success(form.id ? "Contact updated successfully" : "Emergency contact added");
  };

  const handleSetPrimary = async (id: string) => {
    const updated = list.map((c) => ({
      ...c,
      is_primary: c.id === id,
    }));
    setList(updated);
    saveStoredContacts(updated);
    toast.success("Primary emergency contact updated");
  };

  const handleDelete = async (id: string) => {
    const updated = list.filter((c) => c.id !== id);
    if (updated.length > 0 && !updated.some((c) => c.is_primary)) {
      updated[0]!.is_primary = true;
    }
    setList(updated);
    saveStoredContacts(updated);
    try {
      await supabase.from("contacts").delete().eq("id", id);
    } catch {
      /* ignore */
    }
    toast.success("Contact removed");
  };

  const handleEdit = (contact: Contact) => {
    setForm({ ...contact, relationship: contact.relationship || "Other" });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const primaryContact = list.find((c) => c.is_primary) || list[0];

  return (
    <div className="px-5 pt-6 pb-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emergency Contacts</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage the trusted people alerted when you press SOS
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setForm(emptyForm);
            setIsEditing(true);
          }}
        >
          <UserPlus className="h-4 w-4" /> Add
        </Button>
      </header>

      {/* Primary Contact Spotlight Hero Card */}
      {primaryContact && (
        <section className="mt-6 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 relative overflow-hidden shadow-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              Primary Emergency Contact
            </span>
            <span className="text-xs text-muted-foreground">First to be called</span>
          </div>

          <div className="mt-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">{primaryContact.name}</h3>
              <p className="text-xs font-medium text-primary mt-0.5">
                {primaryContact.relationship}
              </p>
              <p className="mt-1 text-sm font-semibold tracking-wide text-foreground">
                {primaryContact.phone}
              </p>
            </div>

            <Button size="sm" asChild className="gap-1.5">
              <a href={`tel:${primaryContact.phone}`}>
                <Phone className="h-4 w-4" /> Call Now
              </a>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-primary/10 text-xs text-muted-foreground">
            <span
              className={`inline-flex items-center gap-1 ${primaryContact.notify_sms ? "text-success font-medium" : "text-muted-foreground"}`}
            >
              <Check className="h-3.5 w-3.5" /> SMS Alerts On
            </span>
            <span className="text-border">·</span>
            <span
              className={`inline-flex items-center gap-1 ${primaryContact.share_location ? "text-success font-medium" : "text-muted-foreground"}`}
            >
              <MapPin className="h-3.5 w-3.5" /> Live Location Shared
            </span>
          </div>
        </section>
      )}

      {/* Add / Edit Form Section */}
      {isEditing && (
        <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-base">
              {form.id ? "Edit Emergency Contact" : "Add Emergency Contact"}
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Full Name</Label>
              <Input
                id="contact-name"
                placeholder="e.g. Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone Number</Label>
              <Input
                id="contact-phone"
                type="tel"
                placeholder="+256 700 000 000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-relationship">Relationship</Label>
              <select
                id="contact-relationship"
                value={form.relationship || "Other"}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {RELATIONSHIP_PRESETS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Primary Contact</Label>
                  <p className="text-xs text-muted-foreground">Highest priority alert contact</p>
                </div>
                <Switch
                  checked={form.is_primary}
                  onCheckedChange={(v) => setForm({ ...form, is_primary: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Send SMS Notifications</Label>
                  <p className="text-xs text-muted-foreground">Alert via SMS during an emergency</p>
                </div>
                <Switch
                  checked={form.notify_sms}
                  onCheckedChange={(v) => setForm({ ...form, notify_sms: v })}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Share Live Location</Label>
                  <p className="text-xs text-muted-foreground">Attach GPS coordinates on SOS</p>
                </div>
                <Switch
                  checked={form.share_location}
                  onCheckedChange={(v) => setForm({ ...form, share_location: v })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="w-1/2"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-1/2">
                {form.id ? "Save Changes" : "Save Contact"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Emergency Contacts List */}
      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">All Emergency Contacts ({list.length})</h2>
          {!isEditing && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => {
                setForm(emptyForm);
                setIsEditing(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> New Contact
            </Button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed p-8 text-center bg-card">
            <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium text-foreground">No contacts added yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your family or trusted friends so LifeGuard can reach them when needed.
            </p>
            <Button
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => {
                setForm(emptyForm);
                setIsEditing(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Emergency Contact
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((c) => (
              <li
                key={c.id}
                className={`flex flex-col rounded-2xl border bg-card p-4 transition-all shadow-2xs ${
                  c.is_primary ? "border-primary/40 ring-1 ring-primary/20" : "hover:border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-base text-foreground">{c.name}</p>
                      {c.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <Star className="h-3 w-3 fill-primary" /> Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      Relationship:{" "}
                      <span className="text-foreground">{c.relationship || "Not specified"}</span>
                    </p>
                    <p className="text-sm font-semibold tracking-wide text-foreground mt-1">
                      {c.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      asChild
                      className="h-9 w-9 text-primary hover:bg-primary/10"
                      title="Call"
                    >
                      <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:bg-secondary"
                      onClick={() => handleEdit(c)}
                      aria-label={`Edit ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(c.id)}
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 ${c.notify_sms ? "text-success" : "text-muted-foreground/50"}`}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> SMS {c.notify_sms ? "On" : "Off"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${c.share_location ? "text-success" : "text-muted-foreground/50"}`}
                    >
                      <MapPin className="h-3.5 w-3.5" /> Location {c.share_location ? "On" : "Off"}
                    </span>
                  </div>

                  {!c.is_primary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(c.id)}
                      className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
                    >
                      <Star className="h-3 w-3" /> Set as Primary
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Counseling & Medical Support Services */}
      <section className="mt-10 space-y-3 border-t pt-6">
        <h2 className="font-semibold text-base text-foreground">Support & Medical Hotlines</h2>

        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Trauma & Counseling Helpline</p>
                <p className="text-xs text-muted-foreground">
                  24/7 confidential counseling support
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <a href="tel:0800200600">
                <Phone className="h-3.5 w-3.5 mr-1" /> Call
              </a>
            </Button>
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Emergency Medical Dispatch</p>
                <p className="text-xs text-muted-foreground">Ambulance and first aid response</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" asChild>
              <a href="tel:911">
                <Phone className="h-3.5 w-3.5 mr-1" /> Call
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
