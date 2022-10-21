import {
  forwardRef,
  useRef,
  useMemo,
  useImperativeHandle,
  useLayoutEffect,
  Ref,
} from "react";
import * as THREE from "three";
import { invalidate } from "@react-three/fiber";

function createEvent(
  api: {
    number: number;
    objects: never[];
    hits: Map<any, any>;
    start: THREE.Vector3;
    end: THREE.Vector3;
    raycaster: THREE.Raycaster;
    positions: Float32Array;
    setRay: (
      _start?: [number, number, number],
      _end?: [number, number, number]
    ) => void;
    update: () => number;
  },
  hit:
    | {
        key: string;
        intersect: THREE.Intersection<THREE.Object3D<THREE.Event>>;
        stopped: boolean;
      }
    | undefined,
  intersect: THREE.Intersection<THREE.Object3D<THREE.Event>> & {
    direction?: THREE.Vector3;
    reflect?: THREE.Vector3;
  },
  intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[]
) {
  return {
    api,
    object: intersect.object,
    position: intersect.point,
    direction: intersect.direction,
    reflect: intersect.reflect,
    normal: intersect.face?.normal,
    intersect,
    intersects,
    stopPropagation: () => (hit!.stopped = true),
  };
}

export const Reflect = forwardRef(
  (
    {
      children,
      start: _start = [0, 0, 0],
      end: _end = [0, 0, 0],
      bounce = 10,
      far = 100,
      ...props
    }: {
      children: React.ReactNode;
      start: [number, number, number];
      end: [number, number, number];
      bounce: number;
      far?: number;
    },
    fRef
  ) => {
    bounce = (bounce || 1) + 1;

    const scene = useRef<THREE.Group>(null);
    const vStart = new THREE.Vector3();
    const vEnd = new THREE.Vector3();
    const vDir = new THREE.Vector3();
    const vPos = new THREE.Vector3();

    let intersect: THREE.Intersection<THREE.Object3D<THREE.Event>> & {
      direction?: THREE.Vector3;
      reflect?: THREE.Vector3;
    };
    let intersects: THREE.Intersection<THREE.Object3D<THREE.Event>>[] = [];

    const api = useMemo(
      () => ({
        number: 0,
        objects: [],
        hits: new Map<
          string,
          {
            key: string;
            intersect: THREE.Intersection<THREE.Object3D<THREE.Event>>;
            stopped: boolean;
          }
        >(),
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        raycaster: new THREE.Raycaster(),
        positions: new Float32Array(
          Array.from({ length: (bounce + 10) * 3 }, () => 0)
        ),
        setRay: (
          _start: [number, number, number] = [0, 0, 0],
          _end: [number, number, number] = [0, 0, 0]
        ) => {
          api.start.set(..._start);
          api.end.set(..._end);
        },
        update: () => {
          api.number = 0;
          intersects = [];

          vStart.copy(api.start);
          vEnd.copy(api.end);
          vDir.subVectors(vEnd, vStart).normalize();
          vStart.toArray(api.positions, api.number++ * 3);

          // Run a full cycle until bounces run out or the ray points into nothing.
          // This is necessary for over/out hit-testing.
          while (true) {
            api.raycaster.set(vStart, vDir);
            intersect = api.raycaster.intersectObjects(api.objects, false)[0];

            if (api.number < bounce && intersect && intersect.face) {
              intersects.push(intersect);
              intersect.direction = vDir.clone();

              // Something was hit and we still haven't met bounce limit.
              intersect.point.toArray(api.positions, api.number++ * 3);
              vDir.reflect(
                intersect.object
                  .localToWorld(intersect.face.normal)
                  .sub(intersect.object.getWorldPosition(vPos))
                  .normalize()
              );

              intersect.reflect = vDir.clone();
              vStart.copy(intersect.point);
            } else {
              // Nothing was hit and the ray extends into "infinity" (dir * far).
              vEnd
                .addVectors(vStart, vDir.multiplyScalar(far))
                .toArray(api.positions, api.number++ * 3);
              break;
            }
          }

          // Reset and count up once again
          api.number = 1;

          // Check onRayOut
          api.hits.forEach((hit) => {
            // If a previous hit is no longer part of the intersects ...
            if (
              !intersects.find((intersect) => intersect.object.uuid === hit.key)
            ) {
              // Remove the hit entry
              api.hits.delete(hit.key);
              // And call onRayOut
              if (hit.intersect.object.onRayOut) {
                invalidate();
                hit.intersect.object.onRayOut(
                  createEvent(api, hit, hit.intersect, intersects)
                );
              }
            }
          });

          // Check onRayOver
          for (intersect of intersects) {
            api.number++;

            // If the intersect hasn't been hit before
            if (!api.hits.has(intersect.object.uuid)) {
              // Create new entry.
              const hit = {
                key: intersect.object.uuid,
                intersect,
                stopped: false,
              };
              api.hits.set(intersect.object.uuid, hit);

              // Call onRayOver.
              if (intersect.object.onRayOver) {
                invalidate();
                intersect.object.onRayOver(
                  createEvent(api, hit, intersect, intersects)
                );
              }
            }

            const hit = api.hits.get(intersect.object.uuid);

            // Check onRayMove.
            if (intersect.object.onRayMove) {
              invalidate();
              intersect.object.onRayMove(
                createEvent(api, hit, intersect, intersects)
              );
            }

            // If the hit was stopped (by the user calling stopPropagation) then interrupt the loop
            if (hit?.stopped) break;

            // If we're at the last hit and the ray hasn't been stopped it goes into the infinite
            if (intersect === intersects[intersects.length - 1]) api.number++;
          }
          return Math.max(2, api.number);
        },
      }),
      [bounce, far]
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => void api.setRay(_start, _end), [..._start, ..._end]);
    useImperativeHandle(fRef, () => api, [api]);

    useLayoutEffect(() => {
      // Collect all objects that fulfill the criteria
      api.objects = [];
      if (scene.current) {
        scene.current.traverse((object) => {
          if (
            (object as THREE.Mesh).isMesh &&
            (object.onRayOver || object.onRayOut || object.onRayMove)
          ) {
            api.objects.push(object);
          }
        });
        scene.current.updateWorldMatrix(true, true);
      }
      // Calculate world matrices at least once before it starts to raycast.
    });

    return (
      <group ref={scene} {...props}>
        {children}
      </group>
    );
  }
);

Reflect.displayName = "Reflect";
