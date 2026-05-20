import { useFrame, useThree } from "@react-three/fiber"
import { useLayoutEffect } from "react"
import { damp } from "three/src/math/MathUtils.js"

export default function Camera({ size }) {
    const { camera } = useThree()

    useLayoutEffect(() => {
        camera.position.set(10, 10, 10)
        camera.lookAt(0, 0, 0)
    }, [camera])

    useFrame((state, delta) => {
        camera.zoom = damp(camera.zoom, 100 - (1 + size * 5), 1, delta)
        camera.updateProjectionMatrix()
    })

    return null
}