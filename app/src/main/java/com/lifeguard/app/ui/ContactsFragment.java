package com.lifeguard.app.ui;

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
import com.lifeguard.app.adapters.ContactAdapter;
import com.lifeguard.app.data.Repository;
import com.lifeguard.app.models.Contact;

public class ContactsFragment extends Fragment implements ContactAdapter.OnContactActionListener {
    private RecyclerView rvContacts;
    private ContactAdapter adapter;
    private Repository repository;

    private static final String[] RELATIONSHIPS = {
            "Spouse / Partner", "Parent", "Sibling", "Child", "Friend", "Guardian", "Doctor", "Neighbor", "Colleague", "Other"
    };

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View v = inflater.inflate(R.layout.fragment_contacts, container, false);
        repository = Repository.getInstance(requireContext());

        rvContacts = v.findViewById(R.id.rvContacts);
        rvContacts.setLayoutManager(new LinearLayoutManager(requireContext()));

        adapter = new ContactAdapter(this);
        rvContacts.setAdapter(adapter);

        repository.getAllContacts().observe(getViewLifecycleOwner(), contacts -> adapter.setContacts(contacts));

        v.findViewById(R.id.btnAddContact).setOnClickListener(view -> showAddEditDialog(null));

        return v;
    }

    private void showAddEditDialog(Contact existing) {
        AlertDialog.Builder builder = new AlertDialog.Builder(requireContext());
        View view = getLayoutInflater().inflate(R.layout.dialog_add_contact, null);
        builder.setView(view);
        AlertDialog dialog = builder.create();

        EditText etName = view.findViewById(R.id.etContactName);
        EditText etPhone = view.findViewById(R.id.etContactPhone);
        Spinner spinnerRel = view.findViewById(R.id.spinnerRelationship);
        Button btnSave = view.findViewById(R.id.btnSaveContact);

        spinnerRel.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, RELATIONSHIPS));

        if (existing != null) {
            etName.setText(existing.getName());
            etPhone.setText(existing.getPhone());
        }

        btnSave.setOnClickListener(v -> {
            String name = etName.getText().toString().trim();
            String phone = etPhone.getText().toString().trim();
            String rel = spinnerRel.getSelectedItem().toString();

            if (name.isEmpty() || phone.isEmpty()) {
                Toast.makeText(requireContext(), "Please enter name and phone number", Toast.LENGTH_SHORT).show();
                return;
            }

            if (existing != null) {
                existing.setName(name);
                existing.setPhone(phone);
                existing.setRelationship(rel);
                repository.insertContact(existing);
                Toast.makeText(requireContext(), "Contact updated", Toast.LENGTH_SHORT).show();
            } else {
                Contact c = new Contact();
                c.setName(name);
                c.setPhone(phone);
                c.setRelationship(rel);
                repository.insertContact(c);
                Toast.makeText(requireContext(), "Contact added", Toast.LENGTH_SHORT).show();
            }
            dialog.dismiss();
        });

        dialog.show();
    }

    @Override
    public void onEdit(Contact contact) {
        showAddEditDialog(contact);
    }

    @Override
    public void onDelete(Contact contact) {
        repository.deleteContact(contact);
        Toast.makeText(requireContext(), "Contact deleted", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onSetPrimary(Contact contact) {
        repository.setPrimaryContact(contact.getId());
        Toast.makeText(requireContext(), "Primary contact updated", Toast.LENGTH_SHORT).show();
    }
}
