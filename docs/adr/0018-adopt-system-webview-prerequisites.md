# Adopt and diagnose system WebView prerequisites

Status: accepted

The React renderer will run in the platform WebView supplied by MyGo: WKWebView on macOS, WebView2 on Windows, and WebKitGTK 4.1 on Linux. Install and startup diagnostics must detect missing prerequisites and provide guidance, and each supported platform must include that dependency in its parity gate.
