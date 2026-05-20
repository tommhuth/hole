import { extend, useFrame } from "@react-three/fiber"
import extensions from "./extensions"
import Camera from "./components/camera"
import { Mesh, Vector3 } from "three"
import { Tuple3 } from "./types/global"
import { CrashcatProvider, useBody, useCrashcat } from "@data/crashcat"
import { box, compound, MotionType, registerShapes, rigidBody, triangleMesh, scaled } from "crashcat"
import { lazy, useMemo, useState } from "react"
import random from "@huth/random"
import { damp } from "three/src/math/MathUtils.js"
import { Lights } from "@components/lights"
import { Edges } from "@react-three/drei"

import { GLTF } from "three-stdlib"

extend(extensions)
registerShapes([scaled.def, box.def, compound.def, triangleMesh.def])

import { useGLTF } from "@react-three/drei"

import floorModel from "@assets/models/floor.glb"
import config from "@data/config"

type GLTFResult = GLTF & {
    nodes: {
        mesh: Mesh
        imposter: Mesh
    }
}

function Floor({ hole, size = [50, .5, 50] }) {
    const { nodes, scene } = useGLTF(floorModel) as unknown as GLTFResult
    const targetpos = useMemo(() => new Vector3(), [])
    const { world } = useCrashcat()
    const currpos = useMemo(() => new Vector3(), [])
    const shape = useMemo(() => {
        const allPositions: number[] = []
        const allIndices: number[] = []
        const child = nodes.imposter
        const geometry = child.geometry
        const positions = geometry.getAttribute("position")
        const worldMatrix = child.matrixWorld
        const vertex = new Vector3()

        for (let i = 0; i < positions.count; i++) {
            vertex.fromBufferAttribute(positions, i)
            vertex.applyMatrix4(worldMatrix)
            allPositions.push(vertex.x, vertex.y, vertex.z)
        }

        const indices = geometry.getIndex()

        if (indices) {
            for (let i = 0; i < indices.count; i++) {
                allIndices.push(indices.getX(i))
            }
        } else {
            for (let i = 0; i < positions.count; i++) {
                allIndices.push(i)
            }
        }

        return triangleMesh.create({
            positions: allPositions,
            indices: allIndices,
        })
    }, [scene])
    const baseholesize = 1.5
    const [ref, getBody] = useBody(({ OBJECT_LAYER_MOVING }) => {
        return {
            shape: scaled.create({
                shape,
                scale: [baseholesize + hole, size[1], baseholesize + hole]
            }),
            motionType: MotionType.KINEMATIC,
            objectLayer: OBJECT_LAYER_MOVING,
            position: [currpos.x, -size[1] / 2, currpos.z],
        }
    }, [hole, shape])

    useFrame((state, delta) => {
        let body = getBody()

        if (!body) {
            return null
        }

        currpos.x = damp(currpos.x, targetpos.x, 3, delta)
        currpos.z = damp(currpos.z, targetpos.z, 3, delta)

        rigidBody.setPosition(world, body, [currpos.x, -size[1] / 2, currpos.z], true)
    })

    useFrame((state, delta) => {
        let mesh = ref.current

        if (!mesh) {
            return
        }

        for (let axis of ["x", "z"]) {
            mesh.scale[axis] = damp(mesh.scale[axis], baseholesize + hole, 6, delta)
        }
    })

    return (
        <>
            <mesh
                onPointerMove={(e) => {
                    targetpos.set(e.point.x - .5, -size[1] / 2, e.point.z - .5)
                }}
                visible={false}
            >
                <boxGeometry args={[100, size[1], 100]} />
                <meshLambertMaterial color="lightgray" />
            </mesh>
            <mesh
                ref={ref}
                castShadow
                receiveShadow
                scale-y={size[1]}
                geometry={nodes.mesh.geometry}
            >
                <meshPhongMaterial color={"#eee"} />
            </mesh>
        </>
    )
}

interface BoxProps {
    size?: Tuple3;
    position?: Tuple3;
    onDead: () => void
}

function Box({
    size = [1, 1, 1],
    position = [0, 0, 0],
    onDead
}: BoxProps) {
    const [ref, getBody] = useBody(({ OBJECT_LAYER_MOVING }) => {
        return {
            shape: box.create({ halfExtents: [size[0] / 2, size[1] / 2, size[2] / 2] }),
            motionType: MotionType.DYNAMIC,
            objectLayer: OBJECT_LAYER_MOVING,
            position,
            restitution: .3,
            friction: .6,
            allowSleeping: false,
        }
    })
    const [dead, setDead] = useState(false)

    useFrame(() => {
        const body = getBody()

        if (body && body.position[1] < -5 && !dead) {
            setDead(true)
            onDead()
        }
    })

    return (
        <mesh
            ref={ref}
            castShadow
            receiveShadow
        >
            <boxGeometry args={size} />
            <meshLambertMaterial color="blue" />
            <Edges lineWidth={1.5} />
        </mesh>
    )
}

const Perf = lazy(async () => {
    const { Perf } = await import("r3f-perf")

    return { default: Perf }
})

export default function App() {
    const [size, setSize] = useState(0)
    const boxes = useMemo(() => {
        return Array.from({ length: 20 }).map(() => {
            return {
                id: random.id(),
                position: [
                    random.float(-5, 5),
                    5,
                    random.float(-5, 5)
                ] as Tuple3,
                size: [
                    random.float(.25, 2),
                    random.float(.25, 2),
                    random.float(.25, 2)
                ] as Tuple3
            }
        })
    }, [])

    return (
        <CrashcatProvider
            settings={{
                gravity: [0, -15, 0],
                sleeping: {
                    allowSleeping: true
                },
                solver: {
                    baumgarteFactor: 1,
                    penetrationSlop: .01,
                    maxPenetrationDistance: 1,
                },
            }}
        >
            <Camera size={size} />
            <Lights />
            <Floor hole={size} />

            {boxes.map((i) => {
                return (
                    <Box
                        {...i}
                        key={i.id}
                        onDead={() => setSize(size + Math.max(...i.size) * .25)}
                    />
                )
            })}
            {config.STATS && <Perf deepAnalyze antialias={false} />}
        </CrashcatProvider>
    )
}



/*



function Floor({ hole }: { hole: number }) {
    const size: Tuple3 = [100, 2, 100]
    const d = createHoleDefinition(size, 1)
    const { world } = useCrashcat()
    const targetpos = useMemo(() => new Vector3(), [])
    const currpos = useMemo(() => new Vector3(), [])
    const [ref, getBody] = useBody(({ OBJECT_LAYER_MOVING }) => {
        const d = createHoleDefinition(size, hole + 5)

        return {
            shape: compound.create({
                children: d.map(([size, position]) => {
                    return {
                        position,
                        quaternion: [0, 0, 0, 1],
                        shape: box.create({
                            halfExtents: [size[0] / 2, size[1] / 2, size[2] / 2]
                        })
                    }
                })
            }),
            motionType: MotionType.KINEMATIC,
            objectLayer: OBJECT_LAYER_MOVING,
            position: [currpos.x, -size[1] / 2, currpos.z],
        }
    }, [hole])

    useFrame((state, delta) => {
        let body = getBody()

        if (!body) {
            return null
        }

        currpos.x = damp(currpos.x, targetpos.x, 3, delta)
        currpos.z = damp(currpos.z, targetpos.z, 3, delta)

        rigidBody.setPosition(world, body, [currpos.x, -size[1] / 2, currpos.z], true)
    })

    useFrame((state, delta) => {
        if (!ref.current) {
            return
        }

        for (let axis of ["x", "z"]) {
            ref.current.scale[axis] = damp(ref.current.scale[axis], hole + 5, 3, delta)
        }
    })

    return (
        <>
            <mesh
                onPointerMove={(e) => {
                    targetpos.set(e.point.x, -size[1] / 2, e.point.z)
                }}
                visible={false}
            >
                <boxGeometry args={[1000, .01, 1000]} />
                <meshLambertMaterial color="lightgray" />
            </mesh>
            <group
                ref={ref}
            >
                {d.map(([size, position], index) => {
                    return (
                        <mesh
                            ref={ref}
                            key={index}
                            position={position}
                            receiveShadow
                        >
                            <boxGeometry args={size} />
                            <meshLambertMaterial
                                dithering
                                color="lightgray"
                                emissive={"#fff"}
                                emissiveIntensity={.1}
                            />
                        </mesh>
                    )
                })}
            </group>
        </>
    )
}
    */