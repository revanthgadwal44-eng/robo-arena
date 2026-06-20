import './style.css'
import * as THREE from 'three'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

camera.position.set(0, 6, 10)

// Renderer
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(5, 10, 5)
scene.add(directionalLight)

// Floor
const floorGeometry = new THREE.PlaneGeometry(20, 20)

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080
})

const floor = new THREE.Mesh(floorGeometry, floorMaterial)

floor.rotation.x = -Math.PI / 2

scene.add(floor)

function createWall(x, z, width, depth) {

    const wallGeometry = new THREE.BoxGeometry(width,2,depth)

    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555
    })

    const wall = new THREE.Mesh(
        wallGeometry,
        wallMaterial
    )

    wall.position.set(x,1,z)

    scene.add(wall)
}

createWall(0,-10,20,1)
createWall(0,10,20,1)
createWall(-10,0,1,20)
createWall(10,0,1,20)

// ---------------- ROBOT ----------------

// Create robot group
const robot = new THREE.Group()

// Body
const bodyGeometry = new THREE.BoxGeometry(2, 1, 1)

const bodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x0000ff
})

const body = new THREE.Mesh(bodyGeometry, bodyMaterial)

robot.add(body)

// Head
const headGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7)

const headMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffff
})

const head = new THREE.Mesh(headGeometry, headMaterial)

head.position.set(0, 0.9, 0)

robot.add(head)

// Left wheel
const wheelGeometry = new THREE.BoxGeometry(0.3, 0.5, 0.5)

const wheelMaterial = new THREE.MeshStandardMaterial({
  color: 0x000000
})

const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)

leftWheel.position.set(-1.2, -0.5, 0)

robot.add(leftWheel)

// Right wheel
const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)

rightWheel.position.set(1.2, -0.5, 0)

robot.add(rightWheel)

// Raise robot above ground
robot.position.y = 1

scene.add(robot)


// ------------ MOVEMENT ------------

// stores key states
const keys = {}

window.addEventListener('keydown', (event) => {
  keys[event.key] = true
})

window.addEventListener('keyup', (event) => {
  keys[event.key] = false
})

const speed = 0.1
const rotationSpeed = 0.03

// Animation loop
function animate() {

  requestAnimationFrame(animate)

  // Rotate robot
if (keys['a']) {
    robot.rotation.y += rotationSpeed
}

if (keys['d']) {
    robot.rotation.y -= rotationSpeed
}

// Move relative to facing direction
if (keys['w']) {
    robot.position.x -= Math.sin(robot.rotation.y) * speed
    robot.position.z -= Math.cos(robot.rotation.y) * speed
}

if (keys['s']) {
    robot.position.x += Math.sin(robot.rotation.y) * speed
    robot.position.z += Math.cos(robot.rotation.y) * speed
}

// Camera offset behind robot
const offset = new THREE.Vector3(0, 5, 8)

offset.applyAxisAngle(
    new THREE.Vector3(0,1,0),
    robot.rotation.y
)

const desiredPosition = robot.position.clone().add(offset)

// Smooth movement
camera.position.lerp(desiredPosition,0.1)

// Look at robot
camera.lookAt(robot.position)
  renderer.render(scene, camera)
}

animate()

window.addEventListener('resize',()=>{

    camera.aspect =
        window.innerWidth/window.innerHeight

    camera.updateProjectionMatrix()

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    )

})