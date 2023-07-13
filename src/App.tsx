import {useEffect, useRef, useState} from 'react';
import {decodeAddress} from '@polkadot/util-crypto';
import {web3FromAddress} from '@reef-defi/extension-dapp';
import {InjectedAccount, ReefSignerResponse, ReefVM} from "@reef-defi/extension-inject/types";
import {Signer} from '@reef-defi/evm-provider';
import {ethers} from 'ethers';
import {Buffer} from 'buffer';
import {
  accountToReefAccount,
  captureError,
  getReefExtension,
  getSignersWithEnoughBalance,
  hasBalanceForBinding,
  MIN_BALANCE,
  queryEvmAddress,
  ReefAccount,
  subscribeToBalance,
  toAddressShortDisplay
} from './util';
import Account from './components/AccountBox/AccountBox';
import Loader from './components/Loader/Loader';
import GradientButton from './components/GradientButton/GradientButton';
import Navbar from './components/Navbar/Navbar';
import TextButton from './components/TextButton/TextButton';
import { AccountListModal } from './components/AccountListModal/AccountListModal';

interface Status {
  inProgress: boolean;
  message?: string;
}

const App = (): JSX.Element => {
  const [accounts, setAccounts] = useState<ReefAccount[]>([]);
  const [displayModal, setDisplayModal] = useState<boolean>(false);
  const [accountsWithEnoughBalance, setAccountsWithEnoughBalance] = useState<ReefAccount[]>([]);
  const [selectedSigner, setSelectedSigner] = useState<Signer>();
  const [selectedReefSigner, setSelectedReefSigner] = useState<ReefAccount>();
  const [transferBalanceFrom, setTransferBalanceFrom] = useState<ReefAccount | undefined>();
  const [status, setStatus] = useState<Status>({ inProgress: false });
  const selectedReefSignerRef = useRef(selectedReefSigner);
  let unsubBalance = () => {};

  useEffect(() => {
    getAccounts();
  }, []);

  // Update selectedReefSigner
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

  // Update transferBalanceFrom and accountsWithEnoughBalance
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

  // Get accounts from Reef extension and subscribe to changes
  const getAccounts = async (): Promise<any> => {
    setStatus({ inProgress: true, message: 'Loading accounts...' });
    try {
      let reefExtension = await getReefExtension('Reef EVM connection');
      if (!reefExtension) {
        // If first attempt failed, wait .5 seconds and try again
        await new Promise( resolve => setTimeout(resolve, 500));
        reefExtension = await getReefExtension('Reef EVM connection');
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
      setStatus({ inProgress: false });

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

  // Subscribe to changes in selectedReefSigner balance
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

  // Transfer Reef from one account to another
  const transfer = (from: ReefAccount, to: ReefAccount) => async (): Promise<void> => {
    setStatus({ inProgress: true, message: 'Transfer in progress...' });
    const fromInjector = await web3FromAddress(from.address);
    const api = to.signer!.provider.api;
    await api.isReadyOrError;

    try {
      await api.tx.balances
        .transfer(to.address, ethers.parseEther(MIN_BALANCE))
        .signAndSend(from.address, { signer: fromInjector.signer },
          (status: any) => {
            console.log("status =", status)
            const err = captureError(status.events);
            if (err) {
              console.log("transfer error", err);
              setStatus({ inProgress: false, message: 'Error transferring Reef.' });
            }
            if (status.dispatchError) {
              console.log("transfer dispatch error", status.dispatchError.toString());
              setStatus({ inProgress: false, message: 'Error transferring Reef.' });
            }
            if (status.status.isInBlock) {
              console.log("Included at block hash", status.status.asInBlock.toHex());
              setStatus({ inProgress: false });
            }
            if (status.status.isFinalized) {
              console.log("Finalized block hash", status.status.asFinalized.toHex());
            }
          },
      );
    } catch (err) {
      console.log("__error__", err);
      setStatus({ inProgress: false, message: 'Error transferring Reef.' });
    }
  }

  // Bind EVM address
  const bindEvmAddress = async (reefAccount: ReefAccount): Promise<void> => {
    setStatus({ inProgress: true, message: 'Sign message with an EVM wallet extension (e.g. Metamask, Trust, Phantom...).'});

    const publicKey = decodeAddress(reefAccount.address);
    const message = 'reef evm:' + Buffer.from(publicKey).toString('hex');

    const { evmAddress, signature, error } = await signMessage(message);
    if (error) {
      setStatus({ inProgress: false, message: error });
      return;
    } else if (!evmAddress || !signature) {
      setStatus({ inProgress: false, message: 'Failed to sign message.' });
      return;
    }

    setStatus({ inProgress: true, message: `Send transaction with Reef extension to connect with ${evmAddress}.` });

    try {
      await reefAccount.signer!.provider.api.tx.evmAccounts.claimAccount(evmAddress, signature)
        .signAndSend(reefAccount.address,
          (status: any) => {
            console.log("status =", status)
            const err = captureError(status.events);
            if (err) {
              console.log("connection error", err);
              setStatus({ inProgress: false, message: 'Failed to connect EVM address.' });
            }
            if (status.dispatchError) {
              console.log("connection dispatch error", status.dispatchError.toString());
              setStatus({ inProgress: false, message: 'Failed to connect EVM address.' });
            }
            if (status.status.isInBlock) {
              console.log("Included at block hash", status.status.asInBlock.toHex());
              if (selectedReefSigner) {
                queryEvmAddress(selectedReefSigner.address, selectedReefSigner.signer!.provider)
                .then(({ evmAddress, isEvmClaimed }) => {
                  setSelectedReefSigner({ ...selectedReefSigner, evmAddress, isEvmClaimed });
                  setStatus({ inProgress: false });
                }).catch((err) => {
                  setStatus({ inProgress: false, message: 'Failed to connect EVM address.' });
                }
              )}
            }
            if (status.status.isFinalized) {
              console.log("Finalized block hash", status.status.asFinalized.toHex());
            }
          },
        );
    } catch (err) {
      console.log("error", err);
      setStatus({ inProgress: false, message: 'Failed to connect EVM address.' });
    }
  }

  // Sign message with EVM wallet
  const signMessage = async (message: string): Promise<{evmAddress?: string, signature?: string, error?: string}> => {
    // @ts-ignore
    const ethereumProvider = window.ethereum;
    if (typeof ethereumProvider === 'undefined') return { error: 'No Metamask or compatible wallet extension found.' }

    try {
        const evmProvider = new ethers.BrowserProvider(ethereumProvider);
        const accounts = await ethereumProvider.request({ method: 'eth_requestAccounts' })
          .catch((err: any) => {
            if (err.code === 4001) {
              return { error: 'Please connect to your Metamask or compatible wallet.' };
            } else {
              console.error(err);
              return { error: 'Failed to connect to Metamask or compatible wallet.' };
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
      <Navbar/>
      { selectedReefSigner ? (
        <div className='content'>
          <div className='display_account_info'>
          <GradientButton title={'<'} func={()=>{
            let i=0;
            for(i=0;i<accounts.length;i++){
              if(accounts[i].address==selectedReefSigner.address)break;
            }
            if(i==0) i=accounts.length;
            setSelectedReefSigner(accounts[i-1])
          }}/>
          <Account account={selectedReefSigner} isDestAccount={selectedReefSigner.isEvmClaimed==false} />
          <GradientButton title={'>'} func={()=>{
            let i=0;
            for(i=0;i<accounts.length;i++){
              if(accounts[i].address==selectedReefSigner.address)break;
            }
            if(i==accounts.length-1) i=-1;
            setSelectedReefSigner(accounts[i+1])
          }}/>
          </div>
          { selectedReefSigner.isEvmClaimed ? (
            <div>
            {/* Claimed */}
              <p className='center-page'>
                Successfully connected to Ethereum VM address&nbsp;
                <b>{toAddressShortDisplay(selectedReefSigner.evmAddress)}</b>
                <br />
                
              </p>
            </div>
          ) : (
            <div>
            {/* No claimed */}
              { !status.inProgress && ( <>
                { hasBalanceForBinding(selectedReefSigner.balance) ? (
                  <div className='center-page'>
                  {/* Bind */}
                  <GradientButton title={"Bind"} func={() => bindEvmAddress(selectedReefSigner)}/>
                  </div>
                ) : (
                  <>
                  {/* Not enough balance */}
                  { transferBalanceFrom ?
                    <div className='center-page'>
                      <p>
                        Reefs will be transferred from
                        <TextButton title='this account' func={setDisplayModal}/>
                       ,  &nbsp;<b>
                          ~{ MIN_BALANCE + 'REEFs' }
                        </b>
                        &nbsp; are needed for transaction fee or<br />
                        <TextButton title='transfer from different account' func={setDisplayModal}/>
                        <br /><br />
                        </p>
                        <div className='display_account_info'>
                            <Account account={ transferBalanceFrom } showChangeAccountBtn={true} changeAccountFunc={()=>setDisplayModal(true)}/>
                            </div>


                      <AccountListModal
                      selectedAccount = {transferBalanceFrom.address}
                        accounts={accountsWithEnoughBalance}
                        id="selectMyAddress"
                        selectAccount={(_: any, selected: ReefAccount): void => {
                          setTransferBalanceFrom(selected);
                          setDisplayModal(false);
                        }}
                        title="Select account"
                        displayModal={displayModal}
                        handleClose={()=>setDisplayModal(false)}
                      />
                      <GradientButton title={"Transfer"} func={transfer( transferBalanceFrom, selectedReefSigner )}/>
                    </div>
                    : <p>Not enough REEF on Reef chain account for EVM address transaction fee.</p>
                  }
                  </>
                )}
              </>)}
              { status.message && status.inProgress != false?<Loader text={ status.message } />:<div className='error-message'>{status.message}</div>}
            </div>
          )}
        </div>
      ) : (
        <div>
          { status.inProgress && status.message ? (

            <div>
              <Loader text={ status.message }/>
            </div>
          ) :(
            <p>No account selected.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
