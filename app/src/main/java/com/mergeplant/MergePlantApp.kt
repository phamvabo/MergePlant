package com.mergeplant

import android.app.Application
import com.mergeplant.mintegral.MintegralManager

class MergePlantApp : Application() {

    override fun onCreate() {
        super.onCreate()
        // Initialize the Mintegral SDK with your App ID and App Key from the Mintegral console.
        MintegralManager.init(
            context = this,
            appId = BuildConfig.MINTEGRAL_APP_ID,
            appKey = BuildConfig.MINTEGRAL_APP_KEY
        )
    }
}
