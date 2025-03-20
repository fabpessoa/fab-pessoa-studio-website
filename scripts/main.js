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
                baseEmissive: 0x000000,
                hoverEmissive: 0x444444,
                initialAngle: angle,
                radius: radius
            };
            
            this.orbitalObjects.push(sphere);
            this.scene.add(sphere);
        }
    }

    setupLights() {
        console.log('Configurando luzes...');
        
        // Luz ambiente suave para iluminação base
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(this.lights.ambient);

        // Luz principal forte do lado direito
        this.lights.main = new THREE.SpotLight(0xffffff, 3);
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

        // Luz de preenchimento suave do lado esquerdo
        this.lights.fill = new THREE.DirectionalLight(0xffffff, 0.2);
        this.lights.fill.position.set(-4, 0, 2);
        this.scene.add(this.lights.fill);

        // Luz de contorno sutil
        this.lights.rim = new THREE.SpotLight(0xffffff, 0.5);
        this.lights.rim.position.set(-2, 4, -3);
        this.lights.rim.angle = Math.PI / 5;
        this.lights.rim.penumbra = 0.8;
        this.scene.add(this.lights.rim);

        // Luz de fundo sutil para separar do background
        this.lights.back = new THREE.DirectionalLight(0xffffff, 0.1);
        this.lights.back.position.set(0, 0, -5);
        this.scene.add(this.lights.back);
    }

    setupLightControls() {
        // Configurar os controles de luz
        const updateValue = (element, value) => {
            const valueSpan = element.parentElement.querySelector('.value');
            if (valueSpan) {
                valueSpan.textContent = parseFloat(value).toFixed(2);
            }
        };

        // Carregar configurações salvas
        this.loadLightSettings();

        // Luz Principal
        const mainLightSlider = document.getElementById('mainLight');
        mainLightSlider.addEventListener('input', (e) => {
            this.lights.main.intensity = parseFloat(e.target.value);
            updateValue(mainLightSlider, e.target.value);
        });

        // Luz de Preenchimento
        const fillLightSlider = document.getElementById('fillLight');
        fillLightSlider.addEventListener('input', (e) => {
            this.lights.fill.intensity = parseFloat(e.target.value);
            updateValue(fillLightSlider, e.target.value);
        });

        // Luz Ambiente
        const ambientLightSlider = document.getElementById('ambientLight');
        ambientLightSlider.addEventListener('input', (e) => {
            this.lights.ambient.intensity = parseFloat(e.target.value);
            updateValue(ambientLightSlider, e.target.value);
        });

        // Luz de Contorno
        const rimLightSlider = document.getElementById('rimLight');
        rimLightSlider.addEventListener('input', (e) => {
            this.lights.rim.intensity = parseFloat(e.target.value);
            updateValue(rimLightSlider, e.target.value);
        });

        // Botão Salvar
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
        
        // Feedback visual
        const saveButton = document.getElementById('saveLightSettings');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Configurações Salvas!';
        saveButton.style.background = '#45a049';
        
        setTimeout(() => {
            saveButton.textContent = originalText;
            saveButton.style.background = '#4CAF50';
        }, 2000);
    }

    loadLightSettings() {
        const savedSettings = localStorage.getItem('lightSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            
            // Atualizar sliders e luzes
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
                    const valueSpan = element.slider.parentElement.querySelector('.value');
                    if (valueSpan) {
                        valueSpan.textContent = parseFloat(value).toFixed(2);
                    }
                }
            });
        }
    }

    updateBustoSize() {
        if (!this.bustoLoaded || !this.bustoModel) return;

        const isMobile = window.innerWidth <= 768;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calcular a caixa delimitadora do modelo
        const box = new THREE.Box3().setFromObject(this.bustoModel);
        const size = box.getSize(new THREE.Vector3());

        // Calcular o fator de escala desejado
        let targetHeight = viewportHeight * 0.8;
        let targetWidth = isMobile ? viewportWidth * 0.8 : viewportWidth * 0.4;
        
        // Converter unidades de pixel para unidades da cena (considerando a posição da câmera)
        const fov = this.camera.fov * Math.PI / 180;
        const targetHeightScene = 2 * Math.tan(fov / 2) * this.camera.position.z * 0.8;
        const targetWidthScene = targetHeightScene * (targetWidth / targetHeight);

        // Calcular fatores de escala
        const scaleY = targetHeightScene / size.y;
        const scaleX = targetWidthScene / size.x;
        
        // Usar o menor fator de escala para manter a proporção
        const scale = Math.min(scaleX, scaleY);
        
        this.bustoModel.scale.set(scale, scale, scale);

        // Centralizar o modelo após o redimensionamento
        const newBox = new THREE.Box3().setFromObject(this.bustoModel);
        const center = newBox.getCenter(new THREE.Vector3());
        this.bustoModel.position.sub(center);
    }

    loadBusto() {
        console.log('Carregando busto...');
        const loader = new GLTFLoader();
        
        loader.load(
            '/assets/models/busto.glb',
            (gltf) => {
                console.log('Busto carregado com sucesso!');
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
                this.updateBustoSize();
                document.getElementById('loading').style.display = 'none';
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100).toFixed(2);
                document.getElementById('loading').textContent = `Carregando... ${percent}%`;
                console.log('Progresso:', percent + '%');
            },
            (error) => {
                console.error('Erro ao carregar o modelo:', error);
                document.getElementById('loading').textContent = 'Erro ao carregar o modelo';
            }
        );
    }

    init() {
        console.log('Iniciando configuração...');
        this.setupLights();
        this.loadBusto();
        this.createOrbitalSpheres();

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.updateBustoSize();
        });
    }

    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.orbitalObjects);
        
        this.orbitalObjects.forEach(sphere => {
            const material = sphere.material;
            material.emissive.setHex(sphere.userData.baseEmissive);
        });

        if (intersects.length > 0) {
            const material = intersects[0].object.material;
            material.emissive.setHex(intersects[0].object.userData.hoverEmissive);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.checkIntersections();

        const time = Date.now() * 0.0002;
        this.orbitalObjects.forEach((sphere, index) => {
            const angle = sphere.userData.initialAngle + time;
            sphere.position.x = Math.cos(angle) * sphere.userData.radius;
            sphere.position.z = Math.sin(angle) * sphere.userData.radius;
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Aguardar o DOM estar pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando aplicação...');
    new Scene();
}); 