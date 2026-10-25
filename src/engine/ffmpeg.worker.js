// Worker entry for ffmpeg. Our CSP enforces Trusted Types in workers too, and
// the multithreaded core starts more workers with plain URL strings. The
// policy must therefore exist BEFORE ffmpeg's own worker code runs; ES module
// imports are evaluated in order, so this file simply imports them in order.
import '../security/install.js';
import '@ffmpeg/ffmpeg/worker';
