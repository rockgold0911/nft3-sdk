import { id } from '@ethersproject/hash'
import { sha256 } from '@ethersproject/sha2'
import { joinSignature } from '@ethersproject/bytes'
import { toUtf8Bytes } from '@ethersproject/strings'
import { Signer } from '@ethersproject/abstract-signer'
import { SigningKey } from '@ethersproject/signing-key'

import NFT3Client from './NFT3Client'
import EthereumWallet from '../wallets/EthereumWallet'
import SolanaWallet from '../wallets/SolanaWallet'
import { NetworkType, NFT3Wallet } from '../types/model'

export interface DIDInfo {
  addresses: string[]
  created_at: number
  ctrl_keys: string[]
  did: string
  updated_at: number
}

const SessionExpires = 72 * 3600
const SignExpires = 300

export default class NFT3DID {
  private client: NFT3Client
  private wallet?: NFT3Wallet
  public signKey?: string
  public signer?: SigningKey
  public identifier = ''

  constructor(client: NFT3Client) {
    this.client = client
  }

  config(options: {
    network: NetworkType
    privateKey?: string
    signKey?: string
    signer?: Signer
  }) {
    this.signKey = options.signKey
    if (options.network === 'ethereum') {
      this.wallet = new EthereumWallet({
        network: options.network,
        privateKey: options.privateKey,
        signer: options.signer
      })
    }
    if (options.network === 'solana') {
      this.wallet = new SolanaWallet({
        network: options.network,
        privateKey: options.privateKey,
        signer: options.signer
      })
    }
    if (this.signKey) {
      this.signer = new SigningKey(this.signKey)
    }
  }

  /**
   * create session signer
   */
  async init() {
    if (this.signKey) return this.signKey
    const message = 'Allow this account to control your did'
    const { signatureBuffer } = await this.wallet?.signMessage(message)
    if (signatureBuffer) {
      this.signKey = sha256(signatureBuffer)
      this.signer = new SigningKey(this.signKey)
      return this.signKey
    }
  }

  async auth() {
    this.init()
    const { result, identifier } = await this.checkLogin()
    if (result === true) return identifier
    else {
      const { result, identifier } = await this.login()
      if (result === true) return identifier
    }
    return undefined
  }

  /**
   * session key signature
   * @param message
   * @returns
   */
  sign(message: string) {
    const msghash = id(message)
    const signature = joinSignature(this.signer.signDigest(msghash))
    return {
      msghash,
      signature
    }
  }

  /**
   * format params for signMessage
   * @param message
   * @returns
   */
  private formatMessage(message: Record<string, any>) {
    const keys = Object.keys(message).sort()
    const items: string[] = []
    for (const key of keys) {
      items.push(`${key}=${message[key]}`)
    }
    return items.join('&')
  }

  /**
   * sign message add send request
   * @param method
   * @param params
   * @returns
   */
  async send<T = any>(
    method: string,
    params: {
      msg: Record<string, any>
      [propName: string]: any
    }
  ) {
    if (!this.signer) {
      throw new Error('DID need auth first')
    }
    const msg = {
      ...params.msg,
      sign_expired_at: Math.trunc(Date.now() / 1000 + SignExpires)
    }
    const message = this.formatMessage(msg)
    const length = toUtf8Bytes(message).length
    const str = `${method}:\n${length}${message}`
    const { signature } = this.sign(str)
    params.msg = msg
    params.session_sign = signature
    return this.client.send<T>(method, params)
  }

  private async ctrlSign(params: {
    msg: Record<string, any>
    [propName: string]: any
  }) {
    params.msg.sign_expired_at = Math.trunc(Date.now() / 1000 + SignExpires)
    const message = this.formatMessage(params.msg)
    const { signature, publicKey } = await this.wallet.signMessage(message)
    params.ctrl_key = `${this.wallet.network}:${publicKey}`
    params.ctrl_sign = signature
  }

  /**
   * register did
   * @param identifier
   * @returns
   */
  async register(identifier: string) {
    await this.init()
    const params = {
      msg: {
        identifier,
        session_key: this.signer.publicKey,
        session_key_expired_at: Math.trunc(Date.now() / 1000 + SessionExpires)
      }
    }
    await this.ctrlSign(params)
    const result = await this.client.send<string>('nft3_did_register', params)
    return {
      result: true,
      identifier: result
    }
  }

  /**
   * login did
   */
  async login() {
    try {
      await this.init()
      const params = {
        msg: {
          session_key: this.signer.publicKey,
          session_key_expired_at: Math.trunc(Date.now() / 1000 + SessionExpires)
        }
      }
      await this.ctrlSign(params)
      const result = await this.client.send<string>('nft3_did_login', params)
      this.identifier = result
      return {
        result: true,
        identifier: result
      }
    } catch (error) {
      console.trace(error)
      return {
        result: false,
        identifier: undefined
      }
    }
  }

  /**
   * DID logout
   */
  async logout() {
    this.signKey = undefined
    this.signer = undefined
  }

  /**
   * check did login status
   * @returns
   */
  async checkLogin() {
    try {
      const result = await this.send<string>('nft3_did_check_login', {
        msg: {}
      })
      this.identifier = result
      return {
        result: true,
        identifier: result
      }
    } catch (error) {
      return {
        result: false
      }
    }
  }

  /**
   * add current wallet as ctrl key
   * @returns
   */
  async addKey() {
    const subParams: any = { msg: {} }
    await this.ctrlSign(subParams)
    const params = {
      msg: {
        msg: JSON.stringify(subParams.msg),
        new_ctrl_key: subParams.ctrl_key,
        new_ctrl_sign: subParams.ctrl_sign
      }
    }
    await this.send('nft3_did_keys_add', params)
    return {
      result: true
    }
  }

  /**
   * remove current wallet from ctrl keys
   * @returns
   */
  async removeKey() {
    const subParams: any = { msg: {} }
    await this.ctrlSign(subParams)
    const params = {
      msg: {
        msg: JSON.stringify(subParams.msg),
        remove_ctrl_key: subParams.ctrl_key,
        remove_ctrl_sign: subParams.ctrl_sign
      }
    }
    await this.send('nft3_did_keys_remove', params)
    return {
      result: true
    }
  }

  /**
   * list all of the crypto accounts of current did
   * @returns
   */
  async accounts() {
    const result = await this.send<string[]>('nft3_did_address', {
      msg: {}
    })
    return result
  }

  /**
   * get did detail info
   * @param identifier
   */
  async info(identifier?: string) {
    identifier = identifier || this.client.did.identifier
    const result = await this.client.send<DIDInfo>('nft3_did_info', {
      did: identifier
    })
    return result
  }

  /**
   * conver didname to identifier
   * @param didname
   * @returns identifier
   */
  convertName(didname: string) {
    return `did:nft3:${didname?.replace(/\.isme$/, '')}`
  }
}
