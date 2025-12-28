//MAIN LOOP
const sim = new Worker("sim.js");
const fps_interval = 1000 / 30;// 1000ms/fps
const sim_interval = 1;
let last_frame = 0;
function loop(timestamp = 0) {//constant loop
    const delta = timestamp - last_frame;
    if (delta > fps_interval) {
        last_frame = timestamp - (delta % fps_interval);
        sim.postMessage({ mx, my });//message serves also as request for data
        draw();        
    }
   requestAnimationFrame(loop);//repeat loop
}

//update variables from the simulation
sim.onmessage = function(event) {
    ({ x,y,firing } = event.data);
};



//CANVAS
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

let x = 300
let y = 300;
const radius = 15;
const diameter = Math.PI * 2;
function draw() {
    //creature
    ctx.clearRect(0, 0, canvas.width, canvas.height);//clear canvas
    ctx.beginPath();//start drawing
    ctx.arc(x, y, radius, 0, diameter);
    ctx.fillStyle = "blue";
    ctx.fill();
    
    // joystick base
    ctx.beginPath();
    ctx.arc(joystick.baseX, joystick.baseY, joystick.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(100,100,100,0.3)";
    ctx.fill();
    // joystick stick
    ctx.beginPath();
    ctx.arc(joystick.stickX, joystick.stickY, joystick.stickRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(100,100,100,0.7)";
    ctx.fill();
}

// Joystick settings
let mx = 0;
let my = 0;
const joystick = {
  baseX: 120,
  baseY: canvas.height - 120,
  baseRadius: 60,
  stickX: 120,
  stickY: canvas.height - 120,
  stickRadius: 30,
  dragging: false  
};

function getDistance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function moveStick(x, y) {
  const dist = getDistance(joystick.baseX, joystick.baseY, x, y);

  if (dist <= joystick.baseRadius) {
    joystick.stickX = x;
    joystick.stickY = y;
  } else {
    const angle = Math.atan2(y - joystick.baseY, x - joystick.baseX);
    joystick.stickX = joystick.baseX + Math.cos(angle) * joystick.baseRadius;
    joystick.stickY = joystick.baseY + Math.sin(angle) * joystick.baseRadius;
  }

  // Normalized output (-1 to 1)
  mx = (joystick.stickX - joystick.baseX) / joystick.baseRadius;
  my = (joystick.stickY - joystick.baseY) / joystick.baseRadius;
}

// Mouse / Touch Events
function startDrag(x, y) {
  if (getDistance(joystick.stickX, joystick.stickY, x, y) < joystick.stickRadius) {
    joystick.dragging = true;
  }
}
function endDrag() {
  joystick.dragging = false;
  joystick.stickX = joystick.baseX;
  joystick.stickY = joystick.baseY;
  mx=0;my=0;
}

canvas.addEventListener("mousedown", e => startDrag(e.offsetX, e.offsetY));
canvas.addEventListener("mousemove", e => joystick.dragging && moveStick(e.offsetX, e.offsetY));
canvas.addEventListener("mouseup", endDrag);

canvas.addEventListener("touchstart", e => {
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  startDrag(t.clientX - rect.left, t.clientY - rect.top);
});
canvas.addEventListener("touchmove", e => {
  if (!joystick.dragging) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  moveStick(t.clientX - rect.left, t.clientY - rect.top);
});
canvas.addEventListener("touchend", endDrag);
window.addEventListener("mouseup", endDrag);




//3D
import * as THREE from './js/three/build/three.module.js';

var firing = [];//which neurons are firing

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 0);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("3Dcanvas") });
renderer.setSize(600, 600);

// Example 3D coordinates for 10 neurons
var positions = [];
//POSITIONS [right,up,front]
for(let i=0; i<4; i++){
    positions.push([i*20, -80, 45 ]);
}
let f=10;//grid
for(let j=0; j<50; j++){
    for(let k=0; k<1; k++){
        for(let i=50; i>0; i--){
            positions.push([(j/1.5)*f-90, (i/2.25)*f-100, k*f]);
        }
    }
}
//positions = positions.concat([[5,60,45], [15,60,45], [25,60,45], [35,60,45]]);//output

// Create neurons (flat circles)
const neurons = [];
positions.forEach((pos, i) => {
    const geometry = new THREE.CircleGeometry(2, 320);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    mesh.position.set(...pos);
    mesh.lookAt(camera.position); // Make circle face camera
    mesh.userData.id = i; // Assign ID based on index
    scene.add(mesh);
    neurons.push(mesh);
  });

camera.position.x = 50;
camera.position.y = 30;
camera.position.z = 240;
camera.lookAt(new THREE.Vector3(60, 20, 25));

// Render loop
function animate() {
    flash_neurons();
    requestAnimationFrame(animate);
    neurons.forEach(n => n.lookAt(camera.position)); // Keep circles facing camera
    renderer.render(scene, camera);
}
animate();

function flash_neurons(){//flash when neuron fires
    let neuron;
    for (let i=0; i<firing.length; i++) {
        neuron = neurons.find(n => n.userData.id === i);
        if(neuron){//found?
            if(firing[i] == true){//neuron is firing
                neuron.material.color.set(0xffffff);
            }else{
                neuron.material.color.set(0xff0000);
            }
        }
        
    }
}



//START
loop();