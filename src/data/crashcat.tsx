import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import { debugRenderer } from "crashcat/three"
import {
    addBroadphaseLayer,
    addObjectLayer,
    createWorld,
    createWorldSettings,
    enableCollision,
    rigidBody,
    updateWorld,
    World,
    WorldSettings,
} from "crashcat"
import { merge } from "object-deep-merge"

import { useFrame, useThree } from "@react-three/fiber"
import { Object3D } from "three"
import { DebugRendererOptions } from "node_modules/crashcat/dist/three/debug-renderer"

const context = createContext<Context | null>(null)

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;

interface Context {
    world: World
    BROADPHASE_LAYER_MOVING: number
    BROADPHASE_LAYER_NOT_MOVING: number
    OBJECT_LAYER_MOVING: number
    OBJECT_LAYER_NOT_MOVING: number
}

interface CrashcatProviderProps {
    children: ReactNode
    debug?: boolean
    debugSettings?: DeepPartial<DebugRendererOptions>
    settings?: DeepPartial<WorldSettings>
}

export function CrashcatProvider({
    children,
    debug,
    debugSettings = {},
    settings = {}
}: CrashcatProviderProps) {
    let { scene } = useThree()
    let value = useMemo(() => {
        let worldSettings: WorldSettings = merge({
            ...createWorldSettings(),
            gravity: settings.gravity,
        }, settings)
        const BROADPHASE_LAYER_MOVING = addBroadphaseLayer(worldSettings)
        const BROADPHASE_LAYER_NOT_MOVING = addBroadphaseLayer(worldSettings)
        const OBJECT_LAYER_MOVING = addObjectLayer(worldSettings, BROADPHASE_LAYER_MOVING)
        const OBJECT_LAYER_NOT_MOVING = addObjectLayer(worldSettings, BROADPHASE_LAYER_NOT_MOVING)

        enableCollision(worldSettings, OBJECT_LAYER_MOVING, OBJECT_LAYER_NOT_MOVING)
        enableCollision(worldSettings, OBJECT_LAYER_MOVING, OBJECT_LAYER_MOVING)

        const options: DebugRendererOptions = merge(debugRenderer.createDefaultOptions(), {
            ...debugSettings,
            bodies: {
                wireframe: true,
                ...debugSettings.bodies
            }
        })

        return {
            world: createWorld(worldSettings),
            settings: worldSettings,
            BROADPHASE_LAYER_MOVING,
            BROADPHASE_LAYER_NOT_MOVING,
            OBJECT_LAYER_MOVING,
            OBJECT_LAYER_NOT_MOVING,
            debugRenderer: debugRenderer.init(options),
        }
    }, [])

    useEffect(() => {
        if (debug) {
            scene.add(value.debugRenderer.object3d)
        }
    }, [value])

    useFrame((state, delta) => {
        updateWorld(value.world, undefined, Math.min(delta, 1 / 24))

        if (debug) {
            debugRenderer.update(value.debugRenderer, value.world)
        }
    }, -1)

    return (
        <context.Provider value={value}>
            {children}
        </context.Provider>
    )
}

export function useCrashcat() {
    let value = useContext(context)

    if (!value) {
        throw new Error("missing context")
    }

    return value
}

export function useBody(
    fn: (val: Context) => rigidBody.RigidBodySettings,
    deps: unknown[] = [],
) {
    const { world, ...rest } = useCrashcat()
    const { id } = useMemo(() => {
        return rigidBody.create(world, fn({ world, ...rest }))
    }, deps)
    const ref = useRef<Object3D>(null)
    const getBody = useCallback(() => {
        return rigidBody.get(world, id)
    }, [world, id])

    useEffect(() => {
        return () => {
            let body = getBody()

            if (body) {
                rigidBody.remove(world, body)
            }
        }
    }, [...deps, id])

    useFrame(() => {
        let body = getBody()

        if (!body || !ref.current) {
            return
        }

        ref.current.quaternion.set(...body.quaternion)
        ref.current.position.set(...body.position)
    })

    return [ref, getBody] as const
}