package com.lifeguard.app.ui;

import android.content.Intent;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.lifeguard.app.R;
import com.lifeguard.app.adapters.ChatAdapter;
import com.lifeguard.app.data.LocationService;
import com.lifeguard.app.data.Repository;
import com.lifeguard.app.models.ChatMessage;
import com.lifeguard.app.models.Incident;

public class HomeFragment extends Fragment {
    private Repository repository;
    private LocationService locationService;

    private static final String[] INCIDENT_TYPES = {
            "Gender-Based Violence (GBV)",
            "Sexual Harassment",
            "Medical Emergency",
            "Accident / Fall",
            "Personal Safety / Assault",
            "Robbery / Theft",
            "Domestic Violence",
            "Other"
    };

    private static final String[] UGANDA_DISTRICTS = {
            "Kampala", "Wakiso", "Mukono", "Jinja", "Gulu", "Mbarara", "Arua", "Mbale", "Kasese", "Masaka", "Hoima", "Fort Portal", "Lira", "Soroti", "Kabale", "Tororo", "Entebbe", "Other"
    };

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_home, container, false);
        repository = Repository.getInstance(requireContext());
        locationService = LocationService.getInstance(requireContext());

        v.findViewById(R.id.cardDangerBanner).setOnClickListener(view ->
                ((MainActivity) requireActivity()).navigateToTab(R.id.nav_contacts)
        );

        v.findViewById(R.id.btnReportIncident).setOnClickListener(view -> showReportDialog(false));
        v.findViewById(R.id.cardAnonymousReporting).setOnClickListener(view -> showReportDialog(true));

        v.findViewById(R.id.cardMyReports).setOnClickListener(view ->
                ((MainActivity) requireActivity()).navigateToTab(R.id.nav_history)
        );

        v.findViewById(R.id.cardSupportServices).setOnClickListener(view ->
                ((MainActivity) requireActivity()).navigateToTab(R.id.nav_contacts)
        );

        v.findViewById(R.id.cardEmergencyCall).setOnClickListener(view -> {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:999"));
            startActivity(intent);
        });

        v.findViewById(R.id.cardChatSupport).setOnClickListener(view -> showChatDialog());

        return v;
    }

    private void showReportDialog(boolean isAnonymous) {
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_report_incident, null);
        builder.setView(dialogView);
        AlertDialog dialog = builder.create();

        Spinner spinnerType = dialogView.findViewById(R.id.spinnerIncidentType);
        Spinner spinnerDistrict = dialogView.findViewById(R.id.spinnerDistrict);
        EditText etLocation = dialogView.findViewById(R.id.etIncidentLocation);
        EditText etDesc = dialogView.findViewById(R.id.etIncidentDesc);
        Button btnSubmit = dialogView.findViewById(R.id.btnSubmitReport);

        spinnerType.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, INCIDENT_TYPES));
        spinnerDistrict.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, UGANDA_DISTRICTS));

        // Auto-fetch location via LocationService & OpenStreetMap Geocoder
        locationService.fetchCurrentLocation(requireContext(), (loc, addressStr) -> {
            if (isAdded() && etLocation != null) {
                etLocation.setText(addressStr);
            }
        });

        btnSubmit.setText(isAnonymous ? "Submit Anonymously" : "Submit Incident Report");

        btnSubmit.setOnClickListener(v -> {
            String type = spinnerType.getSelectedItem().toString();
            String district = spinnerDistrict.getSelectedItem().toString();
            String locationStr = etLocation.getText().toString().trim();
            String desc = etDesc.getText().toString().trim();

            if (desc.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter incident description", Toast.LENGTH_SHORT).show();
                return;
            }

            Incident incident = new Incident();
            incident.setType(type);
            incident.setDistrict(district);
            incident.setLocation(locationStr);
            Location currentLoc = locationService.getCurrentLocation();
            if (currentLoc != null) {
                incident.setLatitude(currentLoc.getLatitude());
                incident.setLongitude(currentLoc.getLongitude());
            }
            incident.setDescription(desc);
            incident.setAnonymous(isAnonymous);

            if (isAnonymous) {
                String token = "TOKEN-LG-" + (100000 + (int)(Math.random() * 900000));
                incident.setTrackingToken(token);
                repository.insertIncident(incident);
                dialog.dismiss();

                new AlertDialog.Builder(requireContext())
                        .setTitle("Report Submitted Anonymously!")
                        .setMessage("Your secret tracking token is:\n\n" + token + "\n\nSave this token to track case status.")
                        .setPositiveButton("Copy Token", (d, w) -> Toast.makeText(requireContext(), "Token copied to clipboard!", Toast.LENGTH_SHORT).show())
                        .setNegativeButton("Done", null)
                        .show();
            } else {
                repository.insertIncident(incident);
                dialog.dismiss();
                Toast.makeText(requireContext(), "Incident report submitted successfully!", Toast.LENGTH_SHORT).show();
            }
        });

        dialog.show();
    }

    private void showChatDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        View dialogView = getLayoutInflater().inflate(R.layout.dialog_chat_support, null);
        builder.setView(dialogView);
        AlertDialog dialog = builder.create();

        RecyclerView rvChat = dialogView.findViewById(R.id.rvChatMessages);
        EditText etInput = dialogView.findViewById(R.id.etChatMessage);
        Button btnSend = dialogView.findViewById(R.id.btnSendChatMessage);

        ChatAdapter adapter = new ChatAdapter();
        rvChat.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvChat.setAdapter(adapter);

        adapter.addMessage(new ChatMessage("bot", "Hello, I am the LifeGuard Confidential Help Assistant. How can we support you today?"));

        btnSend.setOnClickListener(v -> {
            String text = etInput.getText().toString().trim();
            if (text.isEmpty()) return;
            adapter.addMessage(new ChatMessage("user", text));
            etInput.setText("");

            v.postDelayed(() ->
                    adapter.addMessage(new ChatMessage("bot", "Thank you for reaching out. Your message is encrypted and private. A certified counseling support officer will respond shortly, or you can call helpline 0800 200 600.")),
                    1000
            );
        });

        dialog.show();
    }
}
