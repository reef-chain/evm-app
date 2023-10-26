import { useRef, useState } from "react";
import { CSSTransition } from 'react-transition-group';
import './AccountSelector.css'; // Create a CSS file for styling

export type Account = {
  name?: string,
  address: string,
  evmAddress?: string,
  source?: string,
  isEvmClaimed?: boolean,
}

export interface Props {
  isOpen: boolean,
  accounts?: Account[],
  selectedAccount?: Account | null | undefined,
  onClose?: (...args: any[]) => any,
  onSelect?: (...args: any[]) => any,
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
            Close
          </button>
          asdfs
        </div>
      </CSSTransition>
    </div>
  )
}

export default AccountSelector;
