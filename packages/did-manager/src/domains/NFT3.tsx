import { createContext } from '../utils/createContext'
import DataProvider, { useNFT3Data } from './NFT3Data'

import type { FC, PropsWithChildren } from 'react'
import type { NFT3Context, NFT3Theme } from '../types'
import type { NFT3DataServiceProps } from './NFT3Data'

type NFT3ServiceProps = {
  theme?: NFT3Theme
}
type NFT3ProviderProps = NFT3DataServiceProps & NFT3ServiceProps

const useNFT3Service = (props: NFT3ServiceProps): NFT3Context => {
  const {
    nft3Wallet,
    setAccount,

    account,
    client,
    didname,
    ready,
    identifier,
    connect,
    login,
    register,
    logout,
    checkLogin,
    eagerConnect,
    selectWallet,
  } = useNFT3Data()

  const theme = props.theme || 'light'
  const disconnect = async () => {
    nft3Wallet?.disconnect()
    setAccount(undefined)
    localStorage.removeItem('wallet')
  }

  return {
    account,
    client,
    didname,
    ready,
    theme,
    identifier,
    connect,
    login,
    register,
    logout,
    checkLogin,
    eagerConnect,
    disconnect,
    selectWallet,
  }
}

const { Provider: NFT3Provider, createUseContext } =
  createContext(useNFT3Service)

const Provider: FC<PropsWithChildren<NFT3ProviderProps>> = ({
  children,
  endpoint,
  theme,
}) => {
  return (
    <DataProvider endpoint={endpoint}>
      <NFT3Provider theme={theme}>{children}</NFT3Provider>
    </DataProvider>
  )
}
export const useNFT3 = createUseContext()
export default Provider
