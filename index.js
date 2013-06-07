"use strict"

//Start all the worker threads
if(typeof window !== "undefined") {
  require("./lib/ui.js")
} else {
  require("./lib/mesh-worker.js")
}