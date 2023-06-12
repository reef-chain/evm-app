import Identicon from '@polkadot/react-identicon';
import { ReefAccount, toAddressShortDisplay } from '../../util';
import './styles.css'
import GradientButton from '../GradientButton/GradientButton';

interface Account {
  account: ReefAccount
  onClick?: () => void;
  isAccountSelected?:boolean
}

const Account = ({ account, onClick ,isAccountSelected}: Account): JSX.Element => (
  <div onClick={onClick} className={`accountBox`}>
    <div className='accountBox__identicon'>
      <Identicon value={account.address} size={64} theme="substrate" />
    </div>
    <div className='accountBox__details'>
      <div className='accountBox__details_name' >{ account.name }</div>
      <div className='accountBox__details_shortaddress'>
        <span>Native Address : </span>{ toAddressShortDisplay(account.address) }</div>
    </div>
    {isAccountSelected && (
      <div className='accountBox__end'>
        <GradientButton title={"Select"}/>
      </div>
    )}
  </div>
);

export default Account;
