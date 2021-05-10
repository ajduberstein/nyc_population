/* global window */
import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import DeckGL from '@deck.gl/react';
import {WebMercatorViewport, View} from '@deck.gl/core';
import {StaticMap} from 'react-map-gl';
import { GeoJsonLayer } from '@deck.gl/layers';
import * as turf from '@turf/turf';
import {bisector} from 'd3-array';

import pop from './county-populations.json';
import shape from './counties.json';
import './App.css';

function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1);
};

const TARGET_POP = 8336817;
const DEFAULT_METRICS = {numPop: 0, numCounties: 0};
const CONTINENTAL_US_BBOX = [
   [-66.885444, 49.384358],
   [-124.848974, 24.396308],
];
const INITIAL_VIEWPORT = {
    "bearing": 0,
    "pitch": 0,
    "latitude": 36.38,
    "longitude": -96.37,
    "zoom": 1,
};

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function App() {
  const [target, setTarget] = useState("");
  const [neighbors, setNeighbors] = useState(null);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);
  const [computing, setComputing] = useState(false);

  function handleResize({width, height}) {
    const vw = new WebMercatorViewport({
      ...viewport, height, width
    });
    const { zoom } = vw.fitBounds(CONTINENTAL_US_BBOX);
    setViewport({...viewport, zoom, height, width});
  }

  function handleHover(info, event) {
    if (info && info.object) {
      const targetGeoId = info.object.properties.id;
      setComputing(true);
      const {geos = [], numPop = 0, numCounties} = checkIntersect(info.object);
      setComputing(false);
      setTarget(targetGeoId);
      setNeighbors(geos);
      setMetrics({numPop, numCounties});
    } else {
      setTarget("");
      setNeighbors(null);
      setMetrics(DEFAULT_METRICS);
    }
  }

  let msg;
  if (computing) {
    msg = (<p>Computing</p>);
  }
  else if (target === "06037") {
    msg = (<p>{metrics.numCounties ? `LA County is 10,081,570 and exceeds the population of NYC` : <em>Mouseover or tap map. Pinch or scroll to zoom.</em>}</p>)
  } else if (target) {
    msg = (<p>{`Highlighted area representing ${numberWithCommas(metrics.numPop)} people in ${metrics.numCounties} US counties, compared to 8,336,817 in NYC.`}</p>)
  }
  else {
    msg = (<p><i>Mouseover/tap map, scroll/pinch to zoom</i></p>)
  }

  return (
    <div>
      <div className='header'>
        <h1>Distributed New York City</h1>
        {msg}
      </div>
      <div className="deck-container" >
        <Map
          data={shape}
          viewState={viewport}
          target={target}
          onHover={handleHover}
          onResize={handleResize}
          neighbors={neighbors} />
      </div>
    </div>
  );
}

function checkIntersect(poly) {
  const idsSortedbyDistance = _checkIntersect(poly, shape.features);
  let targetSum = 0;
  const geos = new Set();
  for (const geo of idsSortedbyDistance) {
    const {geoId, summable} = geo;
    targetSum = Number.isFinite(summable) ? targetSum + summable : targetSum;
    geos.add(geoId);
    if (targetSum >= TARGET_POP) {
      return {geos, numPop: targetSum, numCounties: geos.size}
    }
  }
}

const bisect = bisector(d => d.distance);

function insertIntoSorted(obj, key, sortedArr) {
  const idx = bisect.right(sortedArr, obj[key])
  sortedArr.splice(idx, 0, obj);
}

function _checkIntersect(poly, polyList) {
  const ownCentroid = turf.center(poly.geometry);
  const ownGeoId = poly.properties.id;
  const distanceList = [];

  for (const otherGeom of polyList) {
    const otherGeoId = otherGeom.properties.id
    if (otherGeoId === ownGeoId) {
      continue;
    }

    const distance = turf.distance(ownCentroid, turf.center(otherGeom.geometry));
    const obj = {geoId: otherGeoId, summable: pop[otherGeoId], distance}
    insertIntoSorted(obj, 'distance', distanceList)
  }
  insertIntoSorted({geoId: ownGeoId, summable: pop[ownGeoId], distance: 0}, 'distance', distanceList)
  return distanceList;
}

function Map({data, viewState, target, neighbors, onHover, onResize}) {
  const layer = new GeoJsonLayer({
    id: 'geojson-layer',
    data,
    pickable: true,
    filled: true,
    stroked: true,
    lineWidthMinPixels: 1,
    updateTriggers: {
        getFillColor: [neighbors]
    },
    getFillColor: d => {
      if (neighbors && neighbors.has(d.properties.id)) {
        return [218, 127, 143]
      }
      return [225, 229, 234, 128]
    },
    highlightColor: [218, 127, 143, 128],
    getLineColor: [25, 25, 25, 128],
    onHover,
    autoHighlight: true
  });


  const deckglRef = useRef(null);

  return (
    <DeckGL ref={deckglRef} initialViewState={viewState}
      controller={true}
      layers={[layer]}
      useDevicePixels={true}
      height={'100%'}
      onResize={onResize} 
      width={'100%'}
    >
      <View id="map" width="100%">
        <StaticMap reuseMaps={true} mapStyle={null} />
      </View>
    </DeckGL>);
}


ReactDOM.render(
  (
    <App/>
  ),
  document.getElementById('react-container')
);

