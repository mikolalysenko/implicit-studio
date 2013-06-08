"use strict"

var isosurface = require("isosurface")
var normals = require("normals")
var spatialNoise = require("spatial-noise")

Math.noise1 = spatialNoise.noise1f
Math.noise2 = spatialNoise.noise2f
Math.noise3 = spatialNoise.noise3f
Math.noise4 = spatialNoise.noise4f
Math.noise  = spatialNoise.noiseNf

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
  var potential = new Function("x", "y", "z", ev.data.potential)
  var color     = new Function("x", "y", "z", ev.data.color)
  var dims      = ev.data.dims
  var bounds    = ev.data.bounds
  var mesh      = isosurface.surfaceNets(
      [ dims[0]|0, dims[1]|0, dims[2]|0 ],
      potential,
      [ [ +bounds[0][0], +bounds[0][1], +bounds[0][2] ],
        [ +bounds[1][0], +bounds[1][1], +bounds[1][2] ] ] )
  
  //Calculate colors
  var colors    = new Array(mesh.positions.length)
  for(var i=0; i<colors.length; ++i) {
    var p = mesh.positions[i]
    var c = color(p[0], p[1], p[2])
    colors[i] = [ clamp(c[0]), clamp(c[1]), clamp(c[2]) ]
  }
  
  //Compute vertex normals
  var vnormals = normals.vertexNormals(mesh.cells, mesh.positions)
  
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