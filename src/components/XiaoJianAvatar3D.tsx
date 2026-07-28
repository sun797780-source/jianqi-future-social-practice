import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { MathUtils } from "three";
import type { Group, Mesh } from "three";

type PetStatus = "idle" | "thinking" | "listening" | "speaking";
type XiaoJianAvatar3DProps = { status: PetStatus };

const cream = "#fff7df";
const mint = "#61d6ad";
const jade = "#168b71";
const deepJade = "#075b55";
const ink = "#173b46";
const gold = "#f4bd4f";
const coral = "#f08c82";

function XiaoJianModel({ status }: XiaoJianAvatar3DProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const leaf = useRef<Group>(null);
  const wavingArm = useRef<Group>(null);
  const leftEye = useRef<Mesh>(null);
  const rightEye = useRef<Mesh>(null);
  const mouth = useRef<Mesh>(null);
  const badge = useRef<Group>(null);
  const blinkOffset = useMemo(() => Math.random() * 2.7, []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const speaking = status === "speaking";
    const thinking = status === "thinking";
    const listening = status === "listening";

    if (root.current) {
      root.current.position.y = -0.13 + Math.sin(time * 1.8) * 0.035;
      root.current.rotation.y = MathUtils.lerp(root.current.rotation.y, Math.sin(time * 0.7) * 0.045, delta * 4);
    }
    if (body.current) {
      const squash = speaking ? 1 + Math.abs(Math.sin(time * 9)) * 0.018 : 1;
      body.current.scale.y = MathUtils.lerp(body.current.scale.y, squash, delta * 12);
    }
    if (head.current) {
      const tilt = listening ? -0.12 : thinking ? 0.08 : Math.sin(time * 0.8) * 0.018;
      head.current.rotation.z = MathUtils.lerp(head.current.rotation.z, tilt, delta * 5);
      head.current.rotation.x = MathUtils.lerp(head.current.rotation.x, thinking ? -0.06 : 0, delta * 5);
    }
    if (leaf.current) leaf.current.rotation.z = 0.08 + Math.sin(time * 1.7) * 0.07;
    if (wavingArm.current) {
      const target = speaking ? 0.78 + Math.sin(time * 8) * 0.14 : listening ? 0.35 : -0.18;
      wavingArm.current.rotation.z = MathUtils.lerp(wavingArm.current.rotation.z, target, delta * 6);
    }

    const blink = (time + blinkOffset) % 4.6 > 4.43 ? 0.08 : 1;
    if (leftEye.current) leftEye.current.scale.y = MathUtils.lerp(leftEye.current.scale.y, blink, delta * 32);
    if (rightEye.current) rightEye.current.scale.y = MathUtils.lerp(rightEye.current.scale.y, blink, delta * 32);
    if (mouth.current) {
      const open = speaking ? 0.9 + Math.abs(Math.sin(time * 11)) * 0.7 : 0.52;
      mouth.current.scale.y = MathUtils.lerp(mouth.current.scale.y, open, delta * 18);
    }
    if (badge.current) {
      badge.current.rotation.z += delta * (thinking ? 1.8 : 0.35);
      badge.current.scale.setScalar(1 + Math.sin(time * 3) * 0.025);
    }
  });

  const auraColor = status === "listening" ? coral : status === "thinking" ? "#7db9ef" : mint;

  return (
    <group ref={root} position={[0, -0.13, 0]}>
      <mesh position={[0, -1.02, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.025, 12, 64]} />
        <meshBasicMaterial color={auraColor} transparent opacity={0.76} />
      </mesh>

      <group ref={body}>
        <RoundedBox args={[1.35, 1.24, 0.86]} radius={0.32} smoothness={6} position={[0, 0.03, 0]} castShadow>
          <meshToonMaterial color={jade} />
        </RoundedBox>
        <RoundedBox args={[0.82, 0.65, 0.08]} radius={0.18} smoothness={5} position={[0, 0.15, 0.48]}>
          <meshToonMaterial color={mint} />
        </RoundedBox>
        <mesh position={[0, -0.51, 0.04]} scale={[0.72, 0.28, 0.5]}>
          <sphereGeometry args={[0.55, 28, 18]} />
          <meshToonMaterial color={deepJade} />
        </mesh>

        <group ref={badge} position={[0.27, 0.16, 0.56]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.16, 0.16, 0.05, 32]} />
            <meshToonMaterial color={gold} />
          </mesh>
          <mesh position={[0, 0.03, 0.02]} scale={[0.025, 0.075, 0.012]}>
            <boxGeometry />
            <meshBasicMaterial color={deepJade} />
          </mesh>
          <mesh position={[0, 0.03, 0.02]} scale={[0.07, 0.015, 0.012]}>
            <boxGeometry />
            <meshBasicMaterial color={deepJade} />
          </mesh>
          <mesh position={[0, -0.02, 0.02]} scale={[0.055, 0.012, 0.012]}>
            <boxGeometry />
            <meshBasicMaterial color={deepJade} />
          </mesh>
        </group>
      </group>

      <group ref={head} position={[0, 0.92, 0.12]}>
        <mesh position={[0, 0.03, -0.16]} scale={[0.88, 0.75, 0.42]} castShadow>
          <sphereGeometry args={[0.75, 36, 24]} />
          <meshToonMaterial color={deepJade} />
        </mesh>
        <mesh scale={[0.74, 0.68, 0.58]} castShadow>
          <sphereGeometry args={[0.72, 40, 28]} />
          <meshToonMaterial color={cream} />
        </mesh>
        <mesh position={[0, 0.52, -0.03]} scale={[0.64, 0.23, 0.46]}>
          <sphereGeometry args={[0.62, 32, 20]} />
          <meshToonMaterial color={mint} />
        </mesh>
        <mesh ref={leftEye} position={[-0.26, 0.06, 0.59]} scale={[1, 1, 0.45]}>
          <sphereGeometry args={[0.13, 28, 20]} />
          <meshPhysicalMaterial color={ink} roughness={0.14} clearcoat={1} />
        </mesh>
        <mesh ref={rightEye} position={[0.26, 0.06, 0.59]} scale={[1, 1, 0.45]}>
          <sphereGeometry args={[0.13, 28, 20]} />
          <meshPhysicalMaterial color={ink} roughness={0.14} clearcoat={1} />
        </mesh>
        {[-0.3, 0.22].map((x) => (
          <mesh key={x} position={[x, 0.125, 0.68]} scale={[0.045, 0.065, 0.02]}>
            <sphereGeometry args={[0.08, 16, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}
        <mesh position={[-0.3, -0.17, 0.58]} scale={[0.13, 0.05, 0.025]}>
          <sphereGeometry args={[0.5, 18, 12]} />
          <meshBasicMaterial color="#f5a29b" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0.3, -0.17, 0.58]} scale={[0.13, 0.05, 0.025]}>
          <sphereGeometry args={[0.5, 18, 12]} />
          <meshBasicMaterial color="#f5a29b" transparent opacity={0.55} />
        </mesh>
        <mesh position={[0, -0.02, 0.64]} scale={[0.03, 0.045, 0.018]}>
          <sphereGeometry args={[0.5, 14, 10]} />
          <meshToonMaterial color="#d48779" />
        </mesh>
        <mesh ref={mouth} position={[0, -0.26, 0.62]} rotation={[Math.PI / 2, 0, 0]} scale={[0.9, 0.52, 0.42]}>
          <torusGeometry args={[0.09, 0.018, 10, 28, Math.PI]} />
          <meshBasicMaterial color="#c35f68" />
        </mesh>
      </group>

      <group ref={leaf} position={[0.34, 1.77, -0.08]} rotation={[0, 0, 0.08]}>
        <mesh rotation={[0, 0, -0.35]} scale={[0.34, 0.7, 0.16]} castShadow>
          <coneGeometry args={[0.5, 1, 5]} />
          <meshToonMaterial color={jade} />
        </mesh>
        <mesh position={[-0.16, -0.16, 0.06]} rotation={[0, 0, 0.52]} scale={[0.2, 0.42, 0.12]}>
          <coneGeometry args={[0.5, 1, 5]} />
          <meshToonMaterial color={mint} />
        </mesh>
      </group>

      <group position={[-0.68, 0.24, 0]} rotation={[0, 0, 0.18]}>
        <mesh position={[0, -0.1, 0]} scale={[0.8, 1, 0.8]}>
          <capsuleGeometry args={[0.13, 0.48, 10, 20]} />
          <meshToonMaterial color={jade} />
        </mesh>
        <mesh position={[0, -0.42, 0.04]}>
          <sphereGeometry args={[0.13, 20, 14]} />
          <meshToonMaterial color={cream} />
        </mesh>
      </group>
      <group ref={wavingArm} position={[0.68, 0.3, 0]} rotation={[0, 0, -0.18]}>
        <mesh position={[0, -0.1, 0]} scale={[0.8, 1, 0.8]}>
          <capsuleGeometry args={[0.13, 0.48, 10, 20]} />
          <meshToonMaterial color={jade} />
        </mesh>
        <mesh position={[0, -0.42, 0.04]}>
          <sphereGeometry args={[0.13, 20, 14]} />
          <meshToonMaterial color={cream} />
        </mesh>
      </group>

      {[-0.27, 0.27].map((x) => (
        <RoundedBox key={x} args={[0.35, 0.18, 0.45]} radius={0.08} smoothness={5} position={[x, -0.78, 0.1]}>
          <meshToonMaterial color={ink} />
        </RoundedBox>
      ))}
    </group>
  );
}

export default function XiaoJianAvatar3D({ status }: XiaoJianAvatar3DProps) {
  return (
    <span className="pet-avatar-3d" aria-hidden="true">
      <Canvas shadows camera={{ position: [0, 0.36, 5.6], fov: 31 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.75} />
        <hemisphereLight color="#fff9ee" groundColor="#91cdb8" intensity={1.3} />
        <directionalLight position={[3, 5, 5]} intensity={2.6} color="#ffe8d3" castShadow />
        <directionalLight position={[-3, 2, 4]} intensity={1.5} color="#c9f5ec" />
        <pointLight position={[0, 2.2, 3.5]} intensity={4.5} distance={6} color="#ffe3d2" />
        <XiaoJianModel status={status} />
        <ContactShadows position={[0, -1.16, 0]} opacity={0.18} scale={2.4} blur={2.6} far={3} color="#173e36" />
      </Canvas>
    </span>
  );
}
