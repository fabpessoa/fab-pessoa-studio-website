import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class Scene {
    constructor() {
        console.log('Initializing scene...');
        
        // Animation timing configuration
        this.lastTime = performance.now();
        
        // Initialize variables
        this.container = document.getElementById('scene-container');
        this.orbitalObjects = [];
        this.bustoLoaded = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.targetRotation = 0;
        this.currentRotation = 0;
        this.lights = {};  // Store light references
        this.hoveredSphere = null;
        this.sphereStates = new Map(); // Store state of each sphere
        
        // Variables for head animation
        this.headAnimation = {
            active: true,
            speed: 0.5, // Speed of rotation animation
            amplitude: 0.25, // Maximum rotation angle (in radians)
            time: 0 // Track animation time
        };
        
        // Initial setup
        this.initScene();
        this.setupLights();
        this.setupControls();
        this.loadModels();
        this.createOrbitalSpheres();
        this.setupEventListeners();
        this.setupLightControls();
        
        // Start rendering loop
        this.animate();
        
        console.log('Scene initialized');
    }

    initScene() {
        console.log('Initializing scene...');
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Set transparent background
        this.scene.background = null;
        console.log('Scene background set to transparent (null)');
        
        // Create camera with correct aspect ratio
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(
            45,
            aspect,
            0.1,
            1000
        );
        
        // Position camera to standard front view
        this.camera.position.set(0, 0, 15);
        this.camera.lookAt(0, 0, 0);
        
        console.log('Camera positioned at standard view:', this.camera.position);
        
        // Create renderer with alpha for transparency
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true, // Enable alpha for transparency
            preserveDrawingBuffer: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Set clear color with 0 alpha (transparent)
        this.renderer.setClearColor(0x000000, 0);
        console.log('Renderer clear color set to transparent (alpha 0)');
        
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Ensure proper sorting for transparency
        this.renderer.sortObjects = true;
        
        // Add renderer to DOM
        if (this.container) {
            this.container.appendChild(this.renderer.domElement);
            // Ensure canvas has transparent background
            this.renderer.domElement.style.backgroundColor = 'transparent';
            console.log('Canvas background style set to transparent');
            
            // Force the container to have a transparent background
            this.container.style.backgroundColor = 'transparent';
            
            // Ensure container is properly positioned for centering
            this.container.style.position = 'fixed';
            this.container.style.top = '0';
            this.container.style.left = '0';
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.display = 'flex';
            this.container.style.justifyContent = 'center';
            this.container.style.alignItems = 'center';
            this.container.style.overflow = 'hidden';
        } else {
            console.warn('Container not found, adding to body');
            document.body.appendChild(this.renderer.domElement);
        }
    }

    setupControls() {
        console.log('Setting up controls...');
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 30;
        this.controls.minDistance = 5;
        
        // Set target to scene center
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Resize canvas when window is resized
        window.addEventListener('resize', () => {
            this.resize();
        });

        // Toggle lighting control panel
        // Already configured directly in HTML
    }

    createOrbitalSpheres(count = 6) {
        console.log('Creating orbital spheres with brushed aluminum texture...');
        const radius = 5;
        const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        
        // Light brushed metal material
        const brushedMetalMaterial = new THREE.MeshStandardMaterial({
            color: 0xDDDDDD, // Light silver color for aluminum
            metalness: 0.85,
            roughness: 0.2,
            envMapIntensity: 1.5
        });
        
        // Create reflection environment
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        
        // Configure scene for reflections
        this.scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;
        
        // Clear any existing orbital objects
        this.orbitalObjects.forEach(obj => {
            if (obj && this.scene) {
                this.scene.remove(obj);
            }
        });
        this.orbitalObjects = [];
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const sphere = new THREE.Mesh(sphereGeometry, brushedMetalMaterial.clone());
            
            // Position spheres in a circle around the center
            sphere.position.x = Math.cos(angle) * radius;
            sphere.position.z = Math.sin(angle) * radius;
            sphere.position.y = 0; // Centered at same height as bust
            
            sphere.renderOrder = 3; // Higher than bust to ensure proper rendering
            sphere.userData = { 
                initialAngle: angle,
                radius: radius,
                rotationSpeed: 0.2, // Constant speed
                verticalCenter: 0 // Store the center point for animations
            };
            
            this.orbitalObjects.push(sphere);
            this.scene.add(sphere);
        }
        
        console.log(`Created ${count} orbital spheres centered at origin with radius ${radius}`);
    }

    setupLights() {
        console.log('Setting up lights...');
        
        // Carregar configurações salvas ou usar valores padrão
        const savedSettings = localStorage.getItem('lightSettings');
        const defaultSettings = {
            mainLight: 3,
            fillLight: 0.2,
            ambientLight: 0.15,
            rimLight: 0.5
        };
        
        const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
        
        // Ambient light for base illumination
        this.lights.ambient = new THREE.AmbientLight(0xffffff, settings.ambientLight);
        this.scene.add(this.lights.ambient);

        // Strong main light from the right
        this.lights.main = new THREE.SpotLight(0xffffff, settings.mainLight);
        this.lights.main.position.set(5, 2, 2);
        this.lights.main.angle = Math.PI / 6;
        this.lights.main.penumbra = 0.2;
        this.lights.main.decay = 1.5;
        this.lights.main.distance = 30;
        this.lights.main.castShadow = true;
        this.lights.main.shadow.bias = -0.001;
        this.lights.main.shadow.mapSize.width = 2048;
        this.lights.main.shadow.mapSize.height = 2048;
        this.scene.add(this.lights.main);

        // Soft fill light from the left
        this.lights.fill = new THREE.DirectionalLight(0xffffff, settings.fillLight);
        this.lights.fill.position.set(-4, 0, 2);
        this.scene.add(this.lights.fill);

        // Subtle rim light
        this.lights.rim = new THREE.SpotLight(0xffffff, settings.rimLight);
        this.lights.rim.position.set(-2, 4, -3);
        this.lights.rim.angle = Math.PI / 5;
        this.lights.rim.penumbra = 0.8;
        this.scene.add(this.lights.rim);

        // Subtle back light to separate from background
        this.lights.back = new THREE.DirectionalLight(0xffffff, 0.1);
        this.lights.back.position.set(0, 0, -5);
        this.scene.add(this.lights.back);
    }

    setupLightControls() {
        // Set up light controls
        const updateValue = (element, value) => {
            const valueSpan = element.parentElement.querySelector('.value');
            if (valueSpan) {
                valueSpan.textContent = parseFloat(value).toFixed(2);
            }
        };

        // Load saved settings
        const savedSettings = localStorage.getItem('lightSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Update sliders and lights
            const elements = {
                mainLight: { slider: document.getElementById('mainLight'), light: this.lights.main },
                fillLight: { slider: document.getElementById('fillLight'), light: this.lights.fill },
                ambientLight: { slider: document.getElementById('ambientLight'), light: this.lights.ambient },
                rimLight: { slider: document.getElementById('rimLight'), light: this.lights.rim }
            };

            Object.entries(settings).forEach(([key, value]) => {
                const element = elements[key];
                if (element && element.slider && element.light) {
                    element.slider.value = value;
                    element.light.intensity = value;
                    updateValue(element.slider, value);
                }
            });
        }

        // Main Light
        const mainLightSlider = document.getElementById('mainLight');
        if (mainLightSlider) {
            mainLightSlider.addEventListener('input', (e) => {
                this.lights.main.intensity = parseFloat(e.target.value);
                updateValue(mainLightSlider, e.target.value);
            });
        }

        // Fill Light
        const fillLightSlider = document.getElementById('fillLight');
        if (fillLightSlider) {
            fillLightSlider.addEventListener('input', (e) => {
                this.lights.fill.intensity = parseFloat(e.target.value);
                updateValue(fillLightSlider, e.target.value);
            });
        }

        // Ambient Light
        const ambientLightSlider = document.getElementById('ambientLight');
        if (ambientLightSlider) {
            ambientLightSlider.addEventListener('input', (e) => {
                this.lights.ambient.intensity = parseFloat(e.target.value);
                updateValue(ambientLightSlider, e.target.value);
            });
        }

        // Rim Light
        const rimLightSlider = document.getElementById('rimLight');
        if (rimLightSlider) {
            rimLightSlider.addEventListener('input', (e) => {
                this.lights.rim.intensity = parseFloat(e.target.value);
                updateValue(rimLightSlider, e.target.value);
            });
        }

        // Save Button
        const saveButton = document.getElementById('saveLightSettings');
        if (saveButton) {
            saveButton.addEventListener('click', () => this.saveLightSettings());
        }
    }

    saveLightSettings() {
        const settings = {
            mainLight: this.lights.main.intensity,
            fillLight: this.lights.fill.intensity,
            ambientLight: this.lights.ambient.intensity,
            rimLight: this.lights.rim.intensity
        };

        localStorage.setItem('lightSettings', JSON.stringify(settings));
        
        // Visual feedback
        const saveButton = document.getElementById('saveLightSettings');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Settings Saved!';
        saveButton.style.background = '#45a049';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.background = '#4CAF50';
        }, 2000);
    }

    updateBustoSize() {
        // Adjust bust size based on viewport orientation
        if (!this.bustoModel) {
            console.log('Cannot update bust: model not found');
            return;
        }
        
        const isLandscape = window.innerWidth > window.innerHeight;
        let scale;
        
        // Calculate appropriate scale based on viewport
        if (isLandscape) {
            scale = window.innerHeight * 0.6 / 10; // Scaled for visibility
        } else {
            scale = window.innerWidth * 0.6 / 10; // Scaled for visibility on mobile
        }
        
        // Apply scale uniformly
        this.bustoModel.scale.set(scale, scale, scale);
        
        // Position bust LOWER in the scene to account for model's internal coordinate system
        this.bustoModel.position.set(0, -4, 0); // Move down significantly
        
        // Reset rotation
        this.bustoModel.rotation.x = 0;
        this.bustoModel.rotation.y = 0;
        this.bustoModel.rotation.z = 0;
        
        console.log('Bust size and position updated:');
        console.log('- Scale:', this.bustoModel.scale);
        console.log('- Position:', this.bustoModel.position);
    }

    loadModels() {
        console.log('Loading models...');
        this.loadBusto();
    }
    
    loadBusto() {
        console.log('Loading bust model...');
        this.bustoLoaded = false;
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.style.display = 'block';
        
        console.log('Trying to load bust from: /assets/models/busto.glb');
        
        const loader = new GLTFLoader();
        loader.load(
            'assets/models/busto.glb', // Fixed path without leading slash
            (gltf) => {
                console.log('SUCCESS! Bust loaded successfully');
                this.bustoModel = gltf.scene;
                
                // Configure materials
                this.bustoModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.renderOrder = 2; // Ensure bust renders on top of the title
                        if (child.material) {
                            child.material.metalness = 0.3;
                            child.material.roughness = 0.7;
                        }
                        console.log('Mesh found in bust:', child.name);
                    }
                });
                
                // Add to scene
                this.scene.add(this.bustoModel);
                
                // Configure scale and position using responsive sizing
                this.updateBustoSize();
                
                // Mark as loaded
                this.bustoLoaded = true;
                
                // Hide loader
                if (loadingElement) loadingElement.style.display = 'none';
                
                // Log the position and scale for debugging
                console.log('Bust successfully added to scene');
                console.log('Bust position:', this.bustoModel.position);
                console.log('Bust scale:', this.bustoModel.scale);
                console.log('Camera position:', this.camera.position);
            },
            (xhr) => {
                const percent = (xhr.loaded / xhr.total * 100).toFixed(2);
                if (loadingElement) loadingElement.textContent = `Loading... ${percent}%`;
                console.log(`Progress: ${percent}%`);
            },
            (error) => {
                console.error('Error loading model:', error);
                if (loadingElement) loadingElement.textContent = 'Error loading model';
                
                console.log('------------------------------');
                console.log('DEBUG: LOADING FAILURE');
                console.log('Possible causes:');
                console.log('1. CORS preventing file access');
                console.log('2. Server configuration issue');
                console.log('3. File is corrupted');
                console.log('4. Path is incorrect, trying relative path');
                console.log('------------------------------');
                
                // Try alternate path as fallback
                this.tryAlternateLoadPath();
            }
        );
    }
    
    tryAlternateLoadPath() {
        console.log('Trying alternate path for bust model...');
        
        const loadingElement = document.getElementById('loading');
        
        const loader = new GLTFLoader();
        loader.load(
            'assets/models/busto.glb', // Try relative path without leading slash
            (gltf) => {
                console.log('SUCCESS with alternate path! Bust loaded successfully');
                this.bustoModel = gltf.scene;
                
                // Configure materials
                this.bustoModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.renderOrder = 2;
                        if (child.material) {
                            child.material.metalness = 0.3;
                            child.material.roughness = 0.7;
                        }
                    }
                });
                
                // Add to scene
                this.scene.add(this.bustoModel);
                
                // Configure scale and position
                this.updateBustoSize();
                
                // Mark as loaded
                this.bustoLoaded = true;
                
                // Hide loader
                if (loadingElement) loadingElement.style.display = 'none';
                
                console.log('Bust successfully added to scene with alternate path');
            },
            (xhr) => {
                const percent = (xhr.loaded / xhr.total * 100).toFixed(2);
                if (loadingElement) loadingElement.textContent = `Loading again... ${percent}%`;
            },
            (error) => {
                console.error('Error loading model with alternate path:', error);
                if (loadingElement) loadingElement.textContent = 'Failed to load model';
            }
        );
    }

    updateOrbitalObjects() {
        if (!this.orbitalObjects || this.orbitalObjects.length === 0) return;
        
        const time = performance.now() * 0.001; // Time in seconds
        
        this.orbitalObjects.forEach(obj => {
            if (!obj.userData) return;
            
            const angle = obj.userData.initialAngle + time * obj.userData.rotationSpeed;
            const radius = obj.userData.radius;
            const verticalCenter = obj.userData.verticalCenter || 0;
            
            // Position in a perfect circle around the center
            obj.position.x = Math.cos(angle) * radius;
            obj.position.z = Math.sin(angle) * radius;
            
            // Small vertical fluctuation (centered around y=0)
            obj.position.y = verticalCenter + Math.sin(time * 0.5 + obj.userData.initialAngle) * 0.5;
            
            // Rotation of spheres on their own axis
            obj.rotation.y += 0.01;
            obj.rotation.x += 0.005;
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Debug once at the beginning
        if (!this.debugRan) {
            console.log('DEBUG: Renderer settings', {
                alpha: this.renderer.alpha,
                clearColor: this.renderer && typeof this.renderer.getClearColor === 'function' 
                    ? this.renderer.getClearColor(new THREE.Color()) : 'Not available',
                clearAlpha: this.renderer && typeof this.renderer.getClearAlpha === 'function'
                    ? this.renderer.getClearAlpha() : 'Not available',
                sceneBackground: this.scene.background,
                domElementStyle: {
                    backgroundColor: this.renderer && this.renderer.domElement 
                        ? this.renderer.domElement.style.backgroundColor : 'Not available'
                }
            });
            
            // Add a position debug message
            console.log('DEBUG: Scene positions', {
                camera: this.camera ? this.camera.position.toArray() : 'Not available',
                cameraTarget: this.controls ? this.controls.target.toArray() : 'Not available',
                bust: this.bustoModel ? this.bustoModel.position.toArray() : 'Not available',
                spheres: this.orbitalObjects && this.orbitalObjects.length > 0 
                    ? this.orbitalObjects[0].position.toArray() : 'Not available'
            });
            this.debugRan = true;
        }
        
        // Only update orbital objects if they exist
        if (this.orbitalObjects && this.orbitalObjects.length > 0) {
            this.updateOrbitalObjects();
        }
        
        // Update bust rotation if needed
        if (this.bustoLoaded && this.bustoModel) {
            this.updateBustoRotation(deltaTime);
        }
        
        // Update controls if they exist
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    updateBustoRotation(deltaTime) {
        // Check if bust has active animation
        if (!this.headAnimation || !this.headAnimation.active) return;
        
        // Calculate rotation using sine for smooth and continuous movement
        const time = this.headAnimation.time + deltaTime * this.headAnimation.speed;
        const rotation = Math.sin(time) * this.headAnimation.amplitude;
        
        // Apply rotation
        this.bustoModel.rotation.y = rotation;
        
        // Update animation time
        this.headAnimation.time = time;
    }
    
    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        if (this.bustoLoaded && this.bustoModel) {
            this.updateBustoSize();
        }
    }

    loadLightSettings() {
        const savedSettings = localStorage.getItem('lightSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return {
            mainLight: 3,
            fillLight: 0.2,
            ambientLight: 0.15,
            rimLight: 0.5
        };
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application...');
    new Scene();
}); 