package com.lifeguard.app.adapters;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.lifeguard.app.R;
import com.lifeguard.app.models.Incident;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class IncidentAdapter extends RecyclerView.Adapter<IncidentAdapter.ViewHolder> {
    private List<Incident> incidents = new ArrayList<>();
    private final SimpleDateFormat dateFormat = new SimpleDateFormat("MMM dd, yyyy · HH:mm", Locale.getDefault());

    public void setIncidents(List<Incident> incidents) {
        this.incidents = incidents != null ? incidents : new ArrayList<>();
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_incident, parent, false);
        return new ViewHolder(v);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Incident item = incidents.get(position);
        holder.tvType.setText(item.getType());
        holder.tvDistrict.setText(item.getDistrict() != null ? item.getDistrict() : "Uganda");
        holder.tvDate.setText(dateFormat.format(new Date(item.getCreatedAt())));
        holder.tvStatus.setText(item.getStatus().toUpperCase());

        if (item.isAnonymous()) {
            holder.tvBadgeAnon.setVisibility(View.VISIBLE);
            holder.tvBadgeAnon.setText("Anonymous · " + (item.getTrackingToken() != null ? item.getTrackingToken() : ""));
        } else {
            holder.tvBadgeAnon.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return incidents.size();
    }

    static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvType, tvDistrict, tvDate, tvStatus, tvBadgeAnon;

        ViewHolder(View itemView) {
            super(itemView);
            tvType = itemView.findViewById(R.id.tvIncidentType);
            tvDistrict = itemView.findViewById(R.id.tvIncidentDistrict);
            tvDate = itemView.findViewById(R.id.tvIncidentDate);
            tvStatus = itemView.findViewById(R.id.tvIncidentStatus);
            tvBadgeAnon = itemView.findViewById(R.id.tvBadgeAnon);
        }
    }
}
