package com.lifeguard.app;

import android.app.Application;
import com.lifeguard.app.data.Repository;

public class LifeGuardApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        Repository.getInstance(this).initDefaults();
    }
}
