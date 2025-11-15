
/* Example config for MMM-MyPackageTracker */
{
  module: "MMM-MyPackageTracker",
  position: "top_right",
  header: "Packages",
  config: {
    ship24ApiKey: "YOUR_SHIP24_KEY",
    ship24BaseUrl: "https://api.ship24.com/public/v1",
    mode: "list",
    seedTrackers: [
      // { trackingNumber: "9405511202575421535949", courier: "usps", description: "Home" }
    ],
    listPageSize: 50,
    pollIntervalMs: 5 * 60 * 1000,
    maxItems: 14,
    groupByStatus: true,
    showHeaderCount: true,
    showCarrierIcons: true,
    iconSize: 20,
    openOnClick: false,
    showTrackingLinks: false,
    debug: false
  }
}
