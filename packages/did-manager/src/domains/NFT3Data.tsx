import { NFT3Client } from '@nft3sdk/client'
import { useState, useCallback, useMemo, useEffect } from 'react'
import EthereumWallet from '../libs/EthereumWallet'
import SolanaWallet from '../libs/SolanaWallet'
import type { WalletType, NetworkType, IWallet } from '../libs/types'
import type { LoginResult } from '../types'
import { createContext } from '../utils/createContext'

export type NFT3DataServiceProps = {
  endpoint: string
}
export const useNFT3DataService = ({ endpoint }: NFT3DataServiceProps) => {
  const [ready, setReady] = useState(false)
  const [account, setAccount] = useState<string>()
  const [wallet, setWallet] = useState<WalletType>()
  const [network, setNetwork] = useState<NetworkType>()
  const [nft3Wallet, setNft3Wallet] = useState<IWallet>()
  const [selectVisible, setSelectVisible] = useState(false)
  const [needRegister, setNeedRegister] = useState(false)
  const [identifier, setIdentifier] = useState<string>()

  const connect = useCallback(async () => {
    setSelectVisible(true)
  }, [])

  const client = useMemo(() => {
    return new NFT3Client(endpoint)
  }, [endpoint])

  const didname = useMemo(() => {
    if (!identifier) return undefined
    const arr = identifier.split(':')
    return arr[arr.length - 1] + '.isme'
  }, [identifier])

  useEffect(() => {
    const sessionKey = sessionStorage.getItem('sessionKey') || undefined
    if (nft3Wallet?.network === 'Ethereum') {
      const signer = nft3Wallet?.provider?.getSigner()
      client.did.config({
        network: 'ethereum',
        signer,
        signKey: sessionKey,
      })
    }
    if (nft3Wallet?.network === 'Solana') {
      client.did.config({
        network: 'solana',
        signer: nft3Wallet?.provider,
        signKey: sessionKey,
      })
    }
  }, [nft3Wallet, client])

  // DID register
  const register = useCallback(
    async (identifier: string) => {
      const result = await client.did?.register(identifier)
      setReady(true)
      return result.identifier
    },
    [client]
  )

  // DID login
  const login = useCallback(async () => {
    const info: LoginResult = {
      result: false,
      needRegister: false,
      identifier: undefined,
    }
    try {
      const result = await client.did.login()
      setIdentifier(result.identifier)
      if (client.did.signKey) {
        sessionStorage.setItem('sessionKey', client.did.signKey)
      }
      info.result = true
      info.identifier = result.identifier
    } catch (error: any) {
      if (error.code === 32033) {
        setNeedRegister(true)
        info.needRegister = true
      } else {
        console.trace(error)
        throw error
      }
    } finally {
      return info
    }
  }, [client])

  // DID logout
  const logout = useCallback(() => {
    setIdentifier(undefined)
    sessionStorage.removeItem('sessionKey')
  }, [])

  // check did login status
  const checkLogin = useCallback(async () => {
    try {
      if (!client.did || !client.did.signer) return
      const result = await client.did?.checkLogin()
      setIdentifier(result.identifier)
      return result.identifier
    } catch (error) {
      console.trace(error)
    } finally {
      setReady(true)
    }
  }, [client])

  useEffect(() => {
    if (account) checkLogin()
  }, [checkLogin, account])

  // select a wallet
  const selectWallet = async (type: WalletType, silent = false) => {
    let wallet: IWallet
    if (type === 'MetaMask') {
      wallet = new EthereumWallet('MetaMask')
    } else if (type === 'Phantom') {
      wallet = new SolanaWallet('Phantom')
    } else {
      throw new Error('Invalid wallet type')
    }
    await wallet.connect(silent)
    localStorage.setItem('wallet', type)
    wallet.onAccountChanged((accounts: string[]) => {
      setAccount(accounts[0] || undefined)
    })
    wallet.onDisconnect(() => {
      setAccount(undefined)
    })
    setWallet(type)
    setNft3Wallet(wallet)
    setAccount(wallet.account || undefined)
  }

  // eager connect wallet
  const eagerConnect = useCallback(async () => {
    const wallet = localStorage.getItem('wallet') as WalletType
    if (wallet === 'Phantom' || wallet === 'MetaMask') {
      selectWallet(wallet, true)
    }
  }, [])

  return {
    wallet,
    network,
    nft3Wallet,
    account,
    selectVisible,
    client,
    didname,
    identifier,
    ready,
    needRegister,
    selectWallet,
    setAccount,
    setSelectVisible,
    setNeedRegister,
    setNft3Wallet,
    connect,
    login,
    logout,
    checkLogin,
    register,
    setWallet,
    setNetwork,
    eagerConnect,
  }
}

const { Provider: NFT3DataProvider, createUseContext } =
  createContext(useNFT3DataService)

export const useNFT3Data = createUseContext()
export default NFT3DataProvider
