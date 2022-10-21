import type { NextPage } from "next";
import * as THREE from "three";
import { useLayoutEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Reflect } from "../components/reflect";

function Scene() {
  const line = useRef<SVGLineElement | null>(null);
  const reflect = useRef();

  useLayoutEffect(() => {
    const geometry = line.current?.geometry;
    // Bind the positions of the reflector to real line segments.
    geometry.attributes.position = new THREE.BufferAttribute(
      reflect.current.positions,
      3
    );
    geometry.attributes.position.usage = THREE.DynamicDrawUsage;
    geometry.setDrawRange(0, 0);
  }, []);

  useFrame((state) => {
    // Bind the ray to your mouse pointer.
    reflect.current.setRay([
      (state.pointer.x * state.viewport.width) / 2,
      (state.pointer.y * state.viewport.height) / 2,
      0,
    ]);
    // Update ray reflection every frame and set draw range to the number of objects that were hit.
    line.current.geometry.setDrawRange(0, reflect.current.update());
    line.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <Reflect ref={reflect} bounce={10} start={[10, 5, 0]} end={[0, 0, 0]}>
        {/* Any object in here will receive ray events */}
        <Block scale={0.5} position={[0.25, -0.15, 0]} />
        <Block scale={0.5} position={[-1, 1, 0]} rotation={[0, 0, -2.75]} />
        <Triangle
          scale={0.4}
          position={[-1.1, -1.2, 0]}
          rotation={[Math.PI / 2, Math.PI, 0]}
        />
      </Reflect>
      {/* We use THREE.Line to represent the reflect positions. */}
      <line ref={line}>
        <lineBasicMaterial />
      </line>
    </>
  );
}

function Block(props) {
  const [hovered, hover] = useState(false);
  return (
    <mesh
      onRayOver={(e) => hover(true)}
      onRayOut={(e) => hover(false)}
      {...props}
    >
      <boxGeometry />
      <meshBasicMaterial color={hovered ? "orange" : "white"} />
    </mesh>
  );
}

function Triangle(props) {
  const [hovered, hover] = useState(false);
  return (
    <mesh
      {...props}
      onRayOver={(e) => (e.stopPropagation(), hover(true))}
      onRayOut={(e) => hover(false)}
    >
      <cylinderGeometry args={[1, 1, 1, 3, 1]} />
      <meshBasicMaterial color={hovered ? "hotpink" : "white"} />
    </mesh>
  );
}

const Home: NextPage = () => {
  return (
    <Canvas orthographic camera={{ zoom: 100 }} style={{ height: "99vh" }}>
      <color attach="background" args={["#000"]} />
      <Scene />
    </Canvas>
  );
};

export default Home;
