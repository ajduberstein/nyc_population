/* global window */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import DeckGL from '@deck.gl/react';
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
  const [active, setActive] = useState(true);
  const [county, setCounty] = useState(null);

  function handleHover(info, event) {
    if (info && info.object) {
      const targetGeoId = info.object.properties.id;
      const {geos, numPop, numCounties} = checkIntersect(info.object);
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
      <h1>Distributed New York</h1>
      <div>
        <p>{metrics.numCounties ? `Purple area representing ${numberWithCommas(metrics.numPop)} people in ${metrics.numCounties} US counties` : 'Mouseover map'}</p>
      </div>
      <div className="deck-container" style={{height: '100vh', width: '100vw', position: 'relative'}}>
        <Map data={shape} viewState={viewport} target={target} onHover={active ? handleHover : null} neighbors={neighbors} />
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
  const ownCentroid = turf.centroid(poly.geometry);
  const ownGeoId = poly.properties.id;
  const distanceList = [];

  for (const otherGeom of polyList) {
    const otherGeoId = otherGeom.properties.id
    if (otherGeoId === ownGeoId) {
      continue;
    }

    const distance = turf.distance(ownCentroid, turf.centroid(otherGeom.geometry));
    const obj = {geoId: otherGeoId, summable: pop[otherGeoId], distance}
    insertIntoSorted(obj, 'distance', distanceList)
  }
  insertIntoSorted({geoId: ownGeoId, summable: pop[ownGeoId], distance: 0}, 'distance', distanceList)
  return distanceList;
}


const viewport = {
    "latitude": 37.62469781276222,
    "longitude": -95.91054294008634,
    "bearing": 0,
    "pitch": 0,
    "zoom": 3.75
};

function Map({data, viewState, target, neighbors, onHover, active}) {
  /**
   * Data format:
   * Valid GeoJSON object
   */
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
    onHover
  });

  return (<DeckGL viewState={viewState}
    layers={[layer]}
   />);
}


ReactDOM.render(
  (
    <App />
  ),
  document.getElementById('react-container')
);
