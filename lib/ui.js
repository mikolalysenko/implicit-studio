"use strict"

var WORKER_TIME_LIMIT = 5*1000
var ERROR_FADE_TIME = 1*1000

//Import codemirror
require("./codemirror.js")

//Read in all the HTML elements
var viewer = require("gl-shells").makeViewer()
var error_box = document.getElementById("errorpane")

var shape = new Array(3)
var vars = ["X", "Y", "Z"]
for(var i=0; i<3; ++i) {
  shape[i] = [
    document.getElementById("min" + vars[i]),
    document.getElementById("max" + vars[i]),
    document.getElementById("dims" + vars[i])
  ]
  for(var j=0; j<3; ++j) {
    shape[i][j].addEventListener("change", handleChange)
  }
}

//Create editors
var potential_func = CodeMirror.fromTextArea(document.getElementById("potential"), {mode: "javascript"})
potential_func.setSize("100%", "100%")
potential_func.on("change", handleChange)

var color_func = CodeMirror.fromTextArea(document.getElementById("color"), {mode: "javascript"})
color_func.setSize("100%", "100%")
color_func.on("change", handleChange)

//Create worker
var worker
var job_timeout
var blocked=false
var queued=false

function restartWorker() {
  if(worker) {
    worker.terminate()
  }
  if(job_timeout) {
    clearTimeout(job_timeout)
  }
  blocked = false
  worker = new Worker("bundle.js")
  worker.onmessage = function(ev) {
    blocked = false
    if(ev.data.success) {
      viewer.updateMesh(ev.data)
      if(queued) {
        queued = false
        rebuildMesh()
      }
    } else {
      handleError(ev.data.error)
    }
  }
}

function rebuildMesh() {
  if(blocked) {
    queued = true
    return
  }
  worker.postMessage({
    potential: potential_func.getValue(),
    color: color_func.getValue(),
    sampler: "dense",
    bounds: [ [ shape[0][0].value, shape[1][0].value, shape[2][0].value ],
              [ shape[0][1].value, shape[1][1].value, shape[2][1].value ] ],
    dims: [ shape[0][2].value, shape[1][2].value, shape[2][2].value ]
  })
  blocked = true
  setTimeout(restartWorker, WORKER_TIME_LIMIT)
}

restartWorker()
rebuildMesh()

function handleChange() {
  try {
    var test0 = new Function("x", "y", "z", potential_func.getValue())
    var test1 = new Function("x", "y", "z", color_func.getValue())
    for(var i=0; i<3; ++i) {
      if(+shape[i][0].value  >= +shape[i][1].value) {
        throw new Error("Invalid range for " + vars[i])
      }
    }
    if(error_interval) {
      error_clock = Math.min(error_clock, Date.now() - 0.9*ERROR_FADE_TIME)
    }
    rebuildMesh()
  } catch(e) {
    handleError(e.toString())
  }
}

var error_interval = null
var error_clock = Date.now()

function handleError(str) {
  error_box.innerHTML = ""
  error_box.appendChild(document.createTextNode(str))
  error_box.style.color = "rgba(255, 0, 0, 1)"
  error_box.style["background-color"] = "rgba(255, 255, 255, 0.5)"
  if(error_interval) {
    clearInterval(error_interval)
  }
  error_clock = Date.now()
  error_interval = setInterval(tickError, 30)
}

function tickError() {
  var t = (Date.now() - error_clock) / ERROR_FADE_TIME
  if(t > 1.0) {
    clearInterval(error_interval)
    error_box.innerHTML = ""
    error_box.style["background-color"]="rgba(0,0,0,0)"
    error_interval = null
    return
  }
  
  error_box.style.color = "rgba(255, 0, 0, " + (1.0-Math.pow(t,4.0)) + ")"
  var intensity = (Math.floor(255*Math.pow(1.0-t,2.0))|0)+""
  error_box.style["background-color"] = "rgba(" + intensity + "," + intensity + "," + intensity + "," + (0.5*(1.0-t)) + ")"
}

