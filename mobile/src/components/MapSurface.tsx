import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, View, Text, Linking, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { MapSurfaceProps, MapPin } from './MapSurface.types';

/**
 * Escapes strings safely for embedding inside JavaScript script blocks.
 */
function safeJson(val: any): string {
  return JSON.stringify(val).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/**
 * Generates self-contained HTML that uses Leaflet.js with standard OpenStreetMap raster tiles.
 * Conforms to OpenStreetMap Tile Usage Policy with proper attribution.
 */
function generateLeafletHtml({
  latitude,
  longitude,
  interactive,
  pins,
  hasLocationSelector,
  zoom = 16,
}: {
  latitude: number;
  longitude: number;
  interactive: boolean;
  pins?: MapPin[];
  hasLocationSelector: boolean;
  zoom?: number;
}): string {
  const safePins = pins && pins.length > 0 ? pins : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>CivicTrack OpenStreetMap</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #EDF2EF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .marker-outer {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #16634B;
      border: 3px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease;
    }
    .marker-outer:hover, .marker-outer:active {
      transform: scale(1.15);
    }
    .marker-inner {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #FFC107;
    }
    .leaflet-popup-content-wrapper {
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
      font-size: 13px;
      padding: 4px 2px;
    }
    .leaflet-popup-content {
      margin: 8px 12px;
      line-height: 1.4;
    }
    .popup-title {
      font-weight: 700;
      color: #102F27;
      margin-bottom: 2px;
    }
    .popup-address {
      font-size: 11px;
      color: #64748B;
    }
    .leaflet-control-attribution {
      font-size: 9px !important;
      background: rgba(255, 255, 255, 0.85) !important;
      padding: 0 6px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    (function() {
      var initialLat = ${latitude};
      var initialLng = ${longitude};
      var isInteractive = ${interactive ? 'true' : 'false'};
      var canSelectLocation = ${hasLocationSelector ? 'true' : 'false'};
      var pinsData = ${safeJson(safePins)};

      var map = L.map('map', {
        center: [initialLat, initialLng],
        zoom: ${zoom},
        zoomControl: isInteractive,
        dragging: isInteractive,
        touchZoom: isInteractive,
        doubleClickZoom: isInteractive,
        scrollWheelZoom: isInteractive,
        boxZoom: false,
        attributionControl: true
      });

      // Standard OpenStreetMap Tile Layer with required attribution
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      }).addTo(map);

      // Create Custom SVG-like HTML Marker Icon
      var customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-outer"><div class="marker-inner"></div></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
      });

      map.on('zoomend', function() { postMsg({ type: 'zoom_changed', zoom: map.getZoom() }); });
      var currentMarker = null;

      function postMsg(data) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }

      if (pinsData && pinsData.length > 0) {
        pinsData.forEach(function(pin) {
          if (typeof pin.latitude === 'number' && typeof pin.longitude === 'number') {
            var marker = L.marker([pin.latitude, pin.longitude], { icon: customIcon, title: pin.title || 'Reported civic issue', alt: pin.title || 'Reported civic issue' }).addTo(map);
            if (marker.getElement()) marker.getElement().setAttribute('aria-label', pin.title || 'Reported civic issue');
            if (pin.title || pin.address) {
              var content = '<div class="popup-title">' + (pin.title || 'Civic Issue') + '</div>';
              if (pin.address) {
                content += '<div class="popup-address">' + pin.address + '</div>';
              }
              marker.bindPopup(content);
            }
            marker.on('click', function() {
              postMsg({ type: 'pin_selected', id: pin.id });
            });
          }
        });
      } else {
        // Single location pin (Incident / Location Picker)
        currentMarker = L.marker([initialLat, initialLng], {
          icon: customIcon,
          draggable: isInteractive && canSelectLocation,
          title: 'Incident location', alt: 'Incident location'
        }).addTo(map);
        if (currentMarker.getElement()) currentMarker.getElement().setAttribute('aria-label', 'Incident location');

        if (isInteractive && canSelectLocation) {
          currentMarker.on('dragend', function(e) {
            var pos = e.target.getLatLng();
            postMsg({ type: 'location_selected', latitude: pos.lat, longitude: pos.lng });
          });

          map.on('click', function(e) {
            var lat = e.latlng.lat;
            var lng = e.latlng.lng;
            currentMarker.setLatLng([lat, lng]);
            postMsg({ type: 'location_selected', latitude: lat, longitude: lng });
          });
        }
      }

      window.updateCenter = function(lat, lng) {
        if (typeof lat === 'number' && typeof lng === 'number') {
          map.panTo([lat, lng], { animate: true, duration: 0.5 });
          if (currentMarker && !pinsData) {
            currentMarker.setLatLng([lat, lng]);
          }
        }
      };
    })();
  </script>
</body>
</html>`;
}

export function MapSurface({
  latitude,
  longitude,
  interactive = false,
  pins,
  onSelectPin,
  onSelectLocation,
  zoom = 16, onZoomChange,
}: MapSurfaceProps) {
  const webViewRef = useRef<WebView>(null);
  const [loadError, setLoadError] = useState(false);
  const [externalError, setExternalError] = useState('');

  const validCoords =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const lat = validCoords ? latitude : 12.9716;
  const lng = validCoords ? longitude : 77.5946;

  // Pan WebView when coordinates change
  useEffect(() => {
    if (validCoords && webViewRef.current) {
      const js = `if (window.updateCenter) { window.updateCenter(${lat}, ${lng}); } true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [lat, lng, validCoords]);

  const htmlContent = useMemo(
    () =>
      generateLeafletHtml({
        latitude: lat,
        longitude: lng,
        interactive,
        pins,
        hasLocationSelector: !!onSelectLocation,
        zoom,
      }),
    [lat, lng, interactive, pins, !!onSelectLocation, zoom]
  );

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'zoom_changed' && onZoomChange) onZoomChange(data.zoom);
      if (data.type === 'location_selected' && onSelectLocation) {
        onSelectLocation(data.latitude, data.longitude);
      } else if (data.type === 'pin_selected' && onSelectPin) {
        onSelectPin(data.id);
      }
    } catch {
      // Ignore parse errors
    }
  };

  const openInExternalMap = async () => {
    setExternalError('');
    // Open standard OpenStreetMap coordinate viewer
    const osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    const geoUrl = `geo:${lat},${lng}?q=${lat},${lng}`;

    if (Platform.OS === 'android') {
      try {
        const canOpenGeo = await Linking.canOpenURL(geoUrl);
        if (canOpenGeo) {
          await Linking.openURL(geoUrl);
          return;
        }
      } catch {
        // Fall back to OSM Web
      }
    }

    try {
      await Linking.openURL(osmUrl);
    } catch {
      setExternalError('Unable to open map application.');
    }
  };

  if (!validCoords) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="map-outline" size={32} color="#64748B" />
        <Text style={styles.fallbackTitle}>Coordinates not provided</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.fallbackContainer}>
        <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
        <Text style={styles.fallbackTitle}>OpenStreetMap preview unavailable</Text>
        <Text style={styles.coordsText}>Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        <TouchableOpacity
          style={styles.externalButton}
          onPress={openInExternalMap}
          accessibilityRole="button"
          accessibilityLabel="Open incident in OpenStreetMap"
        >
          <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.externalButtonText}>View on OpenStreetMap</Text>
        </TouchableOpacity>
        {!!externalError && <Text style={styles.errorText}>{externalError}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://www.openstreetmap.org' }}
        style={styles.webView}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#16634B" />
            <Text style={styles.loadingText}>Loading OpenStreetMap...</Text>
          </View>
        )}
        onError={() => setLoadError(true)}
        onHttpError={() => setLoadError(true)}
        onMessage={handleMessage}
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EDF2EF',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDF2EF',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#EDF2EF',
    gap: 8,
  },
  fallbackTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#102F27',
    textAlign: 'center',
  },
  coordsText: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
  },
  externalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16634B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  externalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    textAlign: 'center',
  },
});
