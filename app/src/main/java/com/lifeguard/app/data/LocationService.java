package com.lifeguard.app.data;

import android.annotation.SuppressLint;
import android.content.Context;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import org.osmdroid.config.Configuration;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LocationService {
    private static LocationService INSTANCE;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Location currentLocation;

    private LocationService(Context context) {
        // Configure osmdroid tile user agent
        Configuration.getInstance().setUserAgentValue(context.getPackageName());
        
        // Mock initial location (Kampala default: 0.3476, 32.5825)
        currentLocation = new Location("gps");
        currentLocation.setLatitude(0.3476);
        currentLocation.setLongitude(32.5825);
        currentLocation.setAccuracy(10.0f);
    }

    public static synchronized LocationService getInstance(Context context) {
        if (INSTANCE == null) {
            INSTANCE = new LocationService(context.getApplicationContext());
        }
        return INSTANCE;
    }

    public Location getCurrentLocation() {
        return currentLocation;
    }

    public interface OnLocationFetchListener {
        void onLocationFetched(Location location, String addressStr);
    }

    @SuppressLint("MissingPermission")
    public void fetchCurrentLocation(Context context, OnLocationFetchListener listener) {
        try {
            FusedLocationProviderClient fusedClient = LocationServices.getFusedLocationProviderClient(context);
            fusedClient.getLastLocation().addOnSuccessListener(location -> {
                if (location != null) {
                    currentLocation = location;
                    reverseGeocode(context, location.getLatitude(), location.getLongitude(), listener);
                } else {
                    requestLocationFromManager(context, listener);
                }
            }).addOnFailureListener(e -> requestLocationFromManager(context, listener));
        } catch (Exception e) {
            requestLocationFromManager(context, listener);
        }
    }

    @SuppressLint("MissingPermission")
    private void requestLocationFromManager(Context context, OnLocationFetchListener listener) {
        try {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            if (lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER))) {
                Location loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                if (loc == null) {
                    loc = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                }
                if (loc != null) {
                    currentLocation = loc;
                }
            }
        } catch (Exception ignored) {}

        reverseGeocode(context, currentLocation.getLatitude(), currentLocation.getLongitude(), listener);
    }

    public void reverseGeocode(Context context, double lat, double lng, OnLocationFetchListener listener) {
        executor.execute(() -> {
            String addressStr = String.format(Locale.US, "GPS: %.4f, %.4f", lat, lng);
            try {
                Geocoder geocoder = new Geocoder(context, Locale.getDefault());
                List<Address> addresses = geocoder.getFromLocation(lat, lng, 1);
                if (addresses != null && !addresses.isEmpty()) {
                    Address a = addresses.get(0);
                    StringBuilder sb = new StringBuilder();
                    if (a.getThoroughfare() != null) sb.append(a.getThoroughfare()).append(", ");
                    if (a.getLocality() != null) sb.append(a.getLocality()).append(", ");
                    if (a.getAdminArea() != null) sb.append(a.getAdminArea());
                    if (sb.length() > 0) {
                        addressStr = sb.toString() + String.format(Locale.US, " (%.4f, %.4f)", lat, lng);
                    }
                }
            } catch (Exception ignored) {}

            final String finalAddress = addressStr;
            mainHandler.post(() -> listener.onLocationFetched(currentLocation, finalAddress));
        });
    }
}
