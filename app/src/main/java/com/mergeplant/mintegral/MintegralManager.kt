package com.mergeplant.mintegral

import android.app.Activity
import android.content.Context
import android.util.Log
import android.widget.FrameLayout
import com.mbridge.msdk.MBridgeConstans
import com.mbridge.msdk.mbbanner.out.BannerAdListener
import com.mbridge.msdk.mbbanner.out.MBBannerView
import com.mbridge.msdk.out.MBBidRewardVideoHandler
import com.mbridge.msdk.out.MBConfiguration
import com.mbridge.msdk.out.MBInterstitialHandler
import com.mbridge.msdk.out.MBInterstitialVideoHandler
import com.mbridge.msdk.out.MBRewardVideoHandler
import com.mbridge.msdk.out.MBridgeIds
import com.mbridge.msdk.out.RewardInfo
import com.mbridge.msdk.out.RewardVideoListener

/**
 * MintegralManager centralizes all Mintegral SDK interactions.
 *
 * Usage:
 *  1. Call [init] once in your Application.onCreate().
 *  2. Call [loadBanner], [loadInterstitial], or [loadRewarded] to pre-fetch ads.
 *  3. Call [showInterstitial] or [showRewarded] to display a loaded ad.
 */
object MintegralManager {

    private const val TAG = "MintegralManager"

    private var rewardedHandler: MBRewardVideoHandler? = null
    private var interstitialVideoHandler: MBInterstitialVideoHandler? = null
    private var interstitialHandler: MBInterstitialHandler? = null

    /**
     * Initializes the Mintegral SDK.
     *
     * @param context   Application context.
     * @param appId     Your Mintegral App ID (from the Mintegral console).
     * @param appKey    Your Mintegral App Key (from the Mintegral console).
     */
    fun init(context: Context, appId: String, appKey: String) {
        val sdkConfig = HashMap<String, Any>()
        sdkConfig[MBridgeConstans.MINTEGRAL_APP_ID] = appId
        sdkConfig[MBridgeConstans.MINTEGRAL_APP_KEY] = appKey
        MBConfiguration.getInstance().initSDK(context.applicationContext, sdkConfig)
        Log.d(TAG, "Mintegral SDK initialized (appId=$appId)")
    }

    // -------------------------------------------------------------------------
    // Banner
    // -------------------------------------------------------------------------

    /**
     * Loads and displays a banner ad inside [container].
     *
     * @param activity      The host activity.
     * @param placementId   Placement ID from the Mintegral console.
     * @param adUnitId      Ad Unit ID from the Mintegral console.
     * @param container     [FrameLayout] that will host the banner view.
     */
    fun loadBanner(
        activity: Activity,
        placementId: String,
        adUnitId: String,
        container: FrameLayout
    ) {
        val bannerView = MBBannerView(activity)
        bannerView.init(MBridgeIds(placementId, adUnitId))
        bannerView.setBannerAdListener(object : BannerAdListener {
            override fun onLoadSuccessed(ids: MBridgeIds?) {
                Log.d(TAG, "Banner loaded: placementId=$placementId")
            }

            override fun onLoadFailed(ids: MBridgeIds?, errorMsg: String?) {
                Log.e(TAG, "Banner load failed: $errorMsg")
            }

            override fun onLogImpression(ids: MBridgeIds?) {
                Log.d(TAG, "Banner impression logged")
            }

            override fun onClick(ids: MBridgeIds?) {
                Log.d(TAG, "Banner clicked")
            }

            override fun onLeaveApp(ids: MBridgeIds?) {}
            override fun onShowFullScreen(ids: MBridgeIds?) {}
            override fun onCloseFullScreen(ids: MBridgeIds?) {}
        })
        container.removeAllViews()
        container.addView(bannerView)
        bannerView.load()
    }

    // -------------------------------------------------------------------------
    // Interstitial Video
    // -------------------------------------------------------------------------

