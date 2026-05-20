import { SoftShadows } from "@react-three/drei"
import { useThree } from "@react-three/fiber"

export function Lights() {
    const { viewport } = useThree()
    // Use diagonal to cover the full viewport regardless of light angle
    const size = Math.sqrt(viewport.width ** 2 + viewport.height ** 2) / 2

    return (
        <>
            <SoftShadows
                size={55}
                samples={20}
                focus={1.25}
            />
            <directionalLight
                position={[14, 16, 3]}
                intensity={2}
                castShadow
                shadow-mapSize={[1024 * 2, 1024 * 2]}
                shadow-normalBias={-.01}
                shadow-camera-near={-size * 2}
                shadow-camera-far={size * 2}
                shadow-camera-left={-size}
                shadow-camera-right={size}
                shadow-camera-top={size}
                shadow-camera-bottom={-size}
            />
            <directionalLight
                position={[15, 0, 5]}
                intensity={.4}
            />
            <ambientLight intensity={.25} />
            <axesHelper scale={10} visible={false} />
        </>
    )
}