import './style.css'
import * as THREE from 'three'

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const bullets = [];
// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)

camera.position.set(0, 6, 10)

let playerHealth = 100;
let kills = 0;

const scoreDiv = document.createElement('div');

scoreDiv.style.position = 'absolute';
scoreDiv.style.top = '10px';
scoreDiv.style.left = '10px';
scoreDiv.style.color = 'white';
scoreDiv.style.fontSize = '24px';

document.body.appendChild(scoreDiv);

const enemyBullets = [];

let wave = 1;
let enemiesKilledThisWave = 0;

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

// Enemy
const enemyGeometry = new THREE.BoxGeometry(1, 1, 1);

const enemyMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000
});

const enemies = [];

function createEnemy(x,z){

    const enemy = new THREE.Mesh(
        enemyGeometry,
        enemyMaterial.clone()
    );

    enemy.position.set(
        x,
        1,
        z
    );

    enemy.userData = {
        health:50
    };

    scene.add(enemy);

    enemies.push(enemy);

}

createEnemy(5,0);
createEnemy(-5,5);
createEnemy(0,-6);;

// ------------ MOVEMENT ------------

// stores key states
const keys = {}

window.addEventListener('keydown', (event) => {

    if (event.code === 'Space') {
        event.preventDefault();
        shoot();
    }

    keys[event.key.toLowerCase()] = true;

});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false
})

const speed = 0.1
const rotationSpeed = 0.03

function shoot() {

    const bulletGeometry = new THREE.SphereGeometry(0.15);

    const bulletMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00
    });

    const bulletMesh = new THREE.Mesh(
        bulletGeometry,
        bulletMaterial
    );

    // Spawn bullet at robot
    bulletMesh.position.copy(robot.position);

    // Slightly above ground
    bulletMesh.position.y = 1;

    scene.add(bulletMesh);

    // Direction robot is facing
    const direction = new THREE.Vector3(
        -Math.sin(robot.rotation.y),
        0,
        -Math.cos(robot.rotation.y)
    );

    bullets.push({
        mesh: bulletMesh,
        direction: direction
    });
}
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

for (let bullet of bullets) {

    bullet.mesh.position.add(
        bullet.direction.clone().multiplyScalar(0.3)
    );

}

for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = bullets[bulletIndex];
    let bulletRemoved = false;

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemies[enemyIndex];
        const distance = bullet.mesh.position.distanceTo(enemy.position);

        if (distance < 1) {
            enemy.userData.health -= 10;
            scene.remove(bullet.mesh);
            bullets.splice(bulletIndex, 1);
            bulletRemoved = true;

            if (enemy.userData.health === 40) {
                enemy.material.color.set(0xff8800);
            }

            if (enemy.userData.health === 20) {
                enemy.material.color.set(0xffff00);
            }

            if (enemy.userData.health <= 0) {
                scene.remove(enemy);
                enemies.splice(enemyIndex, 1);
                kills++;
                enemiesKilledThisWave++;
            }
            break;
        }
    }

    if (!bulletRemoved && bullet.mesh.position.length() > 50) {
        scene.remove(bullet.mesh);
        bullets.splice(bulletIndex, 1);
    }
}

// Smooth movement
camera.position.lerp(desiredPosition,0.1)

// Look at robot
camera.lookAt(robot.position)
  renderer.render(scene, camera)

scoreDiv.innerHTML = `
Health : ${Math.floor(playerHealth)}
<br>
Kills : ${kills}
<br>
Wave : ${wave}
`;


for (const enemy of enemies) {

    const direction =
    robot.position
    .clone()
    .sub(enemy.position)
    .normalize();

    enemy.position.add(
        direction.multiplyScalar(0.02)
    );

}
for (const enemy of enemies) {
    const enemyDistance = enemy.position.distanceTo(robot.position);
    if (enemyDistance < 1.5) {
        playerHealth -= 0.1;
    }
}

for (let bulletIndex = enemyBullets.length - 1; bulletIndex >= 0; bulletIndex--) {
    const bullet = enemyBullets[bulletIndex];

    bullet.mesh.position.add(
        bullet.direction.clone()
        .multiplyScalar(0.1)
    );

    const distance =
    bullet.mesh.position.distanceTo(
        robot.position
    );

    if(distance < 1){

        playerHealth -= 10;

        scene.remove(bullet.mesh);
        enemyBullets.splice(bulletIndex, 1);
        continue;

    }

    if(
        bullet.mesh.position.length() > 50
    ){

        scene.remove(
            bullet.mesh
        );
        enemyBullets.splice(bulletIndex, 1);

    }
}

if(playerHealth <= 0){

    playerHealth = 100;

    robot.position.set(
        0,
        1,
        0
    );

}
if(enemies.length === 0){

    wave++;

    enemiesKilledThisWave = 0;

    for(
        let i=0;
        i<wave+2;
        i++
    ){

        createEnemy(

            Math.random()*16-8,

            Math.random()*16-8

        );

    }

}



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

function enemyShoot(){
for (const enemy of enemies) {
    const bulletGeometry =
new THREE.SphereGeometry(0.15);

const bulletMaterial =
new THREE.MeshStandardMaterial({
color:0xff0000
});

const bulletMesh =
new THREE.Mesh(
bulletGeometry,
bulletMaterial
);

bulletMesh.position.copy(enemy.position);

scene.add(bulletMesh);

const direction =
robot.position
.clone()
.sub(enemy.position)
.normalize();

enemyBullets.push({
    mesh: bulletMesh,
    direction: direction
});
}

}

setInterval(()=>{

enemyShoot();

},1000);