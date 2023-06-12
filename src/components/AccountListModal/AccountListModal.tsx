import { ReactElement } from 'react';
import { ReefAccount } from '../../util';
import { Modal, ModalHeader, Title } from '../../Modal';
import Account from '../../Account';

interface AccountListModal {
  id: string;
  accounts: ReefAccount[];
  selectAccount: (index: number, signer: ReefAccount) => void;
  backButtonModalId?: string;
  title?: string | ReactElement;
}

export const AccountListModal = ({
  id,
  accounts,
  selectAccount,
  backButtonModalId,
  title = 'Select account',
}: AccountListModal): JSX.Element => {
  const accountsView = accounts.map((acc, index) => (
    <Account key={acc.address} account={acc} onClick={() => selectAccount(index, acc)}/>
  ));

  return (
    <Modal id={id}>
      <ModalHeader>
        {!!backButtonModalId && (
          <button
            type="button"
            data-bs-target={backButtonModalId}
            data-bs-toggle="modal"
            data-bs-dismiss="modal"
          >
            {"<<"}
          </button>
        )}
        <Title>{title}</Title>
        <button
          type="button"
          data-bs-dismiss="modal"
        >
          X
        </button>
      </ModalHeader>
      <div>
        <ul style={{ height: '300px' }}>
          {accountsView}
        </ul>
      </div>
    </Modal>
  );
};
