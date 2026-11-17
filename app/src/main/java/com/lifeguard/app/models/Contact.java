package com.lifeguard.app.models;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "contacts")
public class Contact {
    @PrimaryKey
    @NonNull
    private String id;
    private String name;
    private String phone;
    private String relationship;
    private boolean isPrimary;
    private boolean notifySms;
    private boolean shareLocation;

    public Contact() {
        this.id = "contact-" + System.currentTimeMillis();
        this.notifySms = true;
        this.shareLocation = true;
    }

    public Contact(@NonNull String id, String name, String phone, String relationship, boolean isPrimary, boolean notifySms, boolean shareLocation) {
        this.id = id;
        this.name = name;
        this.phone = phone;
        this.relationship = relationship;
        this.isPrimary = isPrimary;
        this.notifySms = notifySms;
        this.shareLocation = shareLocation;
    }

    @NonNull
    public String getId() { return id; }
    public void setId(@NonNull String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }

    public boolean isPrimary() { return isPrimary; }
    public void setPrimary(boolean primary) { isPrimary = primary; }

    public boolean isNotifySms() { return notifySms; }
    public void setNotifySms(boolean notifySms) { this.notifySms = notifySms; }

    public boolean isShareLocation() { return shareLocation; }
    public void setShareLocation(boolean shareLocation) { this.shareLocation = shareLocation; }
}
