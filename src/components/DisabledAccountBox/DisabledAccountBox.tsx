import Identicon from '@polkadot/react-identicon';
import { ReefAccount, toAddressShortDisplay } from '../../util';
import './styles.css'

interface Account {
  account: ReefAccount
}

const DisabledAccountBox = ({ account}: Account): JSX.Element => (
  <div className={`accountBoxWithOverlay`}>
    <div className="accountBoxOverlay"></div>
    <div className={`accountBox`}>
      <div className='accountBox__identicon'>
        <Identicon value={account.address} size={64} theme="substrate" />
      </div>
      <div className='accountBox__details'>
        <div className='accountBox__details_name' >{ account.name }</div>
        <div className='accountBox__details_shortaddress'>
          <span>Native Address : </span>{ toAddressShortDisplay(account.address) }
        </div>
        <div className='accountBox__details_shortaddress'>
          <span>EVM Address : </span>{ toAddressShortDisplay(account.evmAddress) }
        </div>
      </div>
      <div className='accountBox__end'>
        EVM Claimed
      </div>
    </div>
  </div>
);

export default DisabledAccountBox;
