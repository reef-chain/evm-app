import { web3Enable } from "@reef-defi/extension-dapp";
import { REEF_EXTENSION_IDENT } from "@reef-defi/extension-inject";
import { ReefInjected, InjectedAccount } from "@reef-defi/extension-inject/types";
import { DeriveBalancesAccountData } from '@polkadot/api-derive/balances/types';
import { Provider } from '@reef-defi/evm-provider';
import { getAddress } from "ethers";
import {
  blake2AsU8a,
  decodeAddress,
} from '@polkadot/util-crypto';
import { u8aConcat, u8aEq, u8aToHex, isNumber } from '@polkadot/util';

export interface ReefSigner {
  name: string;
  balance: BigInt;
  address: string;
  evmAddress: string;
  isEvmClaimed: boolean;
}

export async function getReefExtension(appName: string) {
    const extensionsArr = await web3Enable(appName);
    const extension = extensionsArr.find((e: any) => e.name === REEF_EXTENSION_IDENT);
    // @ts-ignore
    return extension as ReefInjected | undefined;
}

const getReefCoinBalance = async (
  address: string,
  provider: Provider,
): Promise<BigInt> => {
  const balance = await provider.api.derive.balances
    .all(address as any)
    .then((res: DeriveBalancesAccountData) => BigInt(res.freeBalance.toString(10)));
  return balance;
};

const computeDefaultEvmAddress = (address: string): string => {
  const publicKey = decodeAddress(address);

  const isStartWithEvm = u8aEq('evm:', publicKey.slice(0, 4));

  if (isStartWithEvm) {
    return getAddress(u8aToHex(publicKey.slice(4, 24)));
  }

  return getAddress(
    u8aToHex(blake2AsU8a(u8aConcat('evm:', publicKey), 256).slice(0, 20))
  );
}

const queryEvmAddress = async (address: string, provider: Provider): Promise<{ evmAddress: string, isEvmClaimed: boolean }> => {
  const evmAddress = await provider.api.query.evmAccounts.evmAddresses(address);
  if (!evmAddress.isEmpty) {
    const evmAddress = getAddress(address.toString());
    return { evmAddress, isEvmClaimed: true };
  }

  return { evmAddress: computeDefaultEvmAddress(address), isEvmClaimed: false };
}

export const signerToReefSigner = async (
  account: InjectedAccount,
  provider: Provider,
): Promise<ReefSigner> => {
  const { evmAddress, isEvmClaimed } = await queryEvmAddress(account.address, provider);
  const balance = await getReefCoinBalance(account.address, provider);

  return {
    name: account.name || '',
    balance,
    address: account.address,
    evmAddress,
    isEvmClaimed
  };
};