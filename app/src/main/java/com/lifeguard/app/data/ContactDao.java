package com.lifeguard.app.data;

import androidx.lifecycle.LiveData;
import androidx.room.Dao;
import androidx.room.Delete;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import com.lifeguard.app.models.Contact;
import java.util.List;

@Dao
public interface ContactDao {
    @Query("SELECT * FROM contacts ORDER BY isPrimary DESC, name ASC")
    LiveData<List<Contact>> getAllContacts();

    @Query("SELECT * FROM contacts ORDER BY isPrimary DESC, name ASC")
    List<Contact> getAllContactsSync();

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(Contact contact);

    @Update
    void update(Contact contact);

    @Delete
    void delete(Contact contact);

    @Query("UPDATE contacts SET isPrimary = 0")
    void clearPrimaryFlags();
}
