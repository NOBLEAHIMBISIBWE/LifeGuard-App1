package com.lifeguard.app.ui;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.fragment.app.Fragment;

import com.lifeguard.app.R;
import com.lifeguard.app.data.LocationService;
import com.lifeguard.app.data.Repository;
import com.lifeguard.app.models.Incident;

import org.osmdroid.tileprovider.tilesource.TileSourceFactory;
import org.osmdroid.util.GeoPoint;
import org.osmdroid.views.MapView;
import org.osmdroid.views.overlay.Marker;

public class SosFragment extends Fragment {
    private TextView tvSosCount, tvSosCountdownText, tvCurrentAddress;
    private Button btnCancelSos, btnSendSosNow, btnCallPolice;
    private MapView osmMapView;
    private Marker locationMarker;
    private int count = 5;
    private Handler handler = new Handler(Looper.getMainLooper());
    private Runnable countRunnable;
    private boolean isSent = false;
    private Repository repository;
    private LocationService locationService;
    private String currentGeocodedAddress = "Uganda GPS Location";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_sos, container, false);
        repository = Repository.getInstance(requireContext());
        locationService = LocationService.getInstance(requireContext());

        tvSosCount = v.findViewById(R.id.tvSosCount);
        tvSosCountdownText = v.findViewById(R.id.tvSosCountdownText);
        tvCurrentAddress = v.findViewById(R.id.tvCurrentAddress);
        btnCancelSos = v.findViewById(R.id.btnCancelSos);
        btnSendSosNow = v.findViewById(R.id.btnSendSosNow);
        btnCallPolice = v.findViewById(R.id.btnCallPolice);
        osmMapView = v.findViewById(R.id.osmMapView);

        initOpenStreetMap();
        requestLocationAndShowMap();
        startCountdown();

        btnSendSosNow.setOnClickListener(view -> sendSosAlert());
        btnCancelSos.setOnClickListener(view -> cancelSosAlert());
        btnCallPolice.setOnClickListener(view -> {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:999"));
            startActivity(intent);
        });

        return v;
    }

    private void initOpenStreetMap() {
        if (osmMapView == null) return;
        osmMapView.setTileSource(TileSourceFactory.MAPNIK);
        osmMapView.setMultiTouchControls(true);
        osmMapView.getController().setZoom(15.0);

        // Default Kampala position
        GeoPoint startPoint = new GeoPoint(0.3476, 32.5825);
        osmMapView.getController().setCenter(startPoint);

        locationMarker = new Marker(osmMapView);
        locationMarker.setPosition(startPoint);
        locationMarker.setTitle("Your Current Location");
        osmMapView.getOverlays().add(locationMarker);
    }

    private void requestLocationAndShowMap() {
        if (ActivityCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 101);
        } else {
            fetchLocationAndCenterMap();
        }
    }

    private void fetchLocationAndCenterMap() {
        locationService.fetchCurrentLocation(requireContext(), (location, addressStr) -> {
            if (!isAdded() || location == null) return;
            currentGeocodedAddress = addressStr;
            if (tvCurrentAddress != null) {
                tvCurrentAddress.setText(addressStr);
            }
            if (osmMapView != null) {
                GeoPoint point = new GeoPoint(location.getLatitude(), location.getLongitude());
                osmMapView.getController().setCenter(point);
                if (locationMarker != null) {
                    locationMarker.setPosition(point);
                    locationMarker.setSnippet(addressStr);
                    osmMapView.invalidate();
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        if (requestCode == 101 && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            fetchLocationAndCenterMap();
        }
    }

    private void startCountdown() {
        countRunnable = new Runnable() {
            @Override
            public void run() {
                if (isSent) return;
                if (count <= 0) {
                    sendSosAlert();
                    return;
                }
                tvSosCount.setText(String.valueOf(count));
                count--;
                handler.postDelayed(this, 1000);
            }
        };
        handler.post(countRunnable);
    }

    private void sendSosAlert() {
        if (isSent) return;
        isSent = true;
        handler.removeCallbacks(countRunnable);

        Incident incident = new Incident();
        incident.setType("Emergency SOS Panic Alert");
        incident.setDistrict("Kampala");
        incident.setLocation(currentGeocodedAddress);
        Location loc = locationService.getCurrentLocation();
        if (loc != null) {
            incident.setLatitude(loc.getLatitude());
            incident.setLongitude(loc.getLongitude());
        }
        incident.setDescription("Emergency SOS triggered via LifeGuard Mobile Panic Button at " + currentGeocodedAddress);
        incident.setStatus("dispatched");
        repository.insertIncident(incident);

        tvSosCountdownText.setText("EMERGENCY ALERT DISPATCHED!");
        tvSosCount.setText("LIVE");
        Toast.makeText(requireContext(), "SOS Alert sent to primary contacts and police!", Toast.LENGTH_LONG).show();
    }

    private void cancelSosAlert() {
        handler.removeCallbacks(countRunnable);
        Toast.makeText(requireContext(), "SOS Alert cancelled", Toast.LENGTH_SHORT).show();
        ((MainActivity) requireActivity()).navigateToTab(R.id.nav_home);
    }

    @Override
    public void onResume() {
        super.onResume();
        if (osmMapView != null) osmMapView.onResume();
    }

    @Override
    public void onPause() {
        super.onPause();
        if (osmMapView != null) osmMapView.onPause();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        handler.removeCallbacks(countRunnable);
    }
}
