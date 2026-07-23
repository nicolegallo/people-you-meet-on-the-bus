import { useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'

import busStopMarker from './assets/bus-stop-marker.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import 'leaflet/dist/leaflet.css'
import './App.css'

import { supabase } from './supabaseClient'


const storyIcon = L.icon({
  iconUrl: busStopMarker,
  iconSize: [32, 47],
  iconAnchor: [20, 60],
  popupAnchor: [0, -52],
})


const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})


L.Marker.prototype.options.icon = DefaultIcon


function LocationPicker({ setSelectedPosition, setIsFormOpen }) {
  useMapEvents({
    click(event) {
      setSelectedPosition(event.latlng)
      setIsFormOpen(false)
    },
  })

  return null
}


export default function App() {
  const [routes2025, setRoutes2025] = useState(null)
  const [stops2025, setStops2025] = useState(null)

  const [routes2026, setRoutes2026] = useState(null)
  const [stops2026, setStops2026] = useState(null)

  const [selectedNetwork, setSelectedNetwork] = useState('none')

  const [selectedPosition, setSelectedPosition] = useState(null)
  const [approvedStories, setApprovedStories] = useState([])

  const [storyText, setStoryText] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [route, setRoute] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(true)

  const [message, setMessage] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(true)


  useEffect(() => {
    fetchApprovedStories()
    load2025Network()
    load2026Network()
  }, [])


  async function loadGeoJson(path, label) {
    const response = await fetch(path)

    if (!response.ok) {
      throw new Error(`${label} failed to load: ${response.status}`)
    }

    return response.json()
  }


  async function load2025Network() {
    try {
      const [routes, stops] = await Promise.all([
        loadGeoJson('/data/indygo-routes.geojson', '2025 routes'),
        loadGeoJson('/data/indygo-stops.geojson', '2025 stops'),
      ])

      setRoutes2025(routes)
      setStops2025(stops)
    } catch (error) {
      console.error(error)
      setMessage('The 2025 network could not be loaded.')
    }
  }


  async function load2026Network() {
    try {
      const [routes, stops] = await Promise.all([
        loadGeoJson('/data/Routes_2602.geojson', '2026 routes'),
        loadGeoJson('/data/Stop_2602.geojson', '2026 stops'),
      ])

      setRoutes2026(routes)
      setStops2026(stops)
    } catch (error) {
      console.error(error)
      setMessage('The 2026 network could not be loaded.')
    }
  }


  async function fetchApprovedStories() {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setApprovedStories(data || [])
  }


  async function submitStory(event) {
    event.preventDefault()

    if (!selectedPosition) {
      setMessage('Tap the map to choose where this story happened.')
      return
    }

    if (!storyText.trim()) {
      setMessage('Write your story before submitting.')
      return
    }

    const { error } = await supabase.from('stories').insert([
      {
        story_text: storyText.trim(),
        display_name: isAnonymous ? null : displayName.trim(),
        is_anonymous: isAnonymous,
        route: route.trim(),
        lat: selectedPosition.lat,
        lng: selectedPosition.lng,
        status: 'pending',
      },
    ])

    if (error) {
      console.error(error)
      setMessage('Something went wrong. Check the console.')
      return
    }

    setStoryText('')
    setDisplayName('')
    setRoute('')
    setIsAnonymous(true)
    setSelectedPosition(null)
    setIsFormOpen(false)

    setMessage('Story submitted. It will appear after approval.')
  }


  function routeStyle() {
    return {
      color: '#0854a0',
      weight: 3,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }
  }


  function stopPointToLayer(feature, latlng) {
    return L.circleMarker(latlng, {
      radius: 2,
      color: '#222',
      fillColor: '#222',
      fillOpacity: 0.35,
      weight: 0,
    })
  }


  function bindRoutePopup(feature, layer) {
  const properties = feature.properties || {}

  const routeNumber =
    properties.route_short_name ||
    properties.Route ||
    properties.route

  const routeName =
    properties.route_long_name ||
    properties.RouteName ||
    properties.route_name

  const popupParts = []

  if (routeNumber) {
    popupParts.push(`<strong>Route ${routeNumber}</strong>`)
  } else {
    popupParts.push('<strong>IndyGo route</strong>')
  }

  if (routeName) {
    popupParts.push(routeName)
  }

  layer.bindPopup(popupParts.join('<br>'))

  layer.on('click', (event) => {
    setSelectedPosition(event.latlng)
    setIsFormOpen(false)
  })
}


function bindStopPopup(feature, layer) {
  const properties = feature.properties || {}

  const stopName =
    properties.stop_name ||
    properties.StopName ||
    properties.stop

  const stopId =
    properties.stop_id ||
    properties.StopID ||
    properties.stop_code

  const popupParts = [
    `<strong>${stopName || 'IndyGo bus stop'}</strong>`,
  ]

  if (stopId) {
    popupParts.push(`Stop ID: ${stopId}`)
  }

  layer.bindPopup(popupParts.join('<br>'))

  layer.on('click', () => {
    setSelectedPosition(layer.getLatLng())
    setIsFormOpen(false)
  })
}


  return (
    <div className="app">
      <MapContainer
        center={[39.7684, -86.1581]}
        zoom={12}
        className="map"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />

        <ZoomControl position="bottomleft" />


        {selectedNetwork === '2025' && routes2025 && (
          <GeoJSON
            key="routes-2025"
            data={routes2025}
            style={routeStyle}
            onEachFeature={bindRoutePopup}
          />
        )}

        {selectedNetwork === '2025' && stops2025 && (
          <GeoJSON
            key="stops-2025"
            data={stops2025}
            pointToLayer={stopPointToLayer}
            onEachFeature={bindStopPopup}
          />
        )}


        {selectedNetwork === '2026' && routes2026 && (
          <GeoJSON
            key="routes-2026"
            data={routes2026}
            style={routeStyle}
            onEachFeature={bindRoutePopup}
          />
        )}

        {selectedNetwork === '2026' && stops2026 && (
          <GeoJSON
            key="stops-2026"
            data={stops2026}
            pointToLayer={stopPointToLayer}
            onEachFeature={bindStopPopup}
          />
        )}


        <LocationPicker
          setSelectedPosition={setSelectedPosition}
          setIsFormOpen={setIsFormOpen}
        />

        {selectedPosition && (
          <Marker position={selectedPosition} />
        )}

        {approvedStories.map((story) => (
          <Marker
            key={story.id}
            position={[story.lat, story.lng]}
            icon={storyIcon}
          >
            <Popup>
              <div className="story-popup">
                {story.route && (
                  <p className="popup-route">
                    Route: {story.route}
                  </p>
                )}

                <p className="popup-story">
                  “{story.story_text}”
                </p>

                <p className="popup-author">
                  {story.is_anonymous
                    ? 'Anonymous'
                    : story.display_name || 'Anonymous'}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>


<div
  className={[
    'network-toggle',
    isFormOpen ? 'network-toggle-form-open' : '',
    isHelpOpen ? 'network-toggle-help-open' : '',
  ]
    .filter(Boolean)
    .join(' ')}
>
  <label htmlFor="network-select">
    Transit network
  </label>

  <select
    id="network-select"
    value={selectedNetwork}
    onChange={(event) => setSelectedNetwork(event.target.value)}
  >
    <option value="none">No network</option>
    <option value="2025">2025 network</option>
    <option value="2026">2026 network</option>
  </select>
</div>


      {isHelpOpen ? (
        <aside
          className="help-panel"
          role="dialog"
          aria-labelledby="help-title"
        >
          <button
            type="button"
            className="close-help-button"
            onClick={() => setIsHelpOpen(false)}
            aria-label="Close help instructions"
          >
            ×
          </button>

          <h2 id="help-title">
            How to use the story map
          </h2>

          <ol className="help-steps">
            <li>
              <strong>Explore the map.</strong> Tap a story marker to read a
              rider’s story.
            </li>

            <li>
              <strong>Choose a network.</strong> Select the 2025 or 2026
              network to display its routes and stops.
            </li>

            <li>
              <strong>Choose a location.</strong> Tap the map where your story
              happened.
            </li>

            <li>
              <strong>Add your story.</strong> Tap the “Add Story” button in
              the lower-right corner.
            </li>

            <li>
              <strong>Submit it.</strong> Your story will appear after it has
              been reviewed and approved.
            </li>
          </ol>

          <p className="help-note">
            Stories may be submitted anonymously.
          </p>
        </aside>
      ) : (
        <button
          type="button"
          className="help-button"
          onClick={() => setIsHelpOpen(true)}
          aria-label="Open help instructions"
          title="Help"
        >
          ?
        </button>
      )}


      {selectedPosition && !isFormOpen && (
        <button
          type="button"
          className="open-story-button"
          onClick={() => setIsFormOpen(true)}
        >
          Add Story
        </button>
      )}


      {isFormOpen && (
        <form
          className="story-form"
          onSubmit={submitStory}
        >
          <button
            type="button"
            className="close-form-button"
            onClick={() => setIsFormOpen(false)}
            aria-label="Close story form"
          >
            ×
          </button>

          <h1>People You Meet on the Bus</h1>

          <p>
            Tap the map, then share an IndyGo story.
          </p>

          <textarea
            placeholder="Tell your story."
            value={storyText}
            onChange={(event) => setStoryText(event.target.value)}
          />

          <input
            type="text"
            placeholder="Route number (optional)"
            value={route}
            onChange={(event) => setRoute(event.target.value)}
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />

            Submit anonymously
          </label>

          {!isAnonymous && (
            <input
              type="text"
              placeholder="Display name or nickname"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          )}

          <button
            type="submit"
            className="submit-story-button"
          >
            Submit Story
          </button>
        </form>
      )}


      {message && (
        <div className="map-message">
          {message}
        </div>
      )}
    </div>
  )
}