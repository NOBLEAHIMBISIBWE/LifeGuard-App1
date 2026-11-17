package com.lifeguard.app.ble;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.lifeguard.app.models.Vitals;
import java.util.Random;

public class BleManager {
    private static BleManager INSTANCE;
    private boolean isConnected = false;
    private String deviceName = null;
    private int batteryLevel = 88;
    private Vitals currentVitals;
    private final Random random = new Random();
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable vitalsRunnable;

    private BleManager() {
        currentVitals = new Vitals(74, 98, System.currentTimeMillis());
    }

    public static synchronized BleManager getInstance() {
        if (INSTANCE == null) {
            INSTANCE = new BleManager();
        }
        return INSTANCE;
    }

    public boolean isConnected() {
        return isConnected;
    }

    public String getDeviceName() {
        return deviceName;
    }

    public int getBatteryLevel() {
        return batteryLevel;
    }

    public Vitals getCurrentVitals() {
        return currentVitals;
    }

    public interface ConnectionCallback {
        void onSuccess(String deviceName);
        void onError(String message);
    }

    public void scanAndConnect(ConnectionCallback callback) {
        handler.postDelayed(() -> {
            isConnected = true;
            deviceName = "LifeGuard Wearable Pro v2";
            batteryLevel = 92;
            startVitalsSimulation();
            callback.onSuccess(deviceName);
        }, 1500);
    }

    public void disconnect() {
        isConnected = false;
        deviceName = null;
        if (vitalsRunnable != null) {
            handler.removeCallbacks(vitalsRunnable);
        }
    }

    private void startVitalsSimulation() {
        vitalsRunnable = new Runnable() {
            @Override
            public void run() {
                if (!isConnected) return;
                int hr = 68 + random.nextInt(20);
                int spo2 = 96 + random.nextInt(4);
                currentVitals = new Vitals(hr, spo2, System.currentTimeMillis());
                handler.postDelayed(this, 3000);
            }
        };
        handler.post(vitalsRunnable);
    }
}