    /**
     * Loads an interstitial video ad.
     *
     * Call [showInterstitial] once the ad is ready.
     *
     * @param activity      The host activity.
     * @param placementId   Placement ID from the Mintegral console.
     * @param adUnitId      Ad Unit ID from the Mintegral console.
     */
    fun loadInterstitial(activity: Activity, placementId: String, adUnitId: String) {
        interstitialVideoHandler = MBInterstitialVideoHandler(
            activity,
            MBridgeIds(placementId, adUnitId)
        )
        interstitialVideoHandler?.setInterstitialVideoListener(object :
            com.mbridge.msdk.out.InterstitialVideoListener {
            override fun onLoadSuccess(ids: MBridgeIds?) {
                Log.d(TAG, "Interstitial loaded: placementId=$placementId")
            }

            override fun onVideoLoadSuccess(ids: MBridgeIds?) {}
            override fun onVideoLoadFail(ids: MBridgeIds?, errorMsg: String?) {
                Log.e(TAG, "Interstitial video load failed: $errorMsg")
            }

            override fun onAdShow(ids: MBridgeIds?) {
                Log.d(TAG, "Interstitial shown")
            }

            override fun onAdClose(ids: MBridgeIds?, isCompleteView: Boolean) {
                Log.d(TAG, "Interstitial closed (completed=$isCompleteView)")
            }

            override fun onShowFail(ids: MBridgeIds?, errorMsg: String?) {
                Log.e(TAG, "Interstitial show failed: $errorMsg")
            }

            override fun onVideoAdClicked(ids: MBridgeIds?) {
                Log.d(TAG, "Interstitial clicked")
            }

            override fun onVideoComplete(ids: MBridgeIds?) {}
            override fun onAdCloseWithIVReward(ids: MBridgeIds?, isCompleteView: Boolean, rewardAlertStatus: Int) {}
            override fun onEndcardShow(ids: MBridgeIds?) {}
        })
        interstitialVideoHandler?.load()
    }

    /**
     * Shows the previously loaded interstitial ad.
     * Make sure [loadInterstitial] has been called and the ad is ready.
     */
    fun showInterstitial() {
        val handler = interstitialVideoHandler
        if (handler != null && handler.isReady) {
            handler.show()
        } else {
            Log.w(TAG, "Interstitial ad is not ready yet")
        }
    }

    // -------------------------------------------------------------------------
    // Rewarded Video
    // -------------------------------------------------------------------------

    /**
     * Loads a rewarded video ad.
     *
     * Call [showRewarded] once the ad is ready.
     *
     * @param activity      The host activity.
     * @param placementId   Placement ID from the Mintegral console.
     * @param adUnitId      Ad Unit ID from the Mintegral console.
     */
    fun loadRewarded(activity: Activity, placementId: String, adUnitId: String) {
        rewardedHandler = MBRewardVideoHandler(
            activity,
            MBridgeIds(placementId, adUnitId)
        )
        rewardedHandler?.setRewardVideoListener(object : RewardVideoListener {
            override fun onLoadSuccess(ids: MBridgeIds?) {
                Log.d(TAG, "Rewarded video loaded: placementId=$placementId")
            }

            override fun onVideoLoadSuccess(ids: MBridgeIds?) {}
            override fun onVideoLoadFail(ids: MBridgeIds?, errorMsg: String?) {
                Log.e(TAG, "Rewarded video load failed: $errorMsg")
            }

            override fun onAdShow(ids: MBridgeIds?) {
                Log.d(TAG, "Rewarded video shown")
            }

            override fun onAdClose(ids: MBridgeIds?, isCompleteView: Boolean, rewardInfo: RewardInfo?) {
                Log.d(TAG, "Rewarded video closed (completed=$isCompleteView, reward=${rewardInfo?.rewardName})")
            }

            override fun onShowFail(ids: MBridgeIds?, errorMsg: String?) {
                Log.e(TAG, "Rewarded video show failed: $errorMsg")
            }

            override fun onVideoAdClicked(ids: MBridgeIds?) {
                Log.d(TAG, "Rewarded video clicked")
            }

            override fun onVideoComplete(ids: MBridgeIds?) {
                Log.d(TAG, "Rewarded video completed")
            }

            override fun onEndcardShow(ids: MBridgeIds?) {}
        })
        rewardedHandler?.load()
    }

    /**
     * Shows the previously loaded rewarded video ad.
     * Make sure [loadRewarded] has been called and the ad is ready.
     *
     * @param rewardId Optional reward ID to pass to the SDK. Pass an empty string to use
     *                 the default reward configured in the Mintegral console.
     */
    fun showRewarded(rewardId: String = "") {
        val handler = rewardedHandler
        if (handler != null && handler.isReady) {
            handler.show(rewardId)
        } else {
            Log.w(TAG, "Rewarded video ad is not ready yet")
        }
    }
}
