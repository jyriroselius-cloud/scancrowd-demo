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
        int bottom = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        if (bottom <= 0) return;
        String js = "document.documentElement.style.setProperty('--safe-bottom','" + bottom + "px');";
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(js, null)
            );
        }
    }
}
