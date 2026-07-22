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
    click(e) {
      setSelectedPosition(e.latlng)
      setIsFormOpen(false)
    },
  })

  return null
}

export default function App() {
  const [routesGeoJson, setRoutesGeoJson] = useState(null)
const [stopsGeoJson, setStopsGeoJson] = useState(null)
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
  loadRoutes()
  loadStops()
}, [])

async function loadRoutes() {
  const response = await fetch('/data/indygo-routes.geojson')
  const data = await response.json()
  setRoutesGeoJson(data)
}

async function loadStops() {
  const response = await fetch('/data/indygo-stops.geojson')
  const data = await response.json()
  setStopsGeoJson(data)
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

    setApprovedStories(data)
  }

  async function submitStory(e) {
    e.preventDefault()

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
        story_text: storyText,
        display_name: isAnonymous ? null : displayName,
        is_anonymous: isAnonymous,
        route,
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

{routesGeoJson && (
  <GeoJSON
    data={routesGeoJson}
style={{
  color: "#0854a0",
  weight: 3,
  opacity: 0.75,
  lineCap: "round",
  lineJoin: "round",
}}
  />
)}

{stopsGeoJson && (
  <GeoJSON
    data={stopsGeoJson}
    pointToLayer={(feature, latlng) =>
      L.circleMarker(latlng, {
        radius: 2,
        color: '#222',
        fillColor: '#222',
        fillOpacity: 0.35,
        weight: 0,
      })
    }
  />
)}

        <LocationPicker
  setSelectedPosition={setSelectedPosition}
  setIsFormOpen={setIsFormOpen}
/>

        {selectedPosition && <Marker position={selectedPosition} />}

        {approvedStories.map((story) => (
          <Marker
  key={story.id}
  position={[story.lat, story.lng]}
  icon={storyIcon}
>
            <Popup>
              <div className="story-popup">
                {story.route && <p className="popup-route">Route: {story.route}</p>}

                <p className="popup-story">“{story.story_text}”</p>

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

    <h2 id="help-title">How to use the story map</h2>

    <ol className="help-steps">
      <li>
        <strong>Explore the map.</strong> Tap a bus stop marker to read a
        rider’s story.
      </li>

      <li>
        <strong>Choose a location.</strong> Tap the map where your story
        happened.
      </li>

      <li>
        <strong>Add your story.</strong> Tap the “Add Story” button in the
        upper-right corner.
      </li>

      <li>
        <strong>Submit it.</strong> Your story will appear after it has been
        reviewed and approved.
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
  <form className="story-form" onSubmit={submitStory}>
    <button
  type="button"
  className="close-form-button"
  onClick={() => setIsFormOpen(false)}
  aria-label="Close story form"
>
  ×
</button>
        <h1>People You Meet on the Bus</h1>
        <p>Tap the map, then share an IndyGo story.</p>

        <textarea
          placeholder="Tell your story."
          value={storyText}
          onChange={(e) => setStoryText(e.target.value)}
        />

        <input
          placeholder="Route number (optional)"
          value={route}
          onChange={(e) => setRoute(e.target.value)}
        />

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          Submit anonymously
        </label>

        {!isAnonymous && (
          <input
            placeholder="Display name or nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}

        <button type="submit" className="submit-story-button">
  Submit Story
</button>

        {message && <div className="map-message">{message}</div>}
      </form>
      )}
    </div>
  )
}
