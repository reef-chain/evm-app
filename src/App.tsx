import { useEffect, useRef, useState } from 'react';
import { decodeAddress } from '@polkadot/util-crypto';
import { web3FromAddress } from '@reef-defi/extension-dapp';
import { InjectedAccount, ReefSignerResponse, ReefVM } from "@reef-defi/extension-inject/types";
import { Signer } from '@reef-defi/evm-provider';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { ReefAccount, getReefExtension, getSignersWithEnoughBalance, hasBalanceForBinding, 
  accountToReefAccount, MIN_BALANCE, toAddressShortDisplay, captureError, subscribeToBalance } from './util';
import { OpenModalButton } from './Modal';
import Account from './Account';
import { AccountListModal } from './AccountListModal';

interface BindStatus {
  inProgress: boolean;
  message?: string;
}

const App = (): JSX.Element => {
  const [accounts, setAccounts] = useState<ReefAccount[]>([]);
  const [accountsWithEnoughBalance, setAccountsWithEnoughBalance] = useState<ReefAccount[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<Signer>();
  const [selectedReefSigner, setSelectedReefSigner] = useState<ReefAccount>();
  const [transferBalanceFrom, setTransferBalanceFrom] = useState<ReefAccount | undefined>();
  const [bindStatus, setBindStatus] = useState<BindStatus>({ inProgress: false });
  const selectedReefSignerRef = useRef(selectedReefSigner);
  let unsubBalance = () => {};

  useEffect(() => {
    getAccounts();
  }, []);

  useEffect(() => {
    if (selectedSigner) {
      const account = accounts.find(
        (account: ReefAccount) => account.address === selectedSigner._substrateAddress
      );
      if (account) {
        account.signer = selectedSigner;
        setSelectedReefSigner(account);
        selectedReefSignerRef.current = account;
        return;
      }
    } 
    setSelectedReefSigner(undefined);
    selectedReefSignerRef.current = undefined;
  }, [selectedSigner, accounts]);

  useEffect(() => {
    if (selectedReefSigner) {
      const fromAccounts = getSignersWithEnoughBalance(accounts, selectedReefSigner);
      setAccountsWithEnoughBalance(fromAccounts);
      setTransferBalanceFrom(fromAccounts[0]);
    } else {
      setAccountsWithEnoughBalance([]);
      setTransferBalanceFrom(undefined);
    }
  }, [accounts, selectedReefSigner]);

  const getAccounts = async (): Promise<any> => {
    try {
      let reefExtension = await getReefExtension('Reef EVM binding');
      if (!reefExtension) {
        // If first attempt failed, wait 1 second and try again
        await new Promise( resolve => setTimeout(resolve, 1000));
        reefExtension = await getReefExtension('Reef EVM binding');
      }
      if (!reefExtension) {
        throw new Error('Install Reef Chain Wallet extension for Chrome or Firefox. See docs.reef.io');
      }

      const provider = await reefExtension.reefProvider.getNetworkProvider();
      const accounts = await reefExtension.accounts.get();
        const _reefAccounts = await Promise.all(accounts.map(async (account: InjectedAccount) => 
        accountToReefAccount(account, provider)
      ));
      setAccounts(_reefAccounts);

      reefExtension.accounts.subscribe(async (accounts: InjectedAccount[]) => {
        console.log("accounts cb =", accounts);
        const _accounts = await Promise.all(accounts.map(async (account: InjectedAccount) => 
          accountToReefAccount(account, provider)
        ));
        setAccounts(_accounts);
      });

      reefExtension.reefSigner.subscribeSelectedSigner(async (sig:ReefSignerResponse) => {
        console.log("signer cb =", sig);
        setSelectedSigner(sig.data);
        subscribeBalance(sig.data);
      }, ReefVM.NATIVE);

    } catch (err: any) {
      console.error(err);
    }
  }

  const subscribeBalance = async (signer: Signer | undefined): Promise<void> => {
    unsubBalance();
    if (signer) {
      unsubBalance = await subscribeToBalance(signer, async (balFree: BigInt) => {
        if (selectedReefSignerRef.current?.address === signer._substrateAddress) {
          setSelectedReefSigner({ ...selectedReefSignerRef.current, balance: balFree });
        }
      });
    }
  }

  const transfer = (from: ReefAccount, to: ReefAccount) => async (): Promise<void> => {
    const fromInjector = await web3FromAddress(from.address);
    const api = to.signer!.provider.api;
    await api.isReadyOrError;

    api.tx.balances
      .transfer(to.address, ethers.parseEther(MIN_BALANCE))
      .signAndSend(from.address, { signer: fromInjector.signer }, (status) => { 
        console.log("status =", status)
        const err = captureError(status.events);
        if (err) {
          console.log("err =", err)
        } 
      })
  }

  const bindEvmAddress = async (reefAccount: ReefAccount): Promise<void> => {
    setBindStatus({ inProgress: true, message: 'Sign message with an EVM wallet (e.g. Metamask, Trust, Phantom...).' });

    const publicKey = decodeAddress(reefAccount.address);
    const message = 'reef evm:' + Buffer.from(publicKey).toString('hex');

    const { evmAddress, signature, error } = await signMessage(message);
    if (error) {
      setBindStatus({ inProgress: false, message: error });
      return;
    } else if (!evmAddress || !signature) {
      setBindStatus({ inProgress: false, message: 'Failed to sign message.' });
      return;
    }
    
    setBindStatus({ inProgress: true, message: `Send transaction with Reef extension to bind with ${evmAddress}.` });
    
    try {
      await reefAccount.signer!.provider.api.tx.evmAccounts.claimAccount(evmAddress, signature)
        .signAndSend(reefAccount.address);
      setBindStatus({ inProgress: true, message: `Binding to address ${evmAddress}.` });
    } catch (err) {
      console.error(err);
      setBindStatus({ inProgress: false, message: 'Failed to send transaction.' });
    }
  }

  const signMessage = async (message: string): Promise<{evmAddress?: string, signature?: string, error?: string}> => {
    // @ts-ignore
    const ethereumProvider = window.ethereum;
    if (typeof ethereumProvider === 'undefined') return { error: 'No EVM wallet found.' }

    try {
        const evmProvider = new ethers.BrowserProvider(ethereumProvider);
        const accounts = await ethereumProvider.request({ method: 'eth_requestAccounts' })
          .catch((err: any) => {
            if (err.code === 4001) {
              return { error: 'Please connect to your EVM wallet.' };
            } else {
              console.error(err);
              return { error: 'Failed to connect to EVM wallet.' };
            }
          });
        const account = accounts[0];
        const evmSigner = await evmProvider.getSigner();
        const signature = await evmSigner.signMessage(message);
        return { evmAddress: account, signature };
    } catch (err) {
        console.error(err);
        return { error: "Failed to sign message" };
    }
  }

  return (
    <div>
      <h1>Reef EVM</h1>

      <div>
        { selectedReefSigner ? (
          <div>
            <Account account={selectedReefSigner} />
            { selectedReefSigner.isEvmClaimed ? (
              <div>
              {/* Claimed */}
                <p>
                  {' '}
                  Successfully connected to Ethereum VM address&nbsp;
                  <b>{toAddressShortDisplay(selectedReefSigner.evmAddress)}</b>
                  .
                  <br />
                </p>
              </div>
            ) : (
              <div>
              {/* No claimed */}
                { bindStatus.inProgress ? (
                  <div>
                  {/* Bind in progress */}
                    <p>Binding in progress...</p>
                    <p>{ bindStatus.message }</p>
                  </div>
                ) : (
                  <>
                  {/* Bind not in progress */}
                  { hasBalanceForBinding(selectedReefSigner.balance) ? (
                    <div>
                    {/* Bind */}
                      <button onClick={() => bindEvmAddress(selectedReefSigner)}>Bind</button>
                      { bindStatus.message && 
                        <p>{ bindStatus.message }</p> 
                      }
                    </div>
                  ) : (
                    <>
                    {/* Not enough balance */}
                    { transferBalanceFrom ?
                      <div>
                        <p>
                          <b>
                            ~{ MIN_BALANCE }
                          </b>
                          &nbsp; is needed for transaction fee.
                          <br />
                          <br />
          
                          Coins will be transferred from account:&nbsp;
                            <OpenModalButton id="selectMyAddress">
                              <Account account={ transferBalanceFrom } />
                            </OpenModalButton>
                        </p>
                        <AccountListModal
                          accounts={accountsWithEnoughBalance}
                          id="selectMyAddress"
                          selectAccount={(_: any, selected: ReefAccount): void => setTransferBalanceFrom(selected)}
                          title="Select account"
                        />
                        <button onClick={transfer( transferBalanceFrom, selectedReefSigner )}>Transfer</button>
                      </div>
                      : <p>Not enough REEF in account for connect EVM address transaction fee.</p>
                    }
                    </>
                  )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* No account selected */}
            <div>No account selected.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;