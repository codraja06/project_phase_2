import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { MapSurfaceProps, MapPin } from './MapSurface.types';

function safeJson(val: any): string {
  return JSON.stringify(val).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

function generateWebLeafletHtml({
  latitude,
  longitude,
  interactive,
  pins,
  hasLocationSelector,
}: {
  latitude: number;
  longitude: number;
  interactive: boolean;
  pins?: MapPin[];
  hasLocationSelector: boolean;
}): string {
  const safePins = pins && pins.length > 0 ? pins : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CivicTrack OpenStreetMap</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    * { box-sizing: border-box; }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #F3ECE8;
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
      background: #BE2638;
      border: 3px solid #FFFFFF;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .marker-outer:hover {
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
    }
    .popup-title {
      font-weight: 700;
      color: #2C101B;
      margin-bottom: 2px;
    }
    .popup-address {
      font-size: 11px;
      color: #64748B;
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
        zoom: 16,
        zoomControl: isInteractive,
        dragging: isInteractive,
        touchZoom: isInteractive,
        doubleClickZoom: isInteractive,
        scrollWheelZoom: isInteractive,
        boxZoom: false,
        attributionControl: true
      });

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
      }).addTo(map);

      var customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-outer"><div class="marker-inner"></div></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
      });

      function postMsg(data) {
        if (window.parent && window.parent.postMessage) {
          window.parent.postMessage(JSON.stringify(data), '*');
        }
      }

      var currentMarker = null;

      if (pinsData && pinsData.length > 0) {
        pinsData.forEach(function(pin) {
          if (typeof pin.latitude === 'number' && typeof pin.longitude === 'number') {
            var marker = L.marker([pin.latitude, pin.longitude], { icon: customIcon, title: pin.title || 'Reported civic issue', alt: pin.title || 'Reported civic issue' }).addTo(map);
            if (marker.getElement()) marker.getElement().setAttribute('aria-label', pin.title || 'Reported civic issue');
            if (pin.title || pin.address) {
              var content = document.createElement('div');
              var heading = document.createElement('div'); heading.className = 'popup-title'; heading.textContent = pin.title || 'Civic Issue'; content.appendChild(heading);
              if (pin.address) { var address = document.createElement('div'); address.className = 'popup-address'; address.textContent = pin.address; content.appendChild(address); }
              marker.bindPopup(content);
            }
            marker.on('click', function() {
              postMsg({ type: 'pin_selected', id: pin.id });
            });
          }
        });
      } else {
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

      window.addEventListener('message', function(e) {
        try {
          var payload = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (payload && payload.type === 'center_update') {
            map.panTo([payload.latitude, payload.longitude], { animate: true, duration: 0.5 });
            if (currentMarker && !pinsData) {
              currentMarker.setLatLng([payload.latitude, payload.longitude]);
            }
          }
        } catch(err) {}
      });
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
}: MapSurfaceProps) {
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);

  const validCoords =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const lat = validCoords ? latitude : 12.9716;
  const lng = validCoords ? longitude : 77.5946;

  // Listen to messages from the iframe
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'location_selected' && onSelectLocation) {
          onSelectLocation(data.latitude, data.longitude);
        } else if (data?.type === 'pin_selected' && onSelectPin) {
          onSelectPin(data.id);
        }
      } catch {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [onSelectLocation, onSelectPin]);

  // Center update message to iframe
  useEffect(() => {
    if (iframeRef && iframeRef.contentWindow && validCoords) {
      iframeRef.contentWindow.postMessage(
        JSON.stringify({ type: 'center_update', latitude: lat, longitude: lng }),
        '*'
      );
    }
  }, [lat, lng, validCoords, iframeRef]);

  const htmlDoc = useMemo(
    () =>
      generateWebLeafletHtml({
        latitude: lat,
        longitude: lng,
        interactive,
        pins,
        hasLocationSelector: !!onSelectLocation,
      }),
    [lat, lng, interactive, pins, !!onSelectLocation]
  );

  if (!validCoords) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Coordinates not provided</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* React Native Web renders iframe natively */}
      <iframe
        ref={(el) => setIframeRef(el as unknown as HTMLIFrameElement)}
        title="CivicTrack OpenStreetMap"
        srcDoc={htmlDoc}
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          backgroundColor: '#F3ECE8',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3ECE8',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3ECE8',
    padding: 16,
  },
  fallbackText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
});
