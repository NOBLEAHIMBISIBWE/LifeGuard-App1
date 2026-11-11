import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * LifeGuard prototype BLE protocol (custom GATT service, NOT a Bluetooth SIG standard).
 * Service:          6e4c0001-7a3b-4c8e-9f1a-1f6b2d0e4a10
 *  - SOS event      6e4c0002-...  notify, uint8 (1 = pressed, 2 = fall detected)
 *  - Vitals         6e4c0003-...  notify, [uint8 hr bpm, uint8 spo2 %, uint8 quality 0-100]
 *  - Device health  6e4c0004-...  read/notify, uint8 status flags
 * Standard Battery Service 0x180F / Battery Level 0x2A19 is used for battery.
 */
const base = (n: string) => `6e4c${n}-7a3b-4c8e-9f1a-1f6b2d0e4a10`;
export const LG_SERVICE = base("0001");
export const LG_SOS = base("0002");
export const LG_VITALS = base("0003");

export type Vitals = {
  hr: number | null;
  spo2: number | null;
  quality: number | null;
  at: number | null;
};
type State = {
  status: "unsupported" | "idle" | "scanning" | "connected" | "disconnected";
  deviceName: string | null;
  battery: number | null;
  vitals: Vitals;
  lastSync: number | null;
  sosPressedAt: number | null;
};

let state: State = {
  status: typeof navigator !== "undefined" && "bluetooth" in navigator ? "idle" : "unsupported",
  deviceName: null,
  battery: null,
  vitals: { hr: null, spo2: null, quality: null, at: null },
  lastSync: null,
  sosPressedAt: null,
};
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
const SERVER_STATE = state;
export const useWearable = () =>
  useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
    () => SERVER_STATE,
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let device: any = null;

export async function connectWearable() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bt = (navigator as any).bluetooth;
  if (!bt)
    throw new Error("Bluetooth isn't available in this browser. Use Chrome on Android or desktop.");
  set({ status: "scanning" });
  try {
    device = await bt.requestDevice({
      filters: [{ services: [LG_SERVICE] }],
      optionalServices: ["battery_service"],
    });
    device.addEventListener("gattserverdisconnected", onDisconnect);
    await attach();
  } catch (e) {
    set({ status: device ? "disconnected" : "idle" });
    throw e;
  }
}

async function attach() {
  const server = await device.gatt.connect();
  set({
    status: "connected",
    deviceName: device.name ?? "LifeGuard wearable",
    lastSync: Date.now(),
  });
  const svc = await server.getPrimaryService(LG_SERVICE);
  const vitals = await svc.getCharacteristic(LG_VITALS);
  await vitals.startNotifications();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vitals.addEventListener("characteristicvaluechanged", (ev: any) => {
    const v: DataView = ev.target.value;
    const hr = v.getUint8(0) || null;
    const spo2 = v.getUint8(1) || null;
    const quality = v.byteLength > 2 ? v.getUint8(2) : null;
    set({ vitals: { hr, spo2, quality, at: Date.now() }, lastSync: Date.now() });
    persistReading(hr, spo2);
  });
  const sos = await svc.getCharacteristic(LG_SOS);
  await sos.startNotifications();
  sos.addEventListener("characteristicvaluechanged", () => set({ sosPressedAt: Date.now() }));
  try {
    const bs = await server.getPrimaryService("battery_service");
    const lvl = await bs.getCharacteristic("battery_level");
    set({ battery: (await lvl.readValue()).getUint8(0) });
  } catch {
    /* battery optional */
  }
}

let lastPersist = 0;
async function persistReading(hr: number | null, spo2: number | null) {
  if (Date.now() - lastPersist < 30_000) return;
  lastPersist = Date.now();
  await supabase.from("health_readings").insert({ heart_rate: hr, spo2, battery: state.battery });
}

async function onDisconnect() {
  set({ status: "disconnected" });
  for (let i = 0; i < 3 && device; i++) {
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    try {
      await attach();
      return;
    } catch {
      /* retry */
    }
  }
}

export function disconnectWearable() {
  device?.removeEventListener("gattserverdisconnected", onDisconnect);
  device?.gatt?.disconnect();
  device = null;
  set({ status: "idle", deviceName: null, battery: null });
}

export function clearSosPress() {
  set({ sosPressedAt: null });
}

export const STALE_MS = 2 * 60_000;
export const isStale = (at: number | null) => !at || Date.now() - at > STALE_MS;
