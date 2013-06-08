"use strict"

var rlemesh = require("rle-mesh")
var rlesample = require("rle-sample")
var normals = require("normals")

var coord_vars = ["x", "y", "z"]

function clamp(x) {
  if(0 < x) {
    if(1 > x) {
      return +x
    } else {
      return 1.0
    }
  }
  return 0.0
}

function buildMesh(ev) {
  //Build prefix and compute bounds
  var prefix  = []
  var dims    = [0,0,0]
  var bounds  = [[0,0,0],[0,0,0]]
  var shift   = [0,0,0]
  var scale   = [0,0,0]
  for(var i=0; i<3; ++i) {
    dims[i] = ev.data.dims[i]|0
    bounds[0][i] = +ev.data.bounds[0][i]
    bounds[1][i] = +ev.data.bounds[1][i]
    shift[i] = bounds[0][i]
    scale[i] = (bounds[1][i] - bounds[0][i]) / dims[i]
    prefix.push([coord_vars[i], "=+__ARRAY_INDEX[", i, "]*", (bounds[1][i] - bounds[0][i]) / dims[i], "+(", bounds[0][i], ");"].join(""))
  }
  prefix.push(ev.data.potential)
  var prefix_str = prefix.join("\n")
  
  //Create closures
  var potential = new Function("__ARRAY_INDEX", prefix_str)
  var color     = new Function("x", "y", "z", ev.data.color)
  
  //Sample surface
  var volume
  if(ev.data.sampler === "adaptive") {
    volume = rlesample.solid.adaptive([0,0,0], dims, ev.data.step, potential)
  } else {
    volume = rlesample.solid.dense([0,0,0], dims, potential)
  }
  var mesh = rlemesh(volume, [1,1,1], dims)

  //Compute vertex normals
  var vnormals = normals.vertexNormals(mesh.cells, mesh.positions)

  //Calculate colors & rescale positions
  var colors    = new Array(mesh.positions.length)
  for(var i=0; i<colors.length; ++i) {
    var p = mesh.positions[i]
    var c = color(p[0], p[1], p[2])
    colors[i] = [ clamp(c[0]), clamp(c[1]), clamp(c[2]) ]
    for(var j=0; j<3; ++j) {
      p[j] = scale[j] * p[j] + shift[j]
    }
  }

  //Pack mesh into typed array
  var vertex_count = 3 * 3 * mesh.cells.length
  var ptr = 0
  var position_array = new Float32Array(vertex_count)
  var normal_array = new Float32Array(vertex_count)
  var color_array = new Float32Array(vertex_count)
  for(var i=0; i<mesh.cells.length; ++i) {
    var c = mesh.cells[i]
    for(var j=0; j<c.length; ++j) {
      for(var k=0; k<3; ++k) {
        position_array[ptr] = mesh.positions[c[j]][k]
        color_array[ptr] = colors[c[j]][k]
        normal_array[ptr] = vnormals[c[j]][k]
        ++ptr
      }
    }
  }

  //Send back to client
  postMessage({
    success: true,
    packed: true,
    positions: position_array,
    normals: normal_array,
    colors: color_array
  })
}


onmessage = function(ev) {
  try {
    buildMesh(ev)
  } catch(e) {
    postMessage({
      success: false,
      error: e.toString()
    })
  }
}