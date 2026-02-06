// Quick-DAT Maps integration
// Dependencies: none
window.QD = window.QD || {};
window.QD.integrations = window.QD.integrations || {};
window.QD.integrations.maps = window.QD.integrations.maps || {};

window.QD.integrations.maps.openGoogleMaps = function openGoogleMaps(loadData, context) {
  if (!loadData.origin || !loadData.destination) {
    alert('Could not extract origin and destination from the load details.');
    return;
  }

  // Try to get user's search origin from header
  const userOrigin = window.QD.extractors.extractUserSearchOrigin();
  const userDestination = window.QD.extractors.extractUserSearchDestination();

  let mapsUrl;
  if (userOrigin && userDestination) {
    // Route: User Origin → Load Origin → Load Destination → User Destination
    const start = encodeURIComponent(userOrigin);
    const waypoint = encodeURIComponent(loadData.origin);
    const destination = encodeURIComponent(loadData.destination);
    const end = encodeURIComponent(userDestination);
    mapsUrl = `https://www.google.com/maps/dir/${start}/${waypoint}/${destination}/${end}`;
  } else if (userOrigin) {
    // Route: User Origin → Load Origin → Load Destination
    const start = encodeURIComponent(userOrigin);
    const waypoint = encodeURIComponent(loadData.origin);
    const destination = encodeURIComponent(loadData.destination);
    mapsUrl = `https://www.google.com/maps/dir/${start}/${waypoint}/${destination}`;
  } else {
    // Fallback: Load Origin → Load Destination (original behavior)
    const origin = encodeURIComponent(loadData.origin);
    const destination = encodeURIComponent(loadData.destination);
    mapsUrl = `https://www.google.com/maps/dir/${origin}/${destination}`;
  }

  // Add subtle delay to prevent Chrome blocking
  setTimeout(() => {
    window.open(mapsUrl, '_blank');
  }, 50);
};
