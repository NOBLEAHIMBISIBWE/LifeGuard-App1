package com.lifeguard.app.models;

public class Vitals {
    private int heartRate;
    private int spo2;
    private long timestamp;

    public Vitals(int heartRate, int spo2, long timestamp) {
        this.heartRate = heartRate;
        this.spo2 = spo2;
        this.timestamp = timestamp;
    }

    public int getHeartRate() { return heartRate; }
    public int getSpo2() { return spo2; }
    public long getTimestamp() { return timestamp; }
}
