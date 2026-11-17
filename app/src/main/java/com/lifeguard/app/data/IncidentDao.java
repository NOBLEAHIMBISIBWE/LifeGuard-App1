package com.lifeguard.app.data;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.lifeguard.app.models.Incident;
import java.util.List;

@Dao
public interface IncidentDao {
    @Query("SELECT * FROM incidents ORDER BY createdAt DESC")
    LiveData<List<Incident>> getAllIncidents();

    @Query("SELECT * FROM incidents WHERE trackingToken = :token LIMIT 1")
    Incident getByTrackingToken(String token);

    @Query("SELECT * FROM incidents WHERE id = :id LIMIT 1")
    Incident getById(String id);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(Incident incident);

    @Update
    void update(Incident incident);
}
