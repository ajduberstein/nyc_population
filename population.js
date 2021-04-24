/* global window */
import React from 'react';
import ReactDOM from 'react-dom';


ReactDOM.render(
  (
    <div>
    <h1>Hello, world!</h1>
    <p>Hey</p>
    <input type='button' value='start audio' onClick={activateAudioContext}></input>
    </div>

  ),
  document.getElementById('react-container')
);

function activateAudioContext() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContext();
  
  // Ask for audio device
  navigator.getUserMedia = navigator.getUserMedia || 
                           navigator.mozGetUserMedia || 
                           navigator.webkitGetUserMedia;
  navigator.getUserMedia({audio: true}, (stream) => startUserMedia(audioContext, stream), function(e) {
    console.log("No live audio input in this browser: " + e);
  });
}

// Define function called by getUserMedia 
function startUserMedia(audioContext, stream) {
  // Create MediaStreamAudioSourceNode
  const source = audioContext.createMediaStreamSource(stream);

  // Setup options
  const options = {
   source: source,
   voiceStop: respondStop,
   voiceStart: respondStart
  }; 
  
  // Create VAD
  const vad = new VAD(options);
}

function respondStart() {
  console.log('hey');
  document.body.style.background = 'red';
}

function respondStop() {
  document.body.style.background = 'blue';
}

