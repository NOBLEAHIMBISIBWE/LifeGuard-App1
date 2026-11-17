package com.lifeguard.app.data;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.lifecycle.LiveData;

import com.lifeguard.app.models.Contact;
import com.lifeguard.app.models.Incident;
import com.lifeguard.app.models.User;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class Repository {
    private static Repository INSTANCE;
    private final AppDatabase db;
    private final SharedPreferences prefs;
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    private Repository(Context context) {
        db = AppDatabase.getInstance(context);
        prefs = context.getSharedPreferences("lifeguard_prefs", Context.MODE_PRIVATE);
    }

    public static synchronized Repository getInstance(Context context) {
        if (INSTANCE == null) {
            INSTANCE = Repository.getInstanceInternal(context);
        }
        return INSTANCE;
    }

    private static Repository getInstanceInternal(Context context) {
        return new Repository(context);
    }

    public void initDefaults() {
        executor.execute(() -> {
            if (db.contactDao().getAllContactsSync().isEmpty()) {
                db.contactDao().insert(new Contact("demo-1", "Sarah Namubiru", "+256 772 123 456", "Spouse / Partner", true, true, true));
                db.contactDao().insert(new Contact("demo-2", "David Mukasa", "+256 701 987 654", "Sibling", false, true, true));
            }
        });
    }

    // Contacts
    public LiveData<List<Contact>> getAllContacts() {
        return db.contactDao().getAllContacts();
    }

    public void insertContact(Contact contact) {
        executor.execute(() -> {
            if (contact.isPrimary()) {
                db.contactDao().clearPrimaryFlags();
            }
            db.contactDao().insert(contact);
        });
    }

    public void setPrimaryContact(String id) {
        executor.execute(() -> {
            List<Contact> contacts = db.contactDao().getAllContactsSync();
            for (Contact c : contacts) {
                c.setPrimary(c.getId().equals(id));
                db.contactDao().update(c);
            }
        });
    }

    public void deleteContact(Contact contact) {
        executor.execute(() -> db.contactDao().delete(contact));
    }

    // Incidents
    public LiveData<List<Incident>> getAllIncidents() {
        return db.incidentDao().getAllIncidents();
    }

    public void insertIncident(Incident incident) {
        executor.execute(() -> db.incidentDao().insert(incident));
    }

    public Incident getIncidentByToken(String token) {
        return db.incidentDao().getByTrackingToken(token);
    }

    // User session
    public void saveUser(User user) {
        prefs.edit()
                .putString("user_id", user.getId())
                .putString("user_name", user.getFullName())
                .putString("user_email", user.getEmail())
                .putString("user_phone", user.getPhone())
                .putString("user_nin", user.getNin())
                .putString("user_gender", user.getGender())
                .putBoolean("is_logged_in", true)
                .apply();
    }

    public User getCurrentUser() {
        if (!prefs.getBoolean("is_logged_in", false)) return null;
        return new User(
                prefs.getString("user_id", "u-1"),
                prefs.getString("user_name", "Public Citizen"),
                prefs.getString("user_email", "user@lifeguard.ug"),
                prefs.getString("user_phone", "+256 770 000 000"),
                prefs.getString("user_nin", "CM1234567890"),
                prefs.getString("user_gender", "Female"),
                false
        );
    }

    public void logout() {
        prefs.edit().clear().apply();
    }
}
