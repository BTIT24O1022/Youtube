// A tiny in-memory registry so that if more than one <video> element exists
// on the page (e.g. the main player plus a hover-preview elsewhere), only
// one plays at a time -- matches "prevent multiple videos from playing
// simultaneously."
let current = null;

export const setActivePlayer = (videoEl) => {
  if (current && current !== videoEl && !current.paused) {
    current.pause();
  }
  current = videoEl;
};
