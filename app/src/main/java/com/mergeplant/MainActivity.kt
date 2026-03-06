package com.mergeplant

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.mergeplant.mintegral.MintegralManager

class MainActivity : AppCompatActivity() {

    // Replace these with your actual Placement ID and Ad Unit ID values
    // from the Mintegral console (https://ss.mintegral.com/), or supply them via
    // gradle properties (MINTEGRAL_BANNER_PLACEMENT_ID, etc.) which are injected
    // into BuildConfig at build time.
    private val bannerPlacementId = BuildConfig.MINTEGRAL_BANNER_PLACEMENT_ID
    private val bannerAdUnitId = BuildConfig.MINTEGRAL_BANNER_AD_UNIT_ID

    private val interstitialPlacementId = BuildConfig.MINTEGRAL_INTERSTITIAL_PLACEMENT_ID
    private val interstitialAdUnitId = BuildConfig.MINTEGRAL_INTERSTITIAL_AD_UNIT_ID

    private val rewardedPlacementId = BuildConfig.MINTEGRAL_REWARDED_PLACEMENT_ID
    private val rewardedAdUnitId = BuildConfig.MINTEGRAL_REWARDED_AD_UNIT_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val bannerContainer = findViewById<FrameLayout>(R.id.banner_container)
        val btnLoadBanner = findViewById<Button>(R.id.btn_load_banner)
        val btnLoadInterstitial = findViewById<Button>(R.id.btn_load_interstitial)
        val btnShowInterstitial = findViewById<Button>(R.id.btn_show_interstitial)
        val btnLoadRewarded = findViewById<Button>(R.id.btn_load_rewarded)
        val btnShowRewarded = findViewById<Button>(R.id.btn_show_rewarded)

        btnLoadBanner.setOnClickListener {
            MintegralManager.loadBanner(
                activity = this,
                placementId = bannerPlacementId,
                adUnitId = bannerAdUnitId,
                container = bannerContainer
            )
        }

        btnLoadInterstitial.setOnClickListener {
            MintegralManager.loadInterstitial(
                activity = this,
                placementId = interstitialPlacementId,
                adUnitId = interstitialAdUnitId
            )
        }

        btnShowInterstitial.setOnClickListener {
            MintegralManager.showInterstitial()
        }

        btnLoadRewarded.setOnClickListener {
            MintegralManager.loadRewarded(
                activity = this,
                placementId = rewardedPlacementId,
                adUnitId = rewardedAdUnitId
            )
        }

        btnShowRewarded.setOnClickListener {
            MintegralManager.showRewarded()
        }
    }
}
