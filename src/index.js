/* global window */
import React, { useRef, useState } from "react";
import ReactDOM from "react-dom";

import DeckGL from "@deck.gl/react";
import { WebMercatorViewport, View } from "@deck.gl/core";
import { StaticMap } from "react-map-gl";
import { GeoJsonLayer } from "@deck.gl/layers";
import * as turf from "@turf/turf";
import { bisector } from "d3-array";

import pop from "./county-populations.json";
import shape from "./counties.json";

const TARGET_COLOR = [43, 140, 190];
const BACKGROUND_COLOR = [236, 231, 242];
const SECONDARY_COLOR = [166, 189, 219];

const TARGET_POP = 8336817;
const DEFAULT_METRICS = { numPop: 0, numCounties: 0 };
const CONTINENTAL_US_BBOX = [
  [-66.885444, 49.384358],
  [-124.848974, 24.396308],
];
const INITIAL_VIEWPORT = {
  bearing: 0,
  pitch: 0,
  latitude: 36.38,
  longitude: -96.37,
  zoom: 1,
};

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function App() {
  const [target, setTarget] = useState("");
  const [neighbors, setNeighbors] = useState(null);
  const [metrics, setMetrics] = useState(DEFAULT_METRICS);
  const [viewport, setViewport] = useState(INITIAL_VIEWPORT);

  function handleResize({ width, height }) {
    const vw = new WebMercatorViewport({
      ...viewport,
      height,
      width,
    });
    const opts = { padding: 10 };
    if (window.innerWidth > 900) {
      opts.padding = 100;
    }
    const { zoom } = vw.fitBounds(CONTINENTAL_US_BBOX, opts);
    setViewport({ ...viewport, zoom, height, width });
  }

  function handleHover(info, event) {
    if (info && info.object) {
      const targetGeoId = info.object.properties.id;
      const {
        geos = [],
        numPop = 0,
        numCounties,
      } = checkIntersect(info.object);
      setTarget(targetGeoId);
      setNeighbors(geos);
      setMetrics({ numPop, numCounties });
    } else {
      setTarget("");
      setNeighbors(null);
      setMetrics(DEFAULT_METRICS);
    }
  }

  let msg;
  if (target === "06037") {
    msg = (
      <p>
        LA County is home to 10,081,570 people and exceeds the population of NYC
      </p>
    );
  } else if (target) {
    msg = (
      <p>{`Area represents ${numberWithCommas(metrics.numPop)} people in ${
        metrics.numCounties
      } US counties, compared to 8,336,817 in NYC.`}</p>
    );
  } else {
    msg = (
      <p>
        Tap to find the area of the US roughly equivalent to the population of
        NYC.
      </p>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Distributed NYC</h1>
        {msg}
      </div>
      <div className="deck-container">
        <Map
          data={shape}
          viewState={viewport}
          onHover={handleHover}
          onResize={handleResize}
          neighbors={neighbors}
          metrics={metrics}
        />
      </div>
    </div>
  );
}

function checkIntersect(poly) {
  const idsSortedbyDistance = _checkIntersect(poly, shape.features);
  let targetSum = 0;
  const geos = new Set();
  for (const geo of idsSortedbyDistance) {
    const { geoId, summable } = geo;
    targetSum = Number.isFinite(summable) ? targetSum + summable : targetSum;
    if (targetSum > TARGET_POP) {
      return { geos, numPop: targetSum - summable, numCounties: geos.size };
    }
    geos.add(geoId);
  }
}

const bisect = bisector((d) => d.distance);

function insertIntoSorted(obj, key, sortedArr) {
  const idx = bisect.right(sortedArr, obj[key]);
  sortedArr.splice(idx, 0, obj);
}

function _checkIntersect(poly, polyList) {
  const ownCentroid = turf.centroid(poly.geometry);
  const ownGeoId = poly.properties.id;
  const distanceList = [];

  for (const otherGeom of polyList) {
    const otherGeoId = otherGeom.properties.id;
    if (otherGeoId === ownGeoId) {
      continue;
    }

    const distance = turf.distance(
      ownCentroid,
      turf.center(otherGeom.geometry)
    );
    const obj = { geoId: otherGeoId, summable: pop[otherGeoId], distance };
    insertIntoSorted(obj, "distance", distanceList);
  }
  insertIntoSorted(
    { geoId: ownGeoId, summable: pop[ownGeoId], distance: 0 },
    "distance",
    distanceList
  );
  return distanceList;
}

function Map({ data, viewState, neighbors, onHover, onResize, metrics }) {
  const layer = new GeoJsonLayer({
    id: "geojson-layer",
    data,
    pickable: true,
    filled: true,
    stroked: true,
    lineWidthMinPixels: 0.3,
    updateTriggers: {
      getFillColor: [neighbors],
    },
    getFillColor: (d) => {
      if (neighbors && neighbors.has(d.properties.id)) {
        return TARGET_COLOR;
      }
      return SECONDARY_COLOR;
    },
    highlightColor: TARGET_COLOR,
    getLineColor: BACKGROUND_COLOR,
    autoHighlight: true,
    onHover,
  });

  return (
    <DeckGL
      initialViewState={viewState}
      controller={{
        pan: true,
        touchZoom: false,
        doubleClickZoom: false,
        dragRotate: false,
        scrollZoom: false,
      }}
      layers={[layer]}
      useDevicePixels={true}
      height={"100%"}
      onResize={onResize}
      width={"100%"}
    >
      <View id="map" width="100%">
        <StaticMap reuseMaps={true} mapStyle={null} />
      </View>
    </DeckGL>
  );
}

ReactDOM.render(<App />, document.getElementById("react-container"));
