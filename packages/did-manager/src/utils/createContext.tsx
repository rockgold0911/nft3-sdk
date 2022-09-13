import type { FC, PropsWithChildren } from 'react'
import { createContext as c, useContext } from 'react'

export function createContext<T, P = any>(
  fn: (props: P) => T,
  initialValue: T | undefined = undefined
) {
  const Context = c(initialValue as T)
  const Provider: FC<PropsWithChildren<P>> = ({ children, ...props }) => (
    <Context.Provider value={fn(props as any)}>{children}</Context.Provider>
  )
  const createUseContext = () => () => useContext(Context)
  return {
    Context,
    Provider,
    createUseContext,
  }
}
