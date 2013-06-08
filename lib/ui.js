"use strict"

var WORKER_TIME_LIMIT = 50000*1000

//Read in all the HTML elements
var viewer = require("gl-shells").makeViewer()
var potential_func = document.getElementById("potential")
var color_func = document.getElementById("color")
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

potential_func.addEventListener("change", handleChange)
color_func.addEventListener("change", handleChange)


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
    potential: potential_func.value,
    color: color_func.value,
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
    var test0 = new Function("x", "y", "z", potential_func.value)
    var test1 = new Function("x", "y", "z", color_func.value)
    for(var i=0; i<3; ++i) {
      if(+shape[i][0].value  >= shape[i][1].value) {
        throw new Error("Invalid range for " + vars[i])
      }
    }
    rebuildMesh()
  } catch(e) {
    handleError(e.toString())
  }
}

function handleError(str) {
  error_box.innerHTML = ""
  error_box.appendChild(document.createTextNode(str))
}
