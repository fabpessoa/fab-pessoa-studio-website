import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class Scene {
    constructor() {
        console.log('Iniciando cena...');
        this.container = document.getElementById('scene-container');
        this.scene = new THREE.Scene();
        this.camera = this.setupCamera();
        this.renderer = this.setupRenderer();
        this.controls = this.setupControls();
        this.orbitalObjects = [];
        this.bustoLoaded = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.targetRotation = 0;
        this.currentRotation = 0;
        this.lights = {};  // Armazenar referências às luzes
        this.hoveredSphere = null;
        this.sphereStates = new Map(); // Armazenar estado de cada esfera
        
        // Variáveis para a animação da cabeça
        this.headRotation = {
            current: 0,
            target: 0.05, // 3 graus em radianos
            speed: 0.3,   // Velocidade da animação
            direction: 1   // Direção da animação
        };
        
        this.init();
        this.animate();
        this.setupEventListeners();
        this.setupLightControls();
    }

    setupCamera() {
        console.log('Configurando câmera...');
        const camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 15;
        return camera;
    }

    setupRenderer() {
        console.log('Configurando renderer...');
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 1);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.shadowMap.enabled = true;
        this.container.appendChild(renderer.domElement);
        return renderer;
    }

    setupControls() {
        console.log('Configurando controles...');
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 30;
        controls.minDistance = 5;
        return controls;
    }

    setupEventListeners() {
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Atualizar raycaster
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.orbitalObjects);
            
            // Resetar estado de hover para todas as esferas
            this.orbitalObjects.forEach(sphere => {
                const state = this.sphereStates.get(sphere);
                if (!state) {
                    this.sphereStates.set(sphere, {
                        isHovered: false,
                        targetSpeed: 1,
                        currentSpeed: 1
                    });
                } else {
                    state.isHovered = false;
                    state.targetSpeed = 1;
                }
            });
            
            // Atualizar estado de hover
            if (intersects.length > 0) {
                const hoveredSphere = intersects[0].object;
                const state = this.sphereStates.get(hoveredSphere);
                if (state) {
                    state.isHovered = true;
                    state.targetSpeed = 0;
                }
            }
        });

        window.addEventListener('mouseout', () => {
            this.orbitalObjects.forEach(sphere => {
                const state = this.sphereStates.get(sphere);
                if (state) {
                    state.isHovered = false;
                    state.targetSpeed = 1;
                }
            });
        });
    }

    createOrbitalSpheres(count = 6) {
        console.log('Criando esferas orbitais...');
        const radius = 5;
        const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        
        const sphereMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x000000
        });

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial.clone());
            
            sphere.position.x = Math.cos(angle) * radius;
            sphere.position.z = Math.sin(angle) * radius;
            sphere.userData = { 
                initialAngle: angle,
                radius: radius
            };
            
            this.orbitalObjects.push(sphere);
            this.scene.add(sphere);
        }
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
        mainLightSlider.addEventListener('input', (e) => {
            this.lights.main.intensity = parseFloat(e.target.value);
            updateValue(mainLightSlider, e.target.value);
        });

        // Fill Light
        const fillLightSlider = document.getElementById('fillLight');
        fillLightSlider.addEventListener('input', (e) => {
            this.lights.fill.intensity = parseFloat(e.target.value);
            updateValue(fillLightSlider, e.target.value);
        });

        // Ambient Light
        const ambientLightSlider = document.getElementById('ambientLight');
        ambientLightSlider.addEventListener('input', (e) => {
            this.lights.ambient.intensity = parseFloat(e.target.value);
            updateValue(ambientLightSlider, e.target.value);
        });

        // Rim Light
        const rimLightSlider = document.getElementById('rimLight');
        rimLightSlider.addEventListener('input', (e) => {
            this.lights.rim.intensity = parseFloat(e.target.value);
            updateValue(rimLightSlider, e.target.value);
        });

        // Save Button
        const saveButton = document.getElementById('saveLightSettings');
        saveButton.addEventListener('click', () => this.saveLightSettings());
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
        if (!this.bustoLoaded || !this.bustoModel) {
            console.log('Não é possível atualizar o tamanho do busto: modelo não carregado');
            return;
        }

        console.log('Atualizando tamanho do busto...');
        
        // Escala muito maior para garantir visibilidade
        const scale = 25; // Valor extremamente alto
        
        // Aplicar escala
        this.bustoModel.scale.set(scale, scale, scale);
        
        // Posicionar no centro da cena
        this.bustoModel.position.set(0, 0, 0); 
        this.bustoModel.visible = true;
        
        console.log('Nova escala aplicada:', scale);
        console.log('Nova posição:', this.bustoModel.position);
    }

    loadBusto() {
        console.log('Carregando busto...');
        
        // Adicionar mensagem de depuração clara
        console.log('------------------------------');
        console.log('DEPURAÇÃO: INICIANDO CARREGAMENTO DO MODELO');
        console.log('Caminhos a tentar:');
        console.log('1. /assets/models/busto.glb');
        console.log('2. /models/busto.glb');
        console.log('3. models/busto.glb (sem barra)');
        console.log('------------------------------');
        
        const loader = new GLTFLoader();
        
        const loadingElement = document.getElementById('loading');
        
        // Tentar caminho principal
        loader.load(
            '/assets/models/busto.glb',
            (gltf) => {
                console.log('SUCESSO! Busto carregado pelo caminho: /assets/models/busto.glb');
                const model = gltf.scene;
                this.bustoModel = model;
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material) {
                            child.material.metalness = 0.3;
                            child.material.roughness = 0.7;
                        }
                    }
                });

                this.scene.add(model);
                this.bustoLoaded = true;
                
                // Aplicar escala grande imediatamente após carregar
                const scale = 25;
                this.bustoModel.scale.set(scale, scale, scale);
                this.bustoModel.position.set(0, 0, 0);
                
                this.updateBustoSize();
                if (loadingElement) loadingElement.style.display = 'none';
                
                console.log('Modelo foi adicionado à cena:');
                console.log('- Posição:', this.bustoModel.position);
                console.log('- Escala:', this.bustoModel.scale);
                console.log('- Visível:', this.bustoModel.visible);
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                if (loadingElement) loadingElement.textContent = `Carregando... ${percent}%`;
                console.log('Progresso caminho 1:', percent + '%');
            },
            (error) => {
                console.error('ERRO CAMINHO 1: Falha ao carregar de /assets/models/busto.glb');
                console.error(error);
                
                // Tentar caminho alternativo
                console.log('TENTATIVA 2: Tentando caminho alternativo...');
                if (loadingElement) loadingElement.textContent = 'Tentando alternativa...';
                
                // Segunda tentativa com caminho alternativo
                loader.load(
                    '/models/busto.glb',
                    (gltf) => {
                        console.log('SUCESSO! Modelo carregado pelo caminho alternativo: /models/busto.glb');
                        this.bustoModel = gltf.scene;
                        this.scene.add(this.bustoModel);
                        
                        // Ajustar escala e posição do modelo
                        this.bustoModel.scale.set(6, 6, 6); // Aumentando de 3 para 6
                        this.bustoModel.position.y = -2;
                        
                        this.bustoModel.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                                if (child.material) {
                                    child.material.metalness = 0.3;
                                    child.material.roughness = 0.7;
                                }
                            }
                        });
                        
                        this.bustoLoaded = true;
                        this.updateBustoSize();
                        if (loadingElement) loadingElement.style.display = 'none';
                        
                        console.log('Modelo foi adicionado à cena:');
                        console.log('- Posição:', this.bustoModel.position);
                        console.log('- Escala:', this.bustoModel.scale);
                        console.log('- Visível:', this.bustoModel.visible);
                    },
                    (progress) => {
                        const percent = (progress.loaded / progress.total * 100).toFixed(2);
                        if (loadingElement) loadingElement.textContent = `Carregando (alt)... ${percent}%`;
                        console.log('Progresso caminho 2:', percent + '%');
                    },
                    (secondError) => {
                        console.error('ERRO CAMINHO 2: Também falhou com /models/busto.glb');
                        console.error(secondError);
                        if (loadingElement) loadingElement.textContent = 'Erro ao carregar o modelo';
                        
                        // Tentar terceira alternativa
                        console.log('TENTATIVA 3: Tentando terceiro caminho (sem barra)...');
                        if (loadingElement) loadingElement.textContent = 'Última tentativa...';
                        
                        loader.load(
                            'models/busto.glb', // Sem barra no início
                            (gltf) => {
                                console.log('SUCESSO! Busto carregado pela terceira alternativa: models/busto.glb');
                                this.bustoModel = gltf.scene;
                                this.scene.add(this.bustoModel);
                                
                                this.bustoModel.scale.set(6, 6, 6); // Aumentando de 3 para 6
                                this.bustoModel.position.y = -2;
                                
                                this.bustoModel.traverse((child) => {
                                    if (child.isMesh) {
                                        child.castShadow = true;
                                        child.receiveShadow = true;
                                    }
                                });
                                
                                this.bustoLoaded = true;
                                this.updateBustoSize();
                                if (loadingElement) loadingElement.style.display = 'none';
                                
                                console.log('Modelo foi adicionado à cena:');
                                console.log('- Posição:', this.bustoModel.position);
                                console.log('- Escala:', this.bustoModel.scale);
                                console.log('- Visível:', this.bustoModel.visible);
                            },
                            null,
                            (thirdError) => {
                                console.error('ERRO FINAL: Todas as tentativas falharam');
                                console.error(thirdError);
                                if (loadingElement) loadingElement.textContent = 'Falha no carregamento';
                                
                                console.log('------------------------------');
                                console.log('DEPURAÇÃO: FALHA NO CARREGAMENTO');
                                console.log('Possíveis causas:');
                                console.log('1. Arquivo não existe nos caminhos testados');
                                console.log('2. Arquivo está corrompido');
                                console.log('3. CORS impede acesso ao arquivo');
                                console.log('4. Problema na configuração do servidor');
                                console.log('------------------------------');
                            }
                        );
                    }
                );
            }
        );
    }

    init() {
        console.log('Iniciando configuração...');
        
        // Criar esferas orbitais
        this.createOrbitalSpheres();
        
        // Configurar luzes
        this.setupLights();
        
        // Carregar modelo da cabeça
        this.loadBusto();
        
        // Ajustar câmera e renderizador ao redimensionar
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            if (this.bustoLoaded && this.bustoModel) {
                this.updateBustoSize();
            }
        });
    }

    updateOrbitalObjects(deltaTime) {
        const rotationSpeed = 0.2;
        
        this.orbitalObjects.forEach(sphere => {
            const state = this.sphereStates.get(sphere);
            if (!state) return;

            // Interpolar suavemente entre a velocidade atual e a velocidade alvo
            state.currentSpeed = THREE.MathUtils.lerp(
                state.currentSpeed,
                state.targetSpeed,
                0.03 // Fator de suavização mais lento para transição mais suave
            );

            // Atualizar posição com base na velocidade atual
            const angle = sphere.userData.initialAngle + performance.now() * 0.001 * rotationSpeed * state.currentSpeed;
            sphere.position.x = Math.cos(angle) * sphere.userData.radius;
            sphere.position.z = Math.sin(angle) * sphere.userData.radius;
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = 0.016; // Aproximadamente 60fps

        // Atualizar a rotação da cabeça
        if (this.bustoLoaded && this.bustoModel) {
            // Interpolar suavemente até o alvo
            this.headRotation.current += (this.headRotation.target - this.headRotation.current) * 0.02;

            // Inverter direção quando atingir os limites
            if (Math.abs(this.headRotation.current) >= 0.05) { // 3 graus
                this.headRotation.target = -this.headRotation.target;
            }

            // Aplicar rotação
            this.bustoModel.rotation.y = this.headRotation.current;
        }

        // Atualizar esferas orbitais
        this.updateOrbitalObjects(deltaTime);

        // Atualizar controles
        this.controls.update();

        // Renderizar cena
        this.renderer.render(this.scene, this.camera);
    }
}

// Aguardar o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    new Scene();
}); 