import * as THREE from 'three';
import * as dat from 'dat.gui';
import * as Stats from 'stats.js';
import gsap from 'gsap';

import './styles.css';


/**
 * Base
 */

const canvas = document.querySelector('#canvas');

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

const paramters = {
    background: {
        color: 0x333333
    },
    ambientLight: {
        color: 0xffffff,
        intensity: 1
    },
    directionalLight: {
        color: 0xffffff,
        intensity: 1
    },
    cube: {
        size: 2,
        order: 3,
        colors: [
            0xff0000,
            0x00ff00,
            0x0000ff,
            0xffff00,
            0xff00ff,
            0x00ffff
        ],
        invisibleColor: 0x000000,
        randomness: 10
    },
    control: {
        threshold: 0.05
    }
};


/**
 * Texture
 */

const parseURL = url => `/rubiks-cube/${url}`;
const textureLoader = new THREE.TextureLoader();
const borderTexture = textureLoader.load(parseURL('textures/border.png'));


/**
 * Scene
 */

const scene = new THREE.Scene();


/**
 * Camera
 */

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
camera.position.set(10, 10, 10);
camera.lookAt(scene.position);
scene.add(camera);


/**
 * Renderer
 */

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(paramters.background.color);

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});


/**
 * Lights
 */

const ambientLight = new THREE.AmbientLight(
    paramters.ambientLight.color,
    paramters.ambientLight.intensity
);
scene.add(ambientLight);


/**
 * Objects
 */

let dragStartObj;
let dragStartFace;
let isRotating = false;
const boxGeometry = new THREE.BoxGeometry(
    paramters.cube.size, paramters.cube.size, paramters.cube.size
);
const cubeInvisibleMaterial = new THREE.MeshStandardMaterial({
    color: paramters.cube.invisibleColor
});
let cubeMaterials;
let cubes;
const renderCube = () => {
    cubeMaterials && cubeMaterials.forEach(item => item.dispose());
    cubes && cubes.forEach(cube => scene.remove(cube));

    cubes = [];
    const size = paramters.cube.size;
    const order = paramters.cube.order;
    const offset = size * 0.5 * (order - 1);
    cubeMaterials = paramters.cube.colors
        .map(color => new THREE.MeshStandardMaterial({ color, map: borderTexture }));
    
        for (let x = 0; x < order; x++) {
            for (let y = 0; y < order; y++) {
                for (let z = 0; z < order; z++) {
                    const materials = [...cubeMaterials];
                    x !== order - 1 && (materials[0] = cubeInvisibleMaterial);
                    x !== 0 && (materials[1] = cubeInvisibleMaterial);
                    y !== order - 1 && (materials[2] = cubeInvisibleMaterial);
                    y !== 0 && (materials[3] = cubeInvisibleMaterial);
                    z !== order - 1 && (materials[4] = cubeInvisibleMaterial);
                    z !== 0 && (materials[5] = cubeInvisibleMaterial);
                    if (materials.every(material => material === cubeInvisibleMaterial)) {
                        continue;
                    }
                    
                    const cube = new THREE.Mesh(boxGeometry, materials);
                    cube.userData = {
                        x: x * size - offset,
                        y: y * size - offset,
                        z: z * size - offset
                    };
                    cube.position.set(cube.userData.x, cube.userData.y, cube.userData.z);
                    
                    cubes.push(cube);
                    scene.add(cube);
                }
            }
        }
        
};
const random = (left, right) => Math.floor(Math.random() * (right - left + 1)) + left;
const randomCube = (times = 0) => {
    if (!times) { return }
    dragStartObj = cubes[random(0, cubes.length - 1)];
    const directions = ['up', 'left', 'right'];
    let dragOffsetX = (Math.random() - 0.5) * 2;
    dragOffsetX += (dragOffsetX > 0 ? 1 : -1) * paramters.control.threshold;
    let dragOffsetY = (Math.random() - 0.5) * 2;
    dragOffsetY += (dragOffsetY > 0 ? 1 : -1) * paramters.control.threshold;
    rotateCube({
        dragOffset: {
            x: dragOffsetX,
            y: dragOffsetY
        },
        faceDirection: directions[random(0, directions.length - 1)],
        onComplete: () => {
            randomCube(times - 1);
        }
    });
    dragStartObj = null;
};
const roundVector = vec => vec.set(
    Math.round(vec.x),
    Math.round(vec.y),
    Math.round(vec.z)
);
const getDragStartFaceDirection = () => {
    const normal = dragStartFace.normal.clone()
        .applyMatrix4(
            new THREE.Matrix4()
                .extractRotation(dragStartObj.matrixWorld)
        );
    roundVector(normal);

    if (normal.y === 1) {
        return 'up';
    } else if (normal.z === 1) {
        return 'left';
    } else if (normal.x === 1) {
        return 'right';
    }
};
const checkWin = () => {
    let bingo = cubes.every(cube =>
        cube.position.x === cube.userData.x &&
        cube.position.y === cube.userData.y &&
        cube.position.z === cube.userData.z
    );
    bingo && alert('Congratulations!');
};
const rotateCube = ({ dragOffset = {}, faceDirection, onComplete }) => {
    faceDirection = faceDirection || getDragStartFaceDirection();
    const toRotateCubes = [];
    const rotateAxis = new THREE.Vector3();
    let positive = 1;
    if (faceDirection === 'up') {
        if (
            dragOffset.x < 0 && dragOffset.y > 0 ||
            dragOffset.x > 0 && dragOffset.y < 0
        ) {
            toRotateCubes.push(
                ...cubes.filter(cube => cube.position.z === dragStartObj.position.z)
            );
            rotateAxis.set(0, 0, 1);
            positive = dragOffset.x < 0 ? 1 : -1;
        }

        if (
            dragOffset.x < 0 && dragOffset.y < 0 ||
            dragOffset.x > 0 && dragOffset.y > 0 
        ) {
            toRotateCubes.push(
                ...cubes.filter(cube => cube.position.x === dragStartObj.position.x)
            );
            rotateAxis.set(1, 0, 0);
            positive = dragOffset.x < 0 ? 1 : -1;
        }
    } else if (faceDirection === 'left') {

        // 左右转
        if (Math.abs(dragOffset.x) > Math.abs(dragOffset.y)) {
            toRotateCubes.push(
                ...cubes.filter(cube => cube.position.y === dragStartObj.position.y)
            );
            rotateAxis.set(0, 1, 0);
            positive = dragOffset.x > 0 ? 1 : -1;
        }

        // 上下转
        if (Math.abs(dragOffset.y) > Math.abs(dragOffset.x)) {
            toRotateCubes.push(
                ...cubes.filter(cube => cube.position.x === dragStartObj.position.x)
            );
            rotateAxis.set(1, 0, 0);
            positive = dragOffset.y < 0 ? 1 : -1;
        }
    } else if (faceDirection === 'right') {

        // 左右转
        if (Math.abs(dragOffset.x) > Math.abs(dragOffset.y)) {
            toRotateCubes.push(
                ...cubes.filter(cube => cube.position.y === dragStartObj.position.y)
            );
            rotateAxis.set(0, 1, 0);
            positive = dragOffset.x > 0 ? 1 : -1;
        }

        // 上下转
        if (Math.abs(dragOffset.y) > Math.abs(dragOffset.x)) {
            toRotateCubes.push(
                ...cubes.filter(cube => cube.position.z === dragStartObj.position.z)
            );
            rotateAxis.set(0, 0, 1);
            positive = dragOffset.y > 0 ? 1 : -1;
        }
    }
    toRotateCubes.forEach(cube => {
        cube.userData.preStatus = {
            position: cube.position.clone(),
            rotation: cube.rotation.clone()
        };
    });
    const progress = { value: 0 };
    isRotating = true;
    gsap.fromTo(progress, { value: 0 }, {
        value: 1,
        duration: 0.3,
        onUpdate: () => {
            toRotateCubes.forEach(cube => {
                cube.position.copy(cube.userData.preStatus.position);
                cube.rotation.copy(cube.userData.preStatus.rotation);
                cube.applyMatrix4(
                    new THREE.Matrix4()
                        .makeTranslation(cube.userData.x, cube.userData.y, cube.userData.z)
                        .makeRotationAxis(
                            rotateAxis,
                            positive * Math.PI / 2 * progress.value
                        )
                );
            });
        },
        onComplete: () => {
            toRotateCubes.forEach(cube => {
                roundVector(cube.position);
            });
            isRotating = false;
            typeof onComplete === 'function' && onComplete();
            checkWin();
        }
    });
};
const rotateAll = ({ dragOffset = {} }) => {
    let rotateAxis = new THREE.Vector3();
    let positive = 1;
    if (Math.abs(dragOffset.x) > Math.abs(dragOffset.y)) {
        rotateAxis.set(0, 1, 0);
        dragOffset.x < 0 && (positive = -1);
    }

    if (Math.abs(dragOffset.y) > Math.abs(dragOffset.x)) {
        rotateAxis.set(1, 0, 0);
        dragOffset.y > 0 && (positive = -1);
    }

    cubes.forEach(cube => {
        cube.userData.preStatus = {
            position: cube.position.clone(),
            rotation: cube.rotation.clone()
        }; 
    });
    const progress = { value: 0 };
    isRotating = true;
    gsap.fromTo(progress, { value: 0 }, {
        value: 1,
        duration: 0.3,
        onUpdate: () => {
            cubes.forEach(cube => {
                cube.position.copy(cube.userData.preStatus.position);
                cube.rotation.copy(cube.userData.preStatus.rotation);
                cube.applyMatrix4(
                    new THREE.Matrix4()
                        .makeTranslation(cube.userData.x, cube.userData.y, cube.userData.z)
                        .makeRotationAxis(
                            rotateAxis,
                            positive * Math.PI / 2 * progress.value
                        )
                );
            });
        },
        onComplete: () => {
            cubes.forEach(cube => {
                const { x, y, z } = cube.userData;
                const vec = roundVector(new THREE.Vector3(x, y, z)
                    .applyMatrix4(
                        new THREE.Matrix4()
                            .makeTranslation(x, y, z)
                            .makeRotationAxis(
                                rotateAxis,
                                positive * Math.PI / 2 * progress.value
                            )
                    ));
                cube.userData.x = vec.x;
                cube.userData.y = vec.y;
                cube.userData.z = vec.z;
            });
            
            cubes.forEach(cube => roundVector(cube.position));
            isRotating = false;
        }
    });

    
};
const renderAndRotateCube = () => {
    renderCube();
    randomCube(paramters.cube.randomness);
};

renderAndRotateCube();


/**
 * Debug
 */

const gui = new dat.GUI({
    width: 300
});
!window.location.hash.includes('debug') && gui.hide();

gui.addColor(paramters.background, 'color')
    .onChange(val => renderer.setClearColor(val));

gui.add(camera.position, 'x')
    .min(-10)
    .max(10)
    .step(0.1)
    .name('camera.x');

gui.add(camera.position, 'y')
    .min(-10)
    .max(10)
    .step(0.1)
    .name('camera.y');

gui.add(camera.position, 'z')
    .min(-10)
    .max(10)
    .step(0.1)
    .name('camera.z');

gui.add(paramters.cube, 'order')
    .min(2)
    .max(5)
    .step(1)
    .onFinishChange(() => {
        renderAndRotateCube();
    })
    .name('order');

gui.add(paramters.cube, 'randomness')
    .min(0)
    .max(100)
    .step(1)
    .onFinishChange(() => {
        renderAndRotateCube();
    })
    .name('randomness');

const stats = new Stats();
document.body.appendChild(stats.dom);

// scene.add(new THREE.AxesHelper(30));


/**
 * interaction
 */

const mouseMove = {
    x: 0,
    y: 0
};
let dragStart = null;
const parseMousePos = e => {
    return {
        x: e.clientX / sizes.width * 2 - 1,
        y: -(e.clientY / sizes.height * 2 - 1)
    };
};
canvas.addEventListener('mousemove', e => {
    const pos = parseMousePos(e);
    mouseMove.x = pos.x;
    mouseMove.y = pos.y;
});
canvas.addEventListener('pointerdown', e => {
    const pos = parseMousePos(e);
    dragStart = { x: pos.x, y: pos.y };
});
canvas.addEventListener('pointerup', e => {
    if (isRotating) { return }
    const pos = parseMousePos(e);
    const dragOffset = {
        x: pos.x - dragStart.x,
        y: pos.y - dragStart.y
    };
    const isMove = val => Math.abs(val) >= paramters.control.threshold
    if ((isMove(dragOffset.x) || isMove(dragOffset.y))) {
        if (dragStartObj) {
            rotateCube({ dragOffset });
        } else {
            rotateAll({ dragOffset });
        }
    }
    dragStart = null;
});


/**
 * Animation
 */


const tick = () => {
    stats.begin();
    
    dragStartObj = null;
    if (dragStart) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(dragStart, camera);
        const intersects = raycaster.intersectObjects(cubes);
        dragStartObj = intersects[0]?.object;
        dragStartFace = intersects[0]?.face;
    }

    renderer.render(scene, camera);
    
    stats.end();
    requestAnimationFrame(tick);
};
tick();
