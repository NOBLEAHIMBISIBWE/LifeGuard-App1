package com.lifeguard.app.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.lifeguard.app.R;
import com.lifeguard.app.ble.BleManager;

public class DeviceFragment extends Fragment {
    private TextView tvDeviceStatus, tvHeartRate, tvSpo2;
    private Button btnConnectBle;
    private BleManager bleManager;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_device, container, false);
        bleManager = BleManager.getInstance();

        tvDeviceStatus = v.findViewById(R.id.tvDeviceStatus);
        tvHeartRate = v.findViewById(R.id.tvHeartRate);
        tvSpo2 = v.findViewById(R.id.tvSpo2);
        btnConnectBle = v.findViewById(R.id.btnConnectBle);

        updateUi();

        btnConnectBle.setOnClickListener(view -> {
            if (bleManager.isConnected()) {
                bleManager.disconnect();
                updateUi();
                Toast.makeText(requireContext(), "Wearable disconnected", Toast.LENGTH_SHORT).show();
            } else {
                btnConnectBle.setText("Scanning...");
                bleManager.scanAndConnect(new BleManager.ConnectionCallback() {
                    @Override
                    public void onSuccess(String deviceName) {
                        if (isAdded()) {
                            updateUi();
                            Toast.makeText(requireContext(), "Connected to " + deviceName, Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onError(String message) {
                        if (isAdded()) {
                            Toast.makeText(requireContext(), "Error: " + message, Toast.LENGTH_SHORT).show();
                        }
                    }
                });
            }
        });

        return v;
    }

    private void updateUi() {
        if (bleManager.isConnected()) {
            tvDeviceStatus.setText("Device Status: Connected · " + bleManager.getDeviceName() + " (" + bleManager.getBatteryLevel() + "% Battery)");
            btnConnectBle.setText("Disconnect Device");
            tvHeartRate.setText(bleManager.getCurrentVitals().getHeartRate() + " bpm");
            tvSpo2.setText(bleManager.getCurrentVitals().getSpo2() + "%");
        } else {
            tvDeviceStatus.setText("Device Status: Disconnected");
            btnConnectBle.setText("Scan & Connect Wearable");
            tvHeartRate.setText("—");
            tvSpo2.setText("—");
        }
    }
}
