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
        this.userScale = 1.0; // Add user scale preference
        
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
        
        // First, load the bottle model
        this.loadBottleModel().then(bottleModel => {
            if (bottleModel) {
                // Add bottle as the first orbital object
                bottleModel.userData = { 
                    initialAngle: 0,
                    radius: radius,
                    rotationSpeed: 0.2, // Constant speed
                    verticalCenter: 0, // Store the center point for animations
                    isBottle: true // Mark as bottle for special handling
                };
                
                this.orbitalObjects.push(bottleModel);
                this.scene.add(bottleModel);
                
                // Create remaining spheres (count - 1)
                for (let i = 0; i < count - 1; i++) {
                    const angle = ((i + 1) / count) * Math.PI * 2; // +1 to skip the bottle position
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
                
                console.log(`Created champagne bottle and ${count-1} orbital spheres centered at origin with radius ${radius}`);
            } else {
                // Fallback to all spheres if bottle loading fails
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
        });
    }
    
    loadBottleModel() {
        return new Promise((resolve, reject) => {
            console.log('Loading champagne bottle model...');
            
            // Create a group to contain the bottle - this makes rotation manipulation easier
            const bottleGroup = new THREE.Group();
            
            // Try to load the shaded bottle model
            const bottlePath = '/assets/models/bottle/Shaded/base_basic_shaded.glb';
            
            new GLTFLoader().load(
                bottlePath,
                (gltf) => {
                    console.log('Bottle model loaded successfully!');
                    const bottleModel = gltf.scene;
                    
                    // Reset rotation of the model itself
                    bottleModel.rotation.set(0, 0, 0);
                    
                    // Add model to group
                    bottleGroup.add(bottleModel);
                    
                    // Adjust scale of the group
                    bottleGroup.scale.set(0.7, 0.7, 0.7);
                    
                    // Fix the Y axis problem by applying the correct rotation sequence
                    // Y-up to Y-up transformation
                    bottleGroup.rotation.set(0, 0, 0); // Reset rotations
                    bottleGroup.rotateY(Math.PI); // 180 degrees around Y axis to make it face the right way
                    
                    // Position the group
                    const angle = 0; // Starting angle
                    const radius = 5; // Same radius as other objects
                    
                    bottleGroup.position.x = Math.cos(angle) * radius;
                    bottleGroup.position.z = Math.sin(angle) * radius;
                    bottleGroup.position.y = -0.5; // Adjusted for better vertical positioning
                    
                    // Set render order
                    bottleGroup.renderOrder = 3;
                    
                    // Mark the group with the same userData as we would a single object
                    bottleGroup.userData = { 
                        initialAngle: 0,
                        radius: radius,
                        rotationSpeed: 0.2,
                        verticalCenter: 0,
                        isBottle: true
                    };
                    
                    // Log details for debugging
                    console.log('Bottle group after transformations:');
                    console.log('- Group rotation:', bottleGroup.rotation);
                    console.log('- Group position:', bottleGroup.position);
                    console.log('- Group scale:', bottleGroup.scale);
                    
                    resolve(bottleGroup);
                },
                (xhr) => {
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    console.log(`Loading bottle model: ${percent}% completed`);
                },
                (error) => {
                    console.error('Error loading bottle model:', error);
                    resolve(null); // Resolve with null to fallback to spheres
                }
            );
        });
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
        console.log('Setting up light controls...');
        
        // Get all slider elements
        const mainLightSlider = document.getElementById('mainLight');
        const fillLightSlider = document.getElementById('fillLight');
        const ambientLightSlider = document.getElementById('ambientLight');
        const rimLightSlider = document.getElementById('rimLight');
        const bustSizeSlider = document.getElementById('bustSize');
        const bustVerticalSlider = document.getElementById('bustVertical');
        const bustHorizontalSlider = document.getElementById('bustHorizontal');
        const colorSaturationSlider = document.getElementById('colorSaturation');
        const materialRoughnessSlider = document.getElementById('materialRoughness');

        // Helper function to update value display
        const updateValue = (slider) => {
            if (!slider) return;
            const valueDisplay = slider.parentElement.querySelector('.value');
            if (valueDisplay) {
                valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
            }
        };

        // Helper function to update material properties
        const updateMaterialProperties = () => {
            if (!this.bustoModel) return;
            
            const saturation = parseFloat(colorSaturationSlider.value);
            const roughness = parseFloat(materialRoughnessSlider.value);
            
            this.bustoModel.traverse((child) => {
                if (child.isMesh && child.material) {
                    // Update material properties
                    child.material.roughness = roughness;
                    
                    // Update color saturation using HSL
                    const color = new THREE.Color();
                    color.copy(child.material.color);
                    const hsl = {};
                    color.getHSL(hsl);
                    color.setHSL(hsl.h, hsl.s * saturation, hsl.l);
                    child.material.color = color;
                    
                    // Ensure material updates
                    child.material.needsUpdate = true;
                }
            });
        };

        // Helper function to update bust transform
        const updateBustTransform = () => {
            if (!this.bustoModel) return;
            
            // Remove direct reading of bustSizeSlider here
            const vertical = parseFloat(bustVerticalSlider.value);
            const horizontal = parseFloat(bustHorizontalSlider.value);
            
            // Update position ONLY
            this.bustoModel.position.y = vertical;
            this.bustoModel.position.x = horizontal;
            
            // Remove direct scaling here
        };

        // Set up event listeners for all sliders
        [mainLightSlider, fillLightSlider, ambientLightSlider, rimLightSlider].forEach(slider => {
            if (!slider) return;
            slider.addEventListener('input', (e) => {
                updateValue(e.target);
                this.updateLights();
            });
        });

        // Set up event listeners for new controls
        [bustVerticalSlider, bustHorizontalSlider].forEach(slider => {
            if (!slider) return;
            slider.addEventListener('input', (e) => {
                updateValue(e.target);
                updateBustTransform(); // Position only
            });
        });

        // Specific listener for bust size
        if (bustSizeSlider) {
            bustSizeSlider.addEventListener('input', (e) => {
                updateValue(e.target);
                const sliderValue = parseFloat(e.target.value);
                this.userScale = sliderValue;
                console.log(`[Slider Input] Bust Size Slider: ${sliderValue}, Updated userScale: ${this.userScale}`);
                this.updateBustoSize(); // Update scale considering user input
            });
        }

        [colorSaturationSlider, materialRoughnessSlider].forEach(slider => {
            if (!slider) return;
            slider.addEventListener('input', (e) => {
                updateValue(e.target);
                updateMaterialProperties();
            });
        });

        // Initialize all value displays
        [mainLightSlider, fillLightSlider, ambientLightSlider, rimLightSlider,
         bustSizeSlider, bustVerticalSlider, bustHorizontalSlider,
         colorSaturationSlider, materialRoughnessSlider].forEach(updateValue);

        // Save button functionality
        const saveButton = document.getElementById('saveLightSettings');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                const settings = {
                    mainLight: mainLightSlider.value,
                    fillLight: fillLightSlider.value,
                    ambientLight: ambientLightSlider.value,
                    rimLight: rimLightSlider.value,
                    bustSize: bustSizeSlider.value,
                    bustVertical: bustVerticalSlider.value,
                    bustHorizontal: bustHorizontalSlider.value,
                    colorSaturation: colorSaturationSlider.value,
                    materialRoughness: materialRoughnessSlider.value
                };
                localStorage.setItem('sceneSettings', JSON.stringify(settings));
                console.log('Settings saved:', settings);
            });
        }

        // Load saved settings
        const savedSettings = localStorage.getItem('sceneSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Load user scale preference first
            if (settings.bustSize) {
                this.userScale = parseFloat(settings.bustSize);
            }
            
            Object.entries(settings).forEach(([key, value]) => {
                const slider = document.getElementById(key);
                if (slider) {
                    slider.value = value;
                    updateValue(slider);
                }
            });
            
            // Apply loaded settings
            this.updateLights();
            updateBustTransform(); // Apply loaded positions
            updateMaterialProperties();
            this.updateBustoSize(); // Apply combined scale last
        }
    }

    updateBustoSize() {
        // Adjust bust size based on viewport orientation
        if (!this.bustoModel) {
            // console.log('Cannot update bust: model not found'); // Reduced noise
            return;
        }
        
        const isLandscape = window.innerWidth > window.innerHeight;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        let responsiveScale;
        
        // Breakpoint for transition (adjust based on your needs)
        const mobileBreakpoint = 768;
        
        // Calculate responsive base scale
        if (isLandscape) {
            // Desktop/landscape mode
            responsiveScale = Math.min(viewportHeight * 0.56 / 30, viewportWidth * 0.4 / 30);
        } else {
            // Mobile/portrait mode - smoother transition
            const transitionProgress = Math.min(viewportWidth / mobileBreakpoint, 1);
            responsiveScale = (viewportWidth * 0.56 / 30) * transitionProgress;
        }

        // Combine responsive scale with user preference
        const finalScale = responsiveScale * this.userScale; 
        
        // Apply scale with smoothing
        const currentScale = this.bustoModel.scale.x;
        const smoothedScale = currentScale + (finalScale - currentScale) * 0.1;
        this.bustoModel.scale.set(smoothedScale, smoothedScale, smoothedScale);
        
        console.log(`[UpdateBustoSize] Responsive: ${responsiveScale.toFixed(3)}, User: ${this.userScale.toFixed(3)}, Final: ${finalScale.toFixed(3)}, Smoothed: ${smoothedScale.toFixed(3)}, Applied Scale: ${this.bustoModel.scale.x.toFixed(3)}`);

        // Calculate vertical position with smooth transition
        let verticalOffset;
        if (isLandscape) {
            // Desktop position
            verticalOffset = -6;
        } else {
            // Mobile position with smooth transition
            const baseOffset = -2;
            const heightRatio = viewportHeight / 1080;
            const transitionFactor = Math.min(viewportWidth / mobileBreakpoint, 1);
            verticalOffset = baseOffset * heightRatio * (1 + transitionFactor);
        }
        
        // Apply position with smoothing (Position is handled by updateBustTransform now)
        // const currentY = this.bustoModel.position.y;
        // const smoothedY = currentY + (verticalOffset - currentY) * 0.1;
        // this.bustoModel.position.set(1, smoothedY, 0);
        
        // Reset rotation
        this.bustoModel.rotation.x = 0;
        this.bustoModel.rotation.y = 0;
        this.bustoModel.rotation.z = 0;
        
        // console.log('Bust size updated:'); // Reduced noise
        // console.log('- Final Scale:', finalScale);
        // console.log('- Smoothed Scale:', this.bustoModel.scale);
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
                
                // Initial setup: Apply loaded positions first, then scale
                updateBustTransform(); // Use updateBustTransform to apply saved/default position
                this.updateBustoSize(); // Then apply combined scale
                
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
                console.log(`Loading model: ${percent}%`);
            },
            (error) => {
                console.error('Error loading bust:', error);
                if (loadingElement) {
                    loadingElement.textContent = 'Error loading model';
                }
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
            
            if (obj.userData.isBottle) {
                // Special animation for the bottle group
                // Gentle bobbing motion - slightly different frequency than spheres
                obj.position.y = verticalCenter - 0.5 + Math.sin(time * 0.3) * 0.3;
                
                // For bottles, we rotate the group on Y axis (which is now the vertical axis of the bottle)
                obj.rotateY(0.001); // Very subtle spin
            } else {
                // Regular sphere animation
                // Small vertical fluctuation (centered around y=0)
                obj.position.y = verticalCenter + Math.sin(time * 0.5 + obj.userData.initialAngle) * 0.5;
                
                // Rotation of spheres on their own axis
                obj.rotation.y += 0.01;
                obj.rotation.x += 0.005;
            }
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const now = performance.now();
        const deltaTime = (now - this.lastTime) / 1000; // Convert ms to seconds
        this.lastTime = now;

        // Update OrbitControls
        this.controls.update();

        // Update orbital spheres
        if (this.orbitalObjects.length > 0) {
            this.updateOrbitalObjects();
        }
        
        // Update head animation
        if (this.bustoLoaded && this.headAnimation.active) {
            this.updateHeadAnimation(deltaTime);
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    updateHeadAnimation(deltaTime) {
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
        console.log('Resizing scene...');
        
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Update bust size and position on resize
        this.updateBustoSize();
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

    updateLights() {
        const mainLightSlider = document.getElementById('mainLight');
        const fillLightSlider = document.getElementById('fillLight');
        const ambientLightSlider = document.getElementById('ambientLight');
        const rimLightSlider = document.getElementById('rimLight');

        if (this.lights.main && mainLightSlider) {
            this.lights.main.intensity = parseFloat(mainLightSlider.value);
        }
        if (this.lights.fill && fillLightSlider) {
            this.lights.fill.intensity = parseFloat(fillLightSlider.value);
        }
        if (this.lights.ambient && ambientLightSlider) {
            this.lights.ambient.intensity = parseFloat(ambientLightSlider.value);
        }
        if (this.lights.rim && rimLightSlider) {
            this.lights.rim.intensity = parseFloat(rimLightSlider.value);
        }
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application...');
    new Scene();
}); 