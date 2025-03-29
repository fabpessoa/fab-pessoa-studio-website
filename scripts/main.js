import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Re-enable post-processing imports
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { HueSaturationShader } from 'three/addons/shaders/HueSaturationShader.js';

class Scene {
    constructor() {
        console.log('Initializing scene...');
        
        // Animation timing configuration
        this.lastTime = performance.now();
        this.clock = new THREE.Clock();
        
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
        this.bustoGroup = null; // Group to hold the bust for centering
        this.bustoModel = null; // Reference to the actual loaded model
        this.composer = null; // Re-enable
        this.hueSaturationPass = null; // Re-enable
        
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
        this.setupPostProcessing(); // Re-enable
        this.loadModels();
        this.createOrbitalSpheres();
        this.setupEventListeners();
        
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
        // Enable tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Use ACES Filmic
        this.renderer.toneMappingExposure = 1.0; // Default exposure
        
        // Set clear color with 0 alpha (transparent)
        this.renderer.setClearColor(0x000000, 0);
        console.log('Renderer clear color set to transparent (alpha 0)');
        
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

    // Re-enable setupPostProcessing
    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        // 1. Render the original scene
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // 2. Add Hue/Saturation pass
        this.hueSaturationPass = new ShaderPass(HueSaturationShader);
        // Initialize saturation uniform (0 = no change)
        this.hueSaturationPass.uniforms['saturation'].value = 0.0;
        this.composer.addPass(this.hueSaturationPass);

        console.log('Post-processing composer set up.');
    }

    setupLightControls() {
        console.log('Setting up light controls...');
        
        const mainLightSlider = document.getElementById('mainLight');
        const fillLightSlider = document.getElementById('fillLight');
        const ambientLightSlider = document.getElementById('ambientLight');
        const rimLightSlider = document.getElementById('rimLight');
        const bustSizeSlider = document.getElementById('bustSize');
        const bustVerticalSlider = document.getElementById('bustVertical');
        const bustHorizontalSlider = document.getElementById('bustHorizontal');
        const colorSaturationSlider = document.getElementById('colorSaturation');
        const materialRoughnessSlider = document.getElementById('materialRoughness');
        const exposureSlider = document.getElementById('exposure');
        const saveButton = document.getElementById('saveLightSettings');

        // Check if elements were found
        if (!mainLightSlider) console.error('Main Light Slider NOT FOUND');
        if (!fillLightSlider) console.error('Fill Light Slider NOT FOUND');
        if (!ambientLightSlider) console.error('Ambient Light Slider NOT FOUND');
        if (!rimLightSlider) console.error('Rim Light Slider NOT FOUND');
        if (!bustSizeSlider) console.error('Bust Size Slider NOT FOUND');
        if (!bustVerticalSlider) console.error('Bust Vertical Slider NOT FOUND');
        if (!bustHorizontalSlider) console.error('Bust Horizontal Slider NOT FOUND');
        if (!colorSaturationSlider) console.error('Color Saturation Slider NOT FOUND');
        if (!materialRoughnessSlider) console.error('Material Roughness Slider NOT FOUND');
        if (!exposureSlider) console.error('Exposure Slider NOT FOUND');
        if (!saveButton) console.error('Save Button NOT FOUND');

        // Helper function to update the displayed value next to the slider
        const updateValue = (slider) => {
            const valueSpan = slider.nextElementSibling;
            if (valueSpan && valueSpan.classList.contains('value')) {
                valueSpan.textContent = parseFloat(slider.value).toFixed(slider.step.includes('.') ? slider.step.split('.')[1].length : 0);
            }
        };

        // Update initial values on load
        [mainLightSlider, fillLightSlider, ambientLightSlider, rimLightSlider, bustSizeSlider, bustVerticalSlider, bustHorizontalSlider, colorSaturationSlider, materialRoughnessSlider, exposureSlider].forEach(slider => {
            if (slider) updateValue(slider);
        });

        // Generic listener for light intensity sliders
        [mainLightSlider, fillLightSlider, ambientLightSlider, rimLightSlider].forEach(slider => {
            if (!slider) return;
            slider.addEventListener('input', () => {
                updateValue(slider);
                this.updateLights(); // Update lights based on sliders
            });
        });

        // Listener for Exposure Slider
        if (exposureSlider) {
            exposureSlider.addEventListener('input', () => {
                updateValue(exposureSlider);
                const exposureValue = parseFloat(exposureSlider.value);
                this.renderer.toneMappingExposure = exposureValue;
                console.log(`[Renderer] Set toneMappingExposure: ${exposureValue}`);
            });
        }

        // Listener for bust position/scale sliders
        [bustVerticalSlider, bustHorizontalSlider].forEach(slider => {
            if (!slider) return;
            slider.addEventListener('input', (e) => {
                updateValue(e.target);
                this.updateBustTransform(); // Call as class method
            });
        });

        // Specific listener for bust size
        if (bustSizeSlider) {
            bustSizeSlider.addEventListener('input', (e) => {
                try {
                    console.log('[Slider Input] Event triggered for bustSize'); // Log entry
                    const slider = e.target;
                    updateValue(slider); // Call to update the UI number
                    const sliderValue = parseFloat(slider.value);
                    this.userScale = sliderValue;
                    console.log(`[Slider Input] Bust Size Slider: ${sliderValue}, Updated userScale: ${this.userScale}`);
                    this.updateBustoSize(); // Update scale considering user input
                } catch (error) {
                    console.error('[Slider Input Error] Error in bustSizeSlider listener:', error);
                }
            });
        }

        // Corrected Listener for Saturation and Roughness
        [colorSaturationSlider, materialRoughnessSlider].forEach(slider => {
            if (!slider) return;
            slider.addEventListener('input', (e) => {
                console.log(`[Material Listener] Input event fired for ${e.target.id}`); // Keep this log
                updateValue(e.target); // Update the UI number

                // Update specific effect based on slider ID
                if (e.target.id === 'colorSaturation') {
                    // Re-enable uniform update
                    if (this.hueSaturationPass) {
                        const saturationValue = parseFloat(e.target.value);
                        this.hueSaturationPass.uniforms['saturation'].value = saturationValue;
                        console.log(`[PostFX] Set saturation uniform: ${saturationValue}`); // Add log
                    }
                   // console.log('Saturation slider moved (PostFX disabled)'); // Remove temp log
                } else if (e.target.id === 'materialRoughness') {
                    // Roughness still needs to update the actual material
                    this.updateMaterialProperties();
                }

            });
        });

        // Save button listener
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                console.log('Save Settings button clicked'); // Log click
                try {
                    const settings = {
                        mainLight: mainLightSlider ? mainLightSlider.value : '1',
                        fillLight: fillLightSlider ? fillLightSlider.value : '0.5',
                        ambientLight: ambientLightSlider ? ambientLightSlider.value : '0.2',
                        rimLight: rimLightSlider ? rimLightSlider.value : '0.5',
                        exposure: exposureSlider ? exposureSlider.value : '1.0', // Save exposure
                        bustSize: bustSizeSlider ? bustSizeSlider.value : '1',
                        bustVertical: bustVerticalSlider ? bustVerticalSlider.value : '0',
                        bustHorizontal: bustHorizontalSlider ? bustHorizontalSlider.value : '0',
                        colorSaturation: colorSaturationSlider ? colorSaturationSlider.value : '0',
                        materialRoughness: materialRoughnessSlider ? materialRoughnessSlider.value : '0.5'
                    };
                    localStorage.setItem('lightSettings', JSON.stringify(settings));
                    console.log('Settings saved:', settings);
                } catch (error) {
                    console.error('Error saving settings:', error);
                }
            });
        }

        // Load settings on startup
        this.loadSettings();
    }

    loadSettings() {
        console.log('Loading settings...');
        const savedSettings = localStorage.getItem('lightSettings');
        if (!savedSettings) {
            console.log('No saved settings found.');
            return;
        }

        try {
            const settings = JSON.parse(savedSettings);
            console.log('Loaded settings:', settings);

            // Map settings to sliders
            const sliderMap = {
                mainLight: 'mainLight',
                fillLight: 'fillLight',
                ambientLight: 'ambientLight',
                rimLight: 'rimLight',
                exposure: 'exposure', // Load exposure
                bustSize: 'bustSize',
                bustVertical: 'bustVertical',
                bustHorizontal: 'bustHorizontal',
                colorSaturation: 'colorSaturation',
                materialRoughness: 'materialRoughness'
            };

            // Helper function to update the displayed value next to the slider
            const updateValue = (slider) => {
                const valueSpan = slider.nextElementSibling;
                if (valueSpan && valueSpan.classList.contains('value')) {
                     valueSpan.textContent = parseFloat(slider.value).toFixed(slider.step.includes('.') ? slider.step.split('.')[1].length : 0);
                }
            };

            Object.keys(settings).forEach(key => {
                const sliderId = sliderMap[key];
                if (!sliderId) return; // Skip if no corresponding slider ID

                const slider = document.getElementById(sliderId);
                const value = settings[key];

                if (slider && value !== undefined) {
                    slider.value = value;
                    updateValue(slider); // Update the displayed value
                }
            });

            // Apply loaded settings
            this.updateLights();
            this.updateBustTransform();
            this.updateMaterialProperties(); // Still needed for roughness on load
            
            // Apply loaded exposure
            if (settings.exposure) {
                this.renderer.toneMappingExposure = parseFloat(settings.exposure);
                console.log(`[LoadSettings] Applied loaded exposure: ${this.renderer.toneMappingExposure}`);
            }
            
            // Re-enable applying loaded saturation
            if (settings.colorSaturation && this.hueSaturationPass) {
                const loadedSaturation = parseFloat(settings.colorSaturation);
                this.hueSaturationPass.uniforms['saturation'].value = loadedSaturation;
                console.log(`[LoadSettings] Applied loaded saturation to postFX: ${loadedSaturation}`);
            }
            
            this.updateBustoSize();
        } catch (error) {
            console.error('Error loading or applying settings:', error);
        }
    }

    updateBustTransform() {
        // Target the GROUP
        if (!this.bustoGroup) return;
        
        // Need to get sliders again OR pass them in OR store them on 'this'
        // Let's re-get them for simplicity here, though storing might be better
        const bustVerticalSlider = document.getElementById('bustVertical');
        const bustHorizontalSlider = document.getElementById('bustHorizontal');

        if (!bustVerticalSlider || !bustHorizontalSlider) return; // Guard clause

        const vertical = parseFloat(bustVerticalSlider.value);
        const horizontal = parseFloat(bustHorizontalSlider.value);
        
        // Update GROUP position ONLY
        this.bustoGroup.position.y = vertical;
        this.bustoGroup.position.x = horizontal;
        this.bustoGroup.position.z = 0; 
    }

    updateBustoSize() {
        // Target the GROUP
        if (!this.bustoGroup) return;
        
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
        
        // Apply scale to the GROUP
        const currentScale = this.bustoGroup.scale.x;
        const smoothedScale = currentScale + (finalScale - currentScale) * 0.1;
        this.bustoGroup.scale.set(smoothedScale, smoothedScale, smoothedScale);
        
        // Update the log to show group scale
        console.log(`[UpdateBustoSize] Responsive: ${responsiveScale.toFixed(3)}, User: ${this.userScale.toFixed(3)}, Final: ${finalScale.toFixed(3)}, Smoothed: ${smoothedScale.toFixed(3)}, Applied Scale: ${this.bustoGroup.scale.x.toFixed(3)}`);

        // Reset GROUP rotation (if needed, maybe not?)
        // this.bustoGroup.rotation.set(0, 0, 0);
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
        
        const loader = new GLTFLoader();
        loader.load(
            'assets/models/busto2.glb',
            (gltf) => {
                console.log('SUCCESS! Bust loaded successfully');
                const model = gltf.scene; // The raw loaded model scene
                this.bustoModel = model; // Keep reference if needed elsewhere

                // --- Parent Group Setup ---
                this.bustoGroup = new THREE.Group();

                // Estimate center offset (adjust this value based on the model)
                // const offsetY = -6; // TEMPORARILY REMOVED OFFSET
                model.position.y = 0; // Position model at group origin
                // Center horizontally and depth-wise within the group
                model.position.x = 0; 
                model.position.z = 0;

                // Configure materials (on the actual model)
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.renderOrder = 2; 
                        if (child.material) {
                            child.material.metalness = 0.3;
                            child.material.roughness = 0.7;
                            // Initialize userData for material manipulation
                            child.material.userData = {}; 
                        }
                    }
                });
                
                // Add model to the group
                this.bustoGroup.add(model);

                // Add the GROUP to the scene
                this.scene.add(this.bustoGroup);
                // --------------------------
                console.log('Group added to scene');
                console.log('Group initial position (before updates):', this.bustoGroup.position.clone());
                console.log('Group initial scale (before updates):', this.bustoGroup.scale.clone());
                console.log('Model position inside group:', model.position.clone());
                console.log('Camera position:', this.camera.position.clone());

                // Initial setup: Apply transforms TO THE GROUP
                this.updateBustTransform(); // Apply slider positions
                this.updateBustoSize(); // RESTORED: Apply initial size update

                this.bustoLoaded = true;
                this.updateBustoSize(); // ADDED: Ensure size updates AFTER bustLoaded and potential loadSettings

                if (loadingElement) loadingElement.style.display = 'none';
                
                console.log('Bust Group initialized');
                console.log('Group position (after transform update):', this.bustoGroup.position.clone());
                console.log('Group scale (should be 1,1,1 initially):', this.bustoGroup.scale.clone());
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

    updateOrbitalObjects(deltaTime) {
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
        requestAnimationFrame(this.animate.bind(this));

        const deltaTime = this.clock.getDelta();

        // Update orbital controls
        if (this.controls) {
            this.controls.update();
        }

        // Update head animation
        this.updateHeadAnimation(deltaTime);
        
        // Update orbital spheres animation
        if (this.orbitalObjects.length > 0) {
             this.updateOrbitalObjects(deltaTime);
        }

        // Re-enable composer render
        if (this.composer) {
            this.composer.render(deltaTime);
        } else {
            // Fallback if composer failed
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateHeadAnimation(deltaTime) {
        // Target the GROUP for rotation
        if (!this.bustoGroup || !this.headAnimation || !this.headAnimation.active) return;
        
        // Calculate rotation using sine for smooth and continuous movement
        const time = this.headAnimation.time + deltaTime * this.headAnimation.speed;
        const rotation = Math.sin(time) * this.headAnimation.amplitude;
        
        // Apply rotation to the GROUP
        this.bustoGroup.rotation.y = rotation;
        
        // Update animation time
        this.headAnimation.time = time;
    }

    resize() {
        console.log('Resizing scene...');
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        // Re-enable composer resize
        if (this.composer) { // Resize composer as well
            this.composer.setSize(width, height);
        }
        
        // Update GROUP size and position on resize
        if (this.bustoLoaded) {
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

    updateMaterialProperties() {
        // ONLY responsible for roughness now
        if (!this.bustoGroup || !this.bustoGroup.children.length > 0) return; 

        // Get only the roughness slider
        const materialRoughnessSlider = document.getElementById('materialRoughness');
        if (!materialRoughnessSlider) return; // Exit if slider not found

        const roughness = parseFloat(materialRoughnessSlider.value);
        console.log(`[MaterialProps] Updating roughness to: ${roughness}`); // Log roughness update

        // Target the actual model INSIDE the group
        const actualBustModel = this.bustoGroup.children[0]; 
        actualBustModel.traverse((child) => { 
            if (child.isMesh && child.material) {
                // Update material property
                child.material.roughness = roughness;
                child.material.needsUpdate = true; // Ensure material updates

                // REMOVED Saturation logic from here
            }
        });
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting application...');
    const myScene = new Scene();
    myScene.animate();
    // Ensure controls are set up after the DOM is fully loaded
    // Moved from constructor
    myScene.setupLightControls();
}); 