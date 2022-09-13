import type { NFT3Client } from '@nft3sdk/client'
import type { WalletType } from '../libs/types'

export type NFT3Theme = 'light' | 'dark'

export interface LoginResult {
  result: boolean
  needRegister: boolean
  identifier?: string
}

export interface NFT3Context {
  account?: string
  client: NFT3Client
  didname?: string
  ready?: boolean
  theme: NFT3Theme
  identifier?: string
  connect: () => void
  login: () => Promise<LoginResult>
  register: (didname: string) => Promise<string>
  logout: () => void
  checkLogin: () => Promise<string | undefined>
  eagerConnect: () => void
  disconnect: () => void
  selectWallet: (wallet: WalletType) => void
}
