import { useRef, useState } from "react";
import { CSSTransition } from 'react-transition-group';
import './AccountSelector.css'; // Create a CSS file for styling
import { ReefAccount } from "../../util";
import Account from "../AccountBox/AccountBox";
import DisabledAccountBox from "../DisabledAccountBox/DisabledAccountBox";
import SwitchNetworkInfo from "../SwitchNetworkInfo";

export interface Props {
  isOpen: boolean,
  accounts?: ReefAccount[],
  selectedAccount?: ReefAccount | null | undefined,
  onClose: (...args: any[]) => any,
  onSelect: (...args: any[]) => any,
}

const AccountSelector = ({
  isOpen,
  accounts,
  selectedAccount,
  onClose,
  onSelect,
}: Props): JSX.Element => {
  const wrapper = useRef(null)

  const opened = () => {
    document.body.style.overflow = "hidden";
  }

  const closed = () => {
    document.body.style.overflow = "";
  }

  return (
    <div className={`uik-account-selector ${isOpen ? 'open' : ''}`}>
      <CSSTransition
        in={isOpen}
        className='uik-account-selector__overlay'
        nodeRef={wrapper}
        timeout={500}
        unmountOnExit
        onEnter={opened}
        onExited={closed}
      >
        <div
          ref={wrapper}
          className={`uik-account-selector__wrapper ${isOpen ? 'open' : ''}`}
        >
          <button
            className="uik-account-selector__close-button"
            onClick={onClose}
          >
            <img src="/close.png" alt="" style={{maxWidth:65}} />
          </button>
          <div style={{position:'absolute',top:'50px'}}>
          <div className="account-selector--title">Accounts</div>
          <SwitchNetworkInfo/>
          <div className="uik-account-selector__content">
          <div style={{display:'flex',flexDirection:'column',minWidth:'85vw',overflowY:'auto', minHeight:"180vh",justifyContent:'start',alignItems:'center'}}>
          {accounts?.map(val=>
          
           val.isEvmClaimed?<DisabledAccountBox key={val.address} account={val}/>: <Account isAccountSelected ={false} account={val} key={val.address} onClick={()=>{onSelect(val);
            onClose()
            }} />
          )}
          </div>
          </div>
          </div>
        </div>
      </CSSTransition>
    </div>
  )
}

export default AccountSelector;
