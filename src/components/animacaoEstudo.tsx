// Header de Navegação 3D Esférica inspirado em Active Theory
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

interface MenuItem3D {
  id: string;
  title: string;
  position: THREE.Vector3;
  mesh?: THREE.Mesh;
}

const SphericalNavigationHeader: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const menuItemsRef = useRef<MenuItem3D[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Itens do menu
  const menuItems: Omit<MenuItem3D, 'mesh' | 'position'>[] = [
    { id: 'work', title: 'Work' },
    { id: 'about', title: 'About' },
    { id: 'lab', title: 'Lab' },
    { id: 'contact', title: 'Contact' },
    { id: 'blog', title: 'Blog' },
  ];

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 10;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    
    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    
    // Luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    
    // Criar itens do menu em uma esfera
    const radius = 5;
    menuItems.forEach((item, index) => {
      const phi = Math.acos(-1 + (2 * index) / menuItems.length);
      const theta = Math.sqrt(menuItems.length * Math.PI) * phi;
      
      const position = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );
      
      // Criar geometria para o item
      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x4285f4,
        emissive: 0x4285f4,
        emissiveIntensity: 0.2
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);
      mesh.userData = { id: item.id, title: item.title };
      scene.add(mesh);
      
      menuItemsRef.current.push({
        ...item,
        position,
        mesh
      });
      
      // Criar linha de conexão com o centro
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        position
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0x4285f4,
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      scene.add(line);
    });

    // Eventos do mouse
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Rotacionar cena baseado no mouse
      if (sceneRef.current) {
        gsap.to(sceneRef.current.rotation, {
          y: mouseRef.current.x * 0.3,
          x: -mouseRef.current.y * 0.3,
          duration: 1.5,
          ease: "power2.out"
        });
      }
    };

    const handleClick = () => {
      if (!cameraRef.current || !sceneRef.current) return;
      
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children.filter(obj => obj.type === 'Mesh')
      );
      
      if (intersects.length > 0) {
        const clickedItem = intersects[0].object.userData;
        setSelectedItem(clickedItem.id);
        
        // Animar zoom no item selecionado
        if (cameraRef.current && intersects[0].object.position) {
          gsap.to(cameraRef.current.position, {
            x: intersects[0].object.position.x * 1.5,
            y: intersects[0].object.position.y * 1.5,
            z: intersects[0].object.position.z + 3,
            duration: 1.5,
            ease: "power3.inOut"
          });
        }
      }
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    containerRef.current.addEventListener('click', handleClick);

    // Animar
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Animar itens do menu
      menuItemsRef.current.forEach(item => {
        if (item.mesh) {
          // Pulsação para item hovered
          if (hoveredItem === item.id) {
            item.mesh.scale.setScalar(1.2);
            (item.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
          } else {
            item.mesh.scale.setScalar(1);
            (item.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.2;
          }
          
          // Rotação suave
          item.mesh.rotation.y += 0.01;
        }
      });
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    // Atualizar tamanho
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && rendererRef.current?.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Atualizar hovered item
  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current) return;

    const checkIntersection = () => {
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current!.children.filter(obj => obj.type === 'Mesh')
      );
      
      if (intersects.length > 0) {
        setHoveredItem(intersects[0].object.userData.id);
      } else {
        setHoveredItem(null);
      }
    };

    const interval = setInterval(checkIntersection, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="relative h-screen w-full bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Overlay de informações */}
      <div className="absolute bottom-10 left-10 text-white z-10">
        <h1 className="text-4xl font-bold mb-2">ACTIVE THEORY</h1>
        <p className="opacity-80">Clique em uma esfera para explorar</p>
      </div>
      
      {/* Título do item hovered */}
      {hoveredItem && (
        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 text-white z-10">
          <div className="bg-black bg-opacity-50 px-6 py-3 rounded-lg">
            <p className="text-xl">
              {menuItems.find(item => item.id === hoveredItem)?.title}
            </p>
          </div>
        </div>
      )}
      
      {/* Item selecionado */}
      {selectedItem && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black bg-opacity-90 p-8 rounded-xl max-w-2xl">
            <h2 className="text-3xl font-bold text-white mb-4">
              {menuItems.find(item => item.id === selectedItem)?.title}
            </h2>
            <p className="text-gray-300 mb-6">
              Conteúdo detalhado sobre {selectedItem} apareceria aqui.
            </p>
            <button
              onClick={() => setSelectedItem(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default SphericalNavigationHeader;