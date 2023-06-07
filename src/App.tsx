import React, { useEffect, useState } from 'react';
import { decodeAddress } from '@polkadot/util-crypto';
import Identicon from '@polkadot/react-identicon';
import {ReefInjected, InjectedAccount, ReefSignerResponse, ReefSignerStatus, ReefVM} from "@reef-defi/extension-inject/types";
import { Provider, Signer } from '@reef-defi/evm-provider';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import { ReefSigner, getReefExtension, signerToReefSigner } from './util';

const MIN_BALANCE = ethers.parseEther('5');
const hasBalanceForBinding = (balance: bigint): boolean => balance > MIN_BALANCE;

const Account = ({ account }: { account: ReefSigner }): JSX.Element => (
  <div>
    <div>
      <Identicon value={account.address} size={44} theme="substrate" />
    </div>
    <div>
      <div>{ account.name }</div>
      <div>{ toAddressShortDisplay(account.address) }</div>
    </div>
  </div>
);

interface BindStatus {
  inProgress: boolean;
  message?: string;
}

const trim = (value: string, size = 19): string =>
  value.length < size
    ? value
    : `${value.slice(0, size - 5)}...${value.slice(value.length - 5)}`;

const toAddressShortDisplay = (address: string): string =>
  trim(address, 7);

const App = (): JSX.Element => {
  const [accounts, setAccounts] = useState<InjectedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccount>();
  const [selectedSigner, setSelectedSigner] = useState<ReefSigner>();
  const [provider, setProvider] = useState<Provider>();
  const [bindStatus, setBindStatus] = useState<BindStatus>({ inProgress: false });

  useEffect(() => {
    getAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount && provider) {
      signerToReefSigner(selectedAccount, provider).then((rs: ReefSigner) => {
        setSelectedSigner(rs);
      });
    } else {
      setSelectedSigner(undefined);
    }
  }, [selectedAccount, provider]);

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

      reefExtension.reefProvider.subscribeSelectedNetworkProvider(async (provider: Provider) => {
        console.log("provider cb =", provider);
        setProvider(provider);
      });

      reefExtension.accounts.subscribe(async (accounts: InjectedAccount[]) => {
        console.log("accounts cb =",accounts);
        setAccounts(accounts);
        const selectedAccount = accounts.find((account: InjectedAccount) => account.isSelected);
        setSelectedAccount(selectedAccount);
      });

      // reefExtension.reefSigner.subscribeSelectedSigner(async (sig:ReefSignerResponse) => {
      //   console.log("signer cb =",sig);
      // }, ReefVM.NATIVE);

    } catch (err: any) {
      console.error(err);
    }
  }

  const bindEvmAddress = async (address: string, provider: Provider): Promise<void> => {
    setBindStatus({ inProgress: true, message: 'Sign message with an EVM wallet (e.g. Metamask, Trust, Phantom...).' });

    const publicKey = decodeAddress(address);
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
      await provider.api.tx.evmAccounts.claimAccount(evmAddress, signature).signAndSend(address);
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
        { provider && selectedSigner ? (
          <div>
            <Account account={selectedSigner} />
            { selectedSigner.isEvmClaimed ? (
              <div>
              {/* Claimed */}
                <p>
                  {' '}
                  Successfully connected to Ethereum VM address&nbsp;
                  <b>{toAddressShortDisplay(selectedSigner.evmAddress)}</b>
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
                  <div>
                  {/* Bind not in progress */}
                    <button onClick={() => bindEvmAddress(selectedSigner.address, provider)}>Bind</button>
                    { bindStatus.message && 
                      <p>{ bindStatus.message }</p> 
                    }
                  </div>
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