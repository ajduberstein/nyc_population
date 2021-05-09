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

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function App() {
  const [target, setTarget] = useState("none");
  const [neighbors, setNeighbors] = useState([]);
  const [metrics, setMetrics] = useState({});

  function handleHover(info, event) {
    if (info && info.object) { const targetGeoId = info.object.properties.id;
      const {geos = [], numPop, numCounties} = checkIntersect(info.object);
      setTarget(targetGeoId);
      setNeighbors(geos);
      setMetrics({numPop, numCounties});
    } else {
      setTarget(0);
      setNeighbors([]);
      setMetrics({});
    }
  }

  return (
    <div style={{fontFamily: 'sans-serif'}}>
      <div style={{height: '15vh', margin: '10px'}}>
        <h1>Distributed New York City</h1>
        <p>{metrics.numCounties ? `Purple area representing ${numberWithCommas(metrics.numPop)} people in ${metrics.numCounties} US counties` : <em>Mouseover map</em>}</p>
      </div>
      <div className="deck-container" style={{position: 'relative', top: '10px'}}>
        <Map
          data={shape}
          viewState={VIEWPORT}
          target={target}
          onHover={handleHover}
          neighbors={neighbors} />
      </div>
    </div>
  );
}

function checkIntersect(poly) {
  const idsSortedbyDistance = _checkIntersect(poly, shape.features);
  const TARGET_POP = 8336817;
  let targetSum = 0;
  const geos = [];
  for (const geo of idsSortedbyDistance) {
    const {geoId, summable} = geo;
    targetSum = Number.isFinite(summable) ? targetSum + summable : targetSum;
    if (targetSum > TARGET_POP) {
      return {geos, numPop: targetSum - summable, numCounties: geos.length}
    }
    geos.push(geoId);
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


const VIEWPORT = {
    ...(new WebMercatorViewport()).fitBounds([[-124.5, 48.22], [-67.1, 25.31]]),
    "bearing": 0,
    "pitch": 0,
    "zoom": window.screen.clientWidth > 700 ? 3.81 : 2.5
};

function Map({data, viewState, target, neighbors, onHover}) {
  const layer = new GeoJsonLayer({
    id: 'geojson-layer',
    data,
    pickable: true,
    filled: true,
    stroked: true,
    lineWidthMinPixels: 1,
    updateTriggers: {
        getFillColor: [target, neighbors],
        getLineColor: [target, neighbors]
    },
    getFillColor: d => {
      if (d.properties.id === target) {
        return [128, 0, 128]
      }
      if (neighbors && neighbors.includes(d.properties.id)) {
        return [128, 0, 128]
      }
      return [255, 255, 0, 128]
    },
    getLineColor: d => {
      if (d.properties.id === target) {
        return [255, 255, 255]
      }
      if (neighbors && neighbors.includes(d.properties.id)) {
        return [255, 255, 255]
      }
      return [25, 25, 25]
    },
    onClick: (info, event) => console.log(info),
    onHover
  });


  const deckglRef = useRef(null);

  function onViewportChange({viewState, interactionState, oldViewState}) {
    console.log('we are changing the viewport')
    return {
      height: deckglRef.current.clientHeight,
      width: deckglRef.current.clientWidth,
      ...viewState
    }
  }

  return (
    <DeckGL ref={deckglRef} initialViewState={VIEWPORT}
      controller={true}
      layers={[layer]}
      onViewStateChange={v => console.log(v.viewState)}
      height={'100vh'}
      width={'100vw'}
    >
      <View id="map" width="100%">
        <StaticMap mapStyle={null} />
      </View>
    </DeckGL>);
}


ReactDOM.render(
  (
    <App />
  ),
  document.getElementById('react-container')
);

