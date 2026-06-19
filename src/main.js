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

camera.position.set(0, 5, 10)

// Renderer
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Floor
const floorGeometry = new THREE.PlaneGeometry(20, 20)
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x808080,
})

const floor = new THREE.Mesh(floorGeometry, floorMaterial)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

// Robot Cube
const geometry = new THREE.BoxGeometry(1, 1, 1)

const material = new THREE.MeshStandardMaterial({
  color: 0x0000ff,
})

const cube = new THREE.Mesh(geometry, material)
cube.position.y = 0.5
scene.add(cube)

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(5, 10, 5)
scene.add(directionalLight)

// Animation Loop
function animate() {
  requestAnimationFrame(animate)

  renderer.render(scene, camera)
}

animate()