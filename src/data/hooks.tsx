import { useCallback, useEffect, useMemo, useRef } from "react"
import { IUniform, WebGLRenderer, WebGLProgramParametersWithUniforms } from "three"
import { glsl } from "./utils"
import random from "@huth/random"

export const useAnimationFrame = (callback: (delta: number) => void) => {
    // Use useRef for mutable variables that we want to persist
    // without triggering a re-render on their change
    const requestRef = useRef<number>()
    const previousTimeRef = useRef<number>()

    const animate = (time: number) => {
        if (previousTimeRef.current != undefined) {
            const deltaTime = time - previousTimeRef.current

            callback(deltaTime)
        }
        previousTimeRef.current = time
        requestRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate)

        return () => cancelAnimationFrame(requestRef.current as number)
    })
}


export interface ShaderPart {
    head?: string
    main?: string
}

type UniformsRecord = Record<string, IUniform>

type ReturnUniformsRecord<T extends Record<string, IUniform> | undefined> = T extends UniformsRecord
    ? {
        [K in keyof T]: {
            value: T[K]["value"];
            needsUpdate?: boolean;
        };
    }
    : undefined;

export interface UseShaderParams<T extends UniformsRecord> {
    uniforms?: T | undefined
    shared?: string
    vertex?: ShaderPart
    fragment?: ShaderPart
}

interface ReturnUseShader<T extends UniformsRecord | undefined> {
    uniforms: ReturnUniformsRecord<T>
    onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: WebGLRenderer) => void
    customProgramCacheKey: () => string
}

export function useShader<T extends UniformsRecord>({
    uniforms: incomingUniforms,
    shared = "",
    vertex = {
        head: "",
        main: "",
    },
    fragment = {
        head: "",
        main: "",
    }
}: UseShaderParams<T>): ReturnUseShader<T> {
    const uniforms = useMemo(() => {
        return incomingUniforms || {}
    }, [])
    const id = useMemo(() => random.id(), [])
    const customProgramCacheKey = useCallback(() => id, [id])
    const onBeforeCompile = useCallback((shader: WebGLProgramParametersWithUniforms) => {
        shader.uniforms = {
            ...shader.uniforms,
            ...uniforms
        }

        shader.vertexShader = shader.vertexShader.replace("#include <common>", glsl`
            #include <common>
            
            ${shared}
            ${vertex.head}  
        `)
        shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", glsl`
            #include <begin_vertex>
    
            ${vertex?.main}  
        `)
        shader.fragmentShader = shader.fragmentShader.replace("#include <common>", glsl`
            #include <common>

            ${shared}
            ${fragment?.head}  
        `)
        shader.fragmentShader = shader.fragmentShader.replace("#include <dithering_fragment>", glsl`
            #include <dithering_fragment> 

            ${fragment?.main}  
        `)
    }, [vertex?.head, vertex?.main, fragment?.head, fragment?.main])

    return {
        // aaah why is this cast neccessary ts
        uniforms: uniforms as ReturnUniformsRecord<T>,
        customProgramCacheKey,
        onBeforeCompile
    }
} 