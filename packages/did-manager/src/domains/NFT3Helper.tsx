import type { FC } from 'react'
import { Fragment } from 'react'

import { useNFT3Data } from './NFT3Data'
import NFT3Register from '../components/NFT3Register'
import WalletSelect from '../components/WalletSelect'

const NFT3Hepler: FC = () => {
  const {
    selectWallet,
    setSelectVisible,
    selectVisible,
    needRegister,
    setNeedRegister,
  } = useNFT3Data()

  return (
    <Fragment>
      <WalletSelect
        visible={selectVisible}
        onClose={(wallet) => {
          if (wallet) selectWallet(wallet)
          setSelectVisible(false)
        }}
      />
      <NFT3Register
        visible={needRegister}
        onClose={() => setNeedRegister(false)}
      />
    </Fragment>
  )
}

export default NFT3Hepler
