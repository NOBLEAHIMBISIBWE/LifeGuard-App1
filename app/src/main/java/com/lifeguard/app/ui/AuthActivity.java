package com.lifeguard.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.textfield.TextInputLayout;
import com.lifeguard.app.R;
import com.lifeguard.app.data.Repository;
import com.lifeguard.app.models.User;

public class AuthActivity extends AppCompatActivity {
    private TextInputLayout tilEmail, tilPhone, tilFullName, tilNin, tilPassword;
    private EditText etEmail, etPhone, etFullName, etNin, etPassword;
    private RadioGroup rgAuthMode;
    private Button btnSubmitAuth;
    private TextView tvGuestLogin;
    private Repository repository;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        repository = Repository.getInstance(this);

        if (repository.getCurrentUser() != null) {
            openMainActivity();
            return;
        }

        setContentView(R.layout.activity_auth);

        tilEmail = findViewById(R.id.tilEmail);
        tilPhone = findViewById(R.id.tilPhone);
        tilFullName = findViewById(R.id.tilFullName);
        tilNin = findViewById(R.id.tilNin);
        tilPassword = findViewById(R.id.tilPassword);

        etEmail = findViewById(R.id.etEmail);
        etPhone = findViewById(R.id.etPhone);
        etFullName = findViewById(R.id.etFullName);
        etNin = findViewById(R.id.etNin);
        etPassword = findViewById(R.id.etPassword);

        rgAuthMode = findViewById(R.id.rgAuthMode);
        btnSubmitAuth = findViewById(R.id.btnSubmitAuth);
        tvGuestLogin = findViewById(R.id.tvGuestLogin);

        rgAuthMode.setOnCheckedChangeListener((group, checkedId) -> {
            if (checkedId == R.id.rbPhoneMode) {
                tilEmail.setVisibility(View.GONE);
                tilPhone.setVisibility(View.VISIBLE);
            } else {
                tilEmail.setVisibility(View.VISIBLE);
                tilPhone.setVisibility(View.GONE);
            }
        });

        btnSubmitAuth.setOnClickListener(v -> performAuth());
        tvGuestLogin.setOnClickListener(v -> openMainActivity());
    }

    private void performAuth() {
        String name = etFullName.getText().toString().trim();
        String pwd = etPassword.getText().toString().trim();

        if (name.isEmpty() || pwd.isEmpty()) {
            Toast.makeText(this, "Please enter your name and password", Toast.LENGTH_SHORT).show();
            return;
        }

        User u = new User(
                "u-" + System.currentTimeMillis(),
                name,
                etEmail.getText().toString().trim(),
                etPhone.getText().toString().trim(),
                etNin.getText().toString().trim(),
                "Female",
                false
        );
        repository.saveUser(u);
        Toast.makeText(this, "Welcome to LifeGuard!", Toast.LENGTH_SHORT).show();
        openMainActivity();
    }

    private void openMainActivity() {
        startActivity(new Intent(this, MainActivity.class));
        finish();
    }
}
