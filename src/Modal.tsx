import React from 'react';

interface Children {
  children: React.ReactNode;
}

interface Modal extends Children {
  id?: string;
}

export const Modal: React.FC<Modal> = ({
  children,
  id = 'modal',
}): JSX.Element => (
  <div
    className="modal fade"
    id={id}
    tabIndex={-1}
    aria-labelledby={id}
    aria-hidden="true"
  >
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content border-rad">{children}</div>
    </div>
  </div>
);

export const Title: React.FC<Children> = ({ children }): JSX.Element => (
  <h5>{children}</h5>
);

export const ModalHeader: React.FC<Children> = ({ children }): JSX.Element => (
  <div>{children}</div>
);

export const ModalBody: React.FC<Children> = ({ children }): JSX.Element => (
  <div>{children}</div>
);

export const ModalFooter: React.FC<Children> = ({ children }): JSX.Element => (
  <div>{children}</div>
);

interface ModalClose {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const ModalClose: React.FC<ModalClose> = ({
  children,
  onClick = () => {},
  className,
}): JSX.Element => (
  <button
    type="button"
    className={className}
    onClick={onClick}
    data-bs-dismiss="modal"
    aria-label="Close"
  >
    {children}
  </button>
);

interface OpenModalButton extends Children {
  id?: string;
  disabled?: boolean;
  className?: string;
}

export const OpenModalButton: React.FC<OpenModalButton> = ({
  children,
  id = 'open-modal-button',
  disabled,
  className,
}): JSX.Element => (
  <button
    type="button"
    disabled={disabled}
    data-bs-toggle="modal"
    data-bs-target={`#${id}`}
    className={className}
  >
    <span>{children}</span>
  </button>
);

interface ConfirmationModal extends Children {
  id?: string;
  title: string;
  confirmFun: () => void;
  confirmBtnLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModal> = ({
  id = 'exampleModal',
  title,
  confirmFun,
  confirmBtnLabel = 'Confirm',
  children,
}): JSX.Element => (
  <Modal id={id}>
    <ModalHeader>
      <Title>{title}</Title>
      <ModalClose />
    </ModalHeader>
    <ModalBody>{children}</ModalBody>
    <ModalFooter>
      <ModalClose onClick={confirmFun}>
        <span>{confirmBtnLabel}</span>
      </ModalClose>
    </ModalFooter>
  </Modal>
);

export default ConfirmationModal;
