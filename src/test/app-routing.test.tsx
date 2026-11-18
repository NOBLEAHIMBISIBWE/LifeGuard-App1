import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it, beforeEach } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  addIncidentNote,
  findIncidentByToken,
  getAllIncidentsForAdmin,
  getLocalIncidents,
  mapCategoryToIncidentType,
  saveLocalIncident,
  updateLocalIncidentStatus,
} from "@/lib/incidents";
import { parseCoordinatesFromText, resolveReportCoordinates } from "@/lib/location";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it.each([
    "/",
    "/auth",
    "/reset-password",
    "/home",
    "/history",
    "/contacts",
    "/settings",
    "/sos",
    "/device",
    "/responder",
    "/admin",
  ])("matches route %s instead of falling back to not found", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path);
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

describe("Incident helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("maps reporting categories to valid database incident enums", () => {
    expect(mapCategoryToIncidentType("Medical Emergency")).toBe("medical");
    expect(mapCategoryToIncidentType("Accident / Fall")).toBe("fall");
    expect(mapCategoryToIncidentType("Gender-Based Violence (GBV)")).toBe("safety");
    expect(mapCategoryToIncidentType("Sexual Harassment")).toBe("safety");
    expect(mapCategoryToIncidentType("Other")).toBe("other");
  });

  it("stores and locates anonymous reports by tracking token", () => {
    saveLocalIncident({
      id: "anon-1",
      type: "Gender-Based Violence (GBV)",
      db_type: "safety",
      status: "submitted",
      created_at: new Date().toISOString(),
      is_test: false,
      is_anonymous: true,
      tracking_token: "TOKEN-LG-123456",
      district: "Kampala",
      latitude: 0.3476,
      longitude: 32.5825,
      heart_rate: null,
      spo2: null,
      sender_name: "Anonymous Sender",
      sender_email: null,
      sender_phone: null,
    });

    expect(getLocalIncidents()).toHaveLength(1);
    const found = findIncidentByToken("token-lg-123456");
    expect(found?.id).toBe("anon-1");
    expect(found?.district).toBe("Kampala");
    expect(found?.sender_email).toBeNull();
  });

  it("aggregates sender reports for admin and persists status and reviewer notes", () => {
    saveLocalIncident({
      id: "sender-rep-1",
      type: "Medical Emergency",
      db_type: "medical",
      status: "submitted",
      created_at: new Date().toISOString(),
      is_test: false,
      is_anonymous: false,
      district: "Jinja",
      description: "Road accident near Nile Bridge",
      latitude: 0.4314,
      longitude: 33.1951,
      heart_rate: null,
      spo2: null,
      sender_name: "Kato Brian",
      sender_phone: "+256 770 112 233",
      sender_email: "kato@example.ug",
      reviewer_notes: [],
    });

    const initialAll = getAllIncidentsForAdmin();
    expect(initialAll.some((r) => r.id === "sender-rep-1" && r.sender_name === "Kato Brian")).toBe(
      true,
    );

    updateLocalIncidentStatus("sender-rep-1", "dispatched");
    addIncidentNote("sender-rep-1", "Ambulance unit dispatched to Nile Bridge", "Admin Desk");

    const updated = getLocalIncidents().find((r) => r.id === "sender-rep-1");
    expect(updated?.status).toBe("dispatched");
    expect(updated?.reviewer_notes).toHaveLength(1);
    expect(updated?.reviewer_notes?.[0]?.note).toContain("Nile Bridge");
  });

  it("resolves coordinates from device GPS, manual text, or district fallback", async () => {
    expect(parseCoordinatesFromText("Near 0.34760, 32.58250 Kampala")).toEqual({
      lat: 0.3476,
      lng: 32.5825,
    });

    const fromGps = await resolveReportCoordinates({
      fix: { lat: 0.31234, lng: 32.61234, accuracy: 14, at: Date.now() },
      locationText: "Ntinda",
      district: "Kampala",
    });
    expect(fromGps).toEqual({
      lat: 0.31234,
      lng: 32.61234,
      accuracy: 14,
      source: "gps",
    });

    const fromManual = await resolveReportCoordinates({
      fix: null,
      locationText: "0.43140, 33.19510",
      district: "Jinja",
    });
    expect(fromManual.source).toBe("manual");
    expect(fromManual.lat).toBeCloseTo(0.4314);

    const fromDistrict = await resolveReportCoordinates({
      fix: null,
      locationText: "",
      district: "Gulu",
    });
    expect(fromDistrict.source).toBe("district_reference");
    expect(fromDistrict.lat).toBeCloseTo(2.7724);
  });
});
