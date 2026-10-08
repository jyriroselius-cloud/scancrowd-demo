package ai.scanwai.scancrowd.demo;

import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            injectNavBarInset();
        }
    }

    private void injectNavBarInset() {
        View root = getWindow().getDecorView();
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(root);
        if (insets == null) return;
        int bottomPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        if (bottomPx <= 0) return;
        // WindowInsets returns physical pixels; CSS uses dp (logical pixels)
        float density = getResources().getDisplayMetrics().density;
        int bottomDp = Math.round(bottomPx / density);
        String js = "document.documentElement.style.setProperty('--safe-bottom','" + bottomDp + "px');";
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(js, null)
            );
        }
    }
}
