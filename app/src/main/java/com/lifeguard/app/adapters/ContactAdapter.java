package com.lifeguard.app.adapters;

import android.content.Intent;
import android.net.Uri;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.lifeguard.app.R;
import com.lifeguard.app.models.Contact;

import java.util.ArrayList;
import java.util.List;

public class ContactAdapter extends RecyclerView.Adapter<ContactAdapter.ViewHolder> {
    private List<Contact> contacts = new ArrayList<>();
    private final OnContactActionListener listener;

    public interface OnContactActionListener {
        void onEdit(Contact contact);
        void onDelete(Contact contact);
        void onSetPrimary(Contact contact);
    }

    public ContactAdapter(OnContactActionListener listener) {
        this.listener = listener;
    }

    public void setContacts(List<Contact> contacts) {
        this.contacts = contacts != null ? contacts : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_contact, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Contact c = contacts.get(position);
        holder.tvName.setText(c.getName());
        holder.tvPhone.setText(c.getPhone());
        holder.tvRelationship.setText(c.getRelationship());

        if (c.isPrimary()) {
            holder.tvPrimaryBadge.setVisibility(View.VISIBLE);
            holder.btnSetPrimary.setVisibility(View.GONE);
        } else {
            holder.tvPrimaryBadge.setVisibility(View.GONE);
            holder.btnSetPrimary.setVisibility(View.VISIBLE);
        }

        holder.btnCall.setOnClickListener(v -> {
            Intent intent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + c.getPhone()));
            v.getContext().startActivity(intent);
        });

        holder.btnEdit.setOnClickListener(v -> listener.onEdit(c));
        holder.btnDelete.setOnClickListener(v -> listener.onDelete(c));
        holder.btnSetPrimary.setOnClickListener(v -> listener.onSetPrimary(c));
    }

    @Override
    public int getItemCount() {
        return contacts.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvName, tvPhone, tvRelationship, tvPrimaryBadge, btnSetPrimary;
        ImageButton btnCall, btnEdit, btnDelete;

        ViewHolder(View itemView) {
            super(itemView);
            tvName = itemView.findViewById(R.id.tvContactName);
            tvPhone = itemView.findViewById(R.id.tvContactPhone);
            tvRelationship = itemView.findViewById(R.id.tvContactRelationship);
            tvPrimaryBadge = itemView.findViewById(R.id.tvPrimaryBadge);
            btnSetPrimary = itemView.findViewById(R.id.btnSetPrimary);
            btnCall = itemView.findViewById(R.id.btnCallContact);
            btnEdit = itemView.findViewById(R.id.btnEditContact);
            btnDelete = itemView.findViewById(R.id.btnDeleteContact);
        }
    }
}
