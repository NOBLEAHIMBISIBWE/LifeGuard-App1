package com.lifeguard.app.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.lifeguard.app.R;
import com.lifeguard.app.adapters.IncidentAdapter;
import com.lifeguard.app.data.Repository;
import com.lifeguard.app.models.Incident;

public class HistoryFragment extends Fragment {
    private RecyclerView rvIncidents;
    private IncidentAdapter adapter;
    private EditText etSearchToken;
    private Button btnSearchToken;
    private Repository repository;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_history, container, false);
        repository = Repository.getInstance(requireContext());

        rvIncidents = v.findViewById(R.id.rvIncidents);
        etSearchToken = v.findViewById(R.id.etSearchToken);
        btnSearchToken = v.findViewById(R.id.btnSearchToken);

        rvIncidents.setLayoutManager(new LinearLayoutManager(requireContext()));
        adapter = new IncidentAdapter();
        rvIncidents.setAdapter(adapter);

        repository.getAllIncidents().observe(getViewLifecycleOwner(), incidents -> adapter.setIncidents(incidents));

        btnSearchToken.setOnClickListener(view -> performTokenSearch());

        return v;
    }

    private void performTokenSearch() {
        String token = etSearchToken.getText().toString().trim();
        if (token.isEmpty()) {
            Toast.makeText(requireContext(), "Please enter a tracking token", Toast.LENGTH_SHORT).show();
            return;
        }

        Incident found = repository.getIncidentByToken(token);
        if (found != null) {
            new AlertDialog.Builder(requireContext())
                    .setTitle("Anonymous Case Status")
                    .setMessage("Token: " + found.getTrackingToken() +
                            "\nType: " + found.getType() +
                            "\nDistrict: " + (found.getDistrict() != null ? found.getDistrict() : "Uganda") +
                            "\nStatus: " + found.getStatus().toUpperCase() +
                            "\n\nDescription: " + found.getDescription())
                    .setPositiveButton("OK", null)
                    .show();
        } else {
            Toast.makeText(requireContext(), "No case found for token: " + token, Toast.LENGTH_LONG).show();
        }
    }
}
