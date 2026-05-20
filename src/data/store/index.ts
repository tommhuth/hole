import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"

interface Store {
    state: string
}

const store = create(
    subscribeWithSelector<Store>(() => ({
        state: "hello"
    }))
)
const useStore = store

export { store, useStore }