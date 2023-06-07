import Identicon from '@polkadot/react-identicon';
import { ReefAccount, toAddressShortDisplay } from './util';

interface Account {
  account: ReefAccount
  onClick?: () => void;
}

const Account = ({ account, onClick }: Account): JSX.Element => (
  <div onClick={onClick}>
    <div>
      <Identicon value={account.address} size={44} theme="substrate" />
    </div>
    <div>
      <div>{ account.name }</div>
      <div>{ toAddressShortDisplay(account.address) }</div>
    </div>
  </div>
);

export default Account;
