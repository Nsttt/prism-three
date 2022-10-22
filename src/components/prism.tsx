import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three-stdlib";

interface PrismProps {
  scale: number;
  position: [number, number, number];
  [x: string]: unknown;
}

export function Prism({
  onRayOver,
  onRayOut,
  onRayMove,
  scale,
  ...props
}: PrismProps) {
  // const loader = useLoader<THREE.ConeGeometry>(
  //   GLTFLoader,
  //   "https://uploads.codesandbox.io/uploads/user/b3e56831-8b98-4fee-b941-0e27f39883ab/xxpI-prism.glb"
  // );
  const { nodes } = useGLTF(
    "https://uploads.codesandbox.io/uploads/user/b3e56831-8b98-4fee-b941-0e27f39883ab/xxpI-prism.glb"
  );

  const geometry = new THREE.BufferGeometry();

  return (
    <group scale={scale} {...props}>
      {/* A low-res, invisible representation of the prism that gets hit by the raycaster */}
      <mesh
        visible={false}
        scale={1.9}
        rotation={[Math.PI / 2, Math.PI, 0]}
        onRayOver={onRayOver}
        onRayOut={onRayOut}
        onRayMove={onRayMove}
      >
        <cylinderGeometry args={[1, 1, 1, 3, 1]} />
      </mesh>
      {/* The visible hi-res prism */}
      <mesh
        position={[0, 0, 0.6]}
        renderOrder={10}
        scale={2}
        dispose={null}
        geometry={nodes.Cone.geometry}
      >
        <meshPhysicalMaterial
          clearcoat={1}
          clearcoatRoughness={0}
          transmission={1}
          thickness={0.9}
          roughness={0}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
