/* global window */
import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import DeckGL from '@deck.gl/react';
import { GeoJsonLayer } from '@deck.gl/layers';
import * as turf from '@turf/turf';
import { Heap } from 'heap-js';
import {bisector} from 'd3-array';

import pop from './county-populations.json';
import shape from './counties.json';

function App() {
  const [target, setTarget] = useState("none");
  const [neighbors, setNeighbors] = useState([]);

  function handleHover(info, event) {
    if (info && info.object) {
      const targetGeoId = info.object.properties.geo_id;
      const neighbors = checkIntersect(info.object);
      setTarget(targetGeoId);
      setNeighbors(neighbors);
    } else {
      setTarget(0);
      setNeighbors([]);
    }
  }

  return (
    <div>
      <h1>Distributed New York</h1>
      <p>Mouseover any part of the US to distribute the population of New York to that area</p>
      <Map data={shape} viewState={viewport} target={target} onHover={handleHover} neighbors={neighbors} />
    </div>
  );
}

// function checkIntersect(poly, polyList) {
//   const intersectList = [];
//   console.log(turf);
//   const bufferedGeom = turf.buffer(poly.geometry, 0.1, {units: 'miles'});
//   for (const otherGeom of polyList) {
//     if (otherGeom.properties.geo_id === poly.properties.geo_id) {
//       continue;
//     }
//     if (turf.intersect(bufferedGeom, otherGeom.geometry)) {
//       intersectList.push(otherGeom.properties.geo_id)
//     }
//   }
//   return intersectList;
// }

// Take a 400 mile buffer
// Take all the shapes that are within the buffer, sorted by distnace
// Sum populations of the closest until they're just under the population
function checkIntersect(poly) {
  glog(`Found target ${JSON.stringify(poly, null, 2)}`, poly.properties.geo_id === "56013")
  const idsSortedbyDistance = _checkIntersect(poly, shape.features);
  const TARGET_POP = 10000000;
  let targetSum = 0;
  const geos = [];
  for (const geo of idsSortedbyDistance) {
    glog(`Target sum is ${targetSum}`, poly.properties.geo_id === "56013")
    const {geoId, summable} = geo;
    targetSum = Number.isFinite(summable) ? targetSum + summable : targetSum;
    if (targetSum > TARGET_POP) {
      console.log('Found', targetSum - summable, 'over', geos.length)
      return geos;
    }
    geos.push(geoId);
  }
}

const bisect = bisector(d => d.distance);

function glog(msg, bool) {
  if (bool) console.log(msg);
}

function insertIntoSorted(obj, key, sortedArr) {
  const idx = bisect.right(sortedArr, obj[key])
  sortedArr.splice(idx, 0, obj);
}

function _checkIntersect(poly, polyList) {
  const ownCentroid = turf.centroid(poly.geometry);
  const ownGeoId = poly.properties.geo_id;
  const distanceList = [];

  for (const otherGeom of polyList) {
    const otherGeoId = otherGeom.properties.geo_id
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
    "zoom": 3.903536075444697
};

function Map({data, viewState, target, neighbors, onHover}) {
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
      if (d.properties.geo_id === target) {
        return [128, 0, 128]
      }
      if (neighbors && neighbors.includes(d.properties.geo_id)) {
        return [128, 0, 128]
      }
      return [255, 255, 0, 128]
    },
    onClick: (info, event) => console.log(info.object.properties.geo_id),
    getLineColor: d => {
      if (d.properties.geo_id === target) {
        return [255, 255, 255]
      }
      if (neighbors && neighbors.includes(d.properties.geo_id)) {
        return [255, 255, 255]
      }
      return [0, 0, 0]
    },
    onHover,
  });

  return (<DeckGL viewState={viewState}
    layers={[layer]}
    controller={true}
     />);
}


ReactDOM.render(
  (
    <App />
  ),
  document.getElementById('react-container')
);
