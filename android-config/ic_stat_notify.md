# Notification Icon

The Capacitor LocalNotifications plugin requires `ic_stat_notify` as a small notification icon in the Android res drawable directories.

## Add the icon after `npx cap add android`

1. Create a 24×24 dp PNG (white silhouette on transparent background) of the camera/check icon.
2. Copy it into each density folder in `android/app/src/main/res/`:

```
drawable-mdpi/ic_stat_notify.png    (24×24 px)
drawable-hdpi/ic_stat_notify.png    (36×36 px)
drawable-xhdpi/ic_stat_notify.png   (48×48 px)
drawable-xxhdpi/ic_stat_notify.png  (72×72 px)
drawable-xxxhdpi/ic_stat_notify.png (96×96 px)
```

A quick way using Android Studio: right-click `res` → **New → Image Asset** → Icon Type: **Notification Icons** → name it `ic_stat_notify`.

The icon color `#3ddc97` is set in `capacitor.config.ts` (`iconColor`).
