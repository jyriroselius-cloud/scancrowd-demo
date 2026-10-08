package ai.scanwai.scancrowd.demo;

import android.view.View;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            injectSystemInsets();
        }
    }

    private void injectSystemInsets() {
        View root = getWindow().getDecorView();
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(root);
        if (insets == null) return;

        float density = getResources().getDisplayMetrics().density;

        // Physical px → CSS dp
        int topDp    = Math.round(insets.getInsets(WindowInsetsCompat.Type.statusBars()).top    / density);
        int bottomDp = Math.round(insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom / density);

        if (topDp <= 0 && bottomDp <= 0) return;

        String js =
            "document.documentElement.style.setProperty('--safe-top','"    + topDp    + "px');" +
            "document.documentElement.style.setProperty('--safe-bottom','" + bottomDp + "px');";

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(js, null)
            );
        }
    }
}
