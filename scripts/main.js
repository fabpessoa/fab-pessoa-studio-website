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
        
        // Variáveis para a animação da cabeça - usando abordagem com seno para movimento suave
        this.headAnimation = {
            time: 0,           // Tempo decorrido para a animação
            speed: 0.5,        // Velocidade da animação (ajustar para mais lento/rápido)
            amplitude: 0.05,   // Amplitude máxima em radianos (3 graus)
            active: true       // Controle para ativar/desativar a animação
        };
        
        // Configuração de lastTime para animação
        this.lastTime = performance.now();
        
        // Configuração dos controles de luzes
        this.lightSettings = this.loadLightSettings();
        
        // Inicializar esferas orbitais
        this.orbitalObjects = [];
        
        // Inicializar cena
        this.initScene();
        
        // Configurar luzes
        this.setupLights();
        
        // Configurar controles da câmera
        this.setupControls();
        
        // Carregar modelos
        this.loadModels();
        
        // Criar esferas orbitais
        this.createOrbitalSpheres();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Iniciar loop de renderização
        this.animate();
        
        // Configurar controles de luz
        this.setupLightControls();
        
        console.log('Scene initialized');
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
        console.log('Configurando event listeners...');
        
        // Redimensionar canvas quando a janela for redimensionada
        window.addEventListener('resize', () => {
            this.resize();
        });

        // Toggle do painel de controle de iluminação
        const toggleBtn = document.getElementById('toggle-panel');
        const lightPanel = document.getElementById('light-controls');
        
        if (toggleBtn && lightPanel) {
            toggleBtn.addEventListener('click', () => {
                lightPanel.classList.toggle('collapsed');
                toggleBtn.querySelector('.material-icons').textContent = 
                    lightPanel.classList.contains('collapsed') ? 'expand_more' : 'expand_less';
            });
        }
        
        // Nota: Interações com esferas orbitais foram removidas
    }

    createOrbitalSpheres(count = 6) {
        console.log('Criando esferas orbitais com textura de alumínio escovado...');
        const radius = 5;
        const sphereGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        
        // Material de alumínio escovado sem textura externa
        const brushedMetalMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888, // Cor cinza para alumínio
            metalness: 0.9,
            roughness: 0.4,
            envMapIntensity: 1.0
        });
        
        // Criar ambiente de reflexão
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        
        // Configurar cena para reflexões
        this.scene.environment = pmremGenerator.fromScene(new THREE.Scene()).texture;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const sphere = new THREE.Mesh(sphereGeometry, brushedMetalMaterial.clone());
            
            sphere.position.x = Math.cos(angle) * radius;
            sphere.position.z = Math.sin(angle) * radius;
            sphere.userData = { 
                initialAngle: angle,
                radius: radius,
                rotationSpeed: 0.2 // Velocidade constante
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
        // Ajustar tamanho do busto
        if (!this.bustoModel) return;
        
        // Aplicar escala
        this.bustoModel.scale.set(25, 25, 25);
        
        // Centralizar
        this.bustoModel.position.set(0, 0, 0);
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
                this.bustoModel.position.set(0, -8, 0);
                
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
                        this.bustoModel.scale.set(25, 25, 25);
                        this.bustoModel.position.set(0, -8, 0);
                        
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
                                
                                this.bustoModel.scale.set(25, 25, 25);
                                this.bustoModel.position.set(0, -8, 0);
                                
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

    initScene() {
        console.log('Inicializando cena...');
        
        // Criar cena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Criar câmera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        
        // Criar renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Adicionar renderer ao DOM
        document.body.appendChild(this.renderer.domElement);
        
        // Configuração da animação da cabeça
        this.headAnimation = {
            active: true,     // Animação ativa
            time: 0,          // Tempo atual
            speed: 0.5,       // Velocidade da animação
            amplitude: 0.3    // Amplitude da rotação
        };
    }

    setupControls() {
        console.log('Configurando controles da câmera...');
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2;
    }

    updateOrbitalObjects() {
        if (!this.orbitalObjects || this.orbitalObjects.length === 0) return;
        
        const time = performance.now() * 0.001; // Tempo em segundos
        
        this.orbitalObjects.forEach(obj => {
            if (!obj.userData) return;
            
            const angle = obj.userData.initialAngle + time * obj.userData.rotationSpeed;
            const radius = obj.userData.radius;
            
            obj.position.x = Math.cos(angle) * radius;
            obj.position.z = Math.sin(angle) * radius;
            
            // Pequena flutuação vertical
            obj.position.y = Math.sin(time * 0.5 + obj.userData.initialAngle) * 0.5;
            
            // Rotação das esferas sobre seu próprio eixo
            obj.rotation.y += 0.01;
            obj.rotation.x += 0.005;
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Atualizar busto se estiver carregado
        if (this.bustoLoaded && this.bustoModel) {
            this.updateBustoRotation(currentTime);
        }
        
        // Atualizar esferas orbitais
        this.updateOrbitalObjects();
        
        // Atualizar controles
        if (this.controls) {
            this.controls.update();
        }
        
        // Renderizar cena
        this.renderer.render(this.scene, this.camera);
    }

    updateBustoRotation(currentTime) {
        // Verificar se o busto tem animação ativa
        if (!this.headAnimation || !this.headAnimation.active) return;
        
        // Calcular rotação usando seno para movimento suave e contínuo
        const time = currentTime * 0.001 * this.headAnimation.speed;
        const rotation = Math.sin(time) * this.headAnimation.amplitude;
        
        // Aplicar rotação
        this.bustoModel.rotation.y = rotation;
    }
    
    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        if (this.bustoLoaded && this.bustoModel) {
            this.updateBustoSize();
        }
    }

    loadModels() {
        console.log('Carregando modelos...');
        this.loadBusto();
    }
    
    loadBusto() {
        console.log('Carregando modelo do busto...');
        this.bustoLoaded = false;
        
        const loader = new GLTFLoader();
        loader.load(
            '/assets/models/busto/scene.gltf',
            (gltf) => {
                console.log('Modelo do busto carregado com sucesso');
                this.bustoModel = gltf.scene;
                
                // Ajustar tamanho
                this.bustoModel.scale.set(25, 25, 25);
                
                // Centralizar
                this.bustoModel.position.set(0, 0, 0);
                
                // Adicionar à cena
                this.scene.add(this.bustoModel);
                
                // Marcar como carregado
                this.bustoLoaded = true;
                
                // Ajustar tamanho e posição
                this.updateBustoSize();
            },
            (xhr) => {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                console.log(`Progresso do carregamento do busto: ${Math.round(percentComplete)}%`);
            },
            (error) => {
                console.error('Erro ao carregar modelo do busto:', error);
            }
        );
    }
}

// Aguardar o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    new Scene();
}); 