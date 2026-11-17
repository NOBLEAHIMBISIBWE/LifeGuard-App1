package com.lifeguard.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;

import com.lifeguard.app.R;
import com.lifeguard.app.data.Repository;
import com.lifeguard.app.models.User;

public class SettingsFragment extends Fragment {
    private TextView tvUserName, tvUserEmail;
    private Repository repository;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_settings, container, false);
        repository = Repository.getInstance(requireContext());

        tvUserName = v.findViewById(R.id.tvUserName);
        tvUserEmail = v.findViewById(R.id.tvUserEmail);

        User currentUser = repository.getCurrentUser();
        if (currentUser != null) {
            tvUserName.setText(currentUser.getFullName());
            tvUserEmail.setText(currentUser.getEmail());
        }

        v.findViewById(R.id.btnFaq).setOnClickListener(view -> showInfoDialog(getString(R.string.faq_title), getString(R.string.faq_a1)));
        v.findViewById(R.id.btnPrivacyPolicy).setOnClickListener(view -> showInfoDialog(getString(R.string.privacy_title), getString(R.string.privacy_content)));
        v.findViewById(R.id.btnTerms).setOnClickListener(view -> showInfoDialog(getString(R.string.terms_title), getString(R.string.terms_content)));

        v.findViewById(R.id.btnLogout).setOnClickListener(view -> {
            repository.logout();
            startActivity(new Intent(requireActivity(), AuthActivity.class));
            requireActivity().finish();
        });

        return v;
    }

    private void showInfoDialog(String title, String content) {
        new AlertDialog.Builder(requireContext())
                .setTitle(title)
                .setMessage(content)
                .setPositiveButton("Close", null)
                .show();
    }
}
