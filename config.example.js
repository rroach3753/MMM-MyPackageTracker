// config.example.js — MMM-MyPackageTracker v4.0.0
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    ship24ApiKey: "YOUR-SHIP24-KEY",
    mode: "list",
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    webhooks: { enabled: false, port: 8567, path: "/ship24/webhook", secret: "changeme" },
    maxItems: 14,
    iconColor: "ffffff",
    debug: false
  }
}
