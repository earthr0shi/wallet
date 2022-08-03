import React, { useCallback, useEffect, useState } from 'react';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import NavButton from '~components/composed/NavButton';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import ICON_ETH from '~assets/images/icon_eth.png';

import styles from './index.module.scss';
import clsx from 'clsx';
import { keyable } from '~scripts/Background/types/IMainController';
import { useSelector } from 'react-redux';
import { getSymbol, isJsonString } from '~utils/common';
import { selectAssetBySymbol } from '~state/assets';
import { getFeesExtended } from '~utils/services';
import ActionButton from '~components/composed/ActionButton';
import {
  useController,
  useCurrentDapp,
  useCurrentDappAddress,
} from '~hooks/useController';
import { BigNumber, ethers } from 'ethers';
import { formatEther, formatUnits } from 'ethers/lib/utils';
import { shortenAddress } from '~global/helpers';
import InputWithLabel from '~components/InputWithLabel';
import Warning from '~components/Warning';
import { decryptString } from '~utils/vault';
import { validateMnemonic } from '@earthwallet/keyring';
import { selectAccountById } from '~state/wallet';

const MIN_LENGTH = 6;

const FeesPriceInUSD = ({ symbol, gas }: { symbol: string; gas: number }) => {
  const currentUSDValue: keyable = useSelector(
    selectAssetBySymbol(getSymbol(symbol)?.coinGeckoId || '')
  );
  return (
    <div className={styles.feePriceUSD}>
      ${(gas * currentUSDValue.usd)?.toFixed(4)}
    </div>
  );
};

const RequestTransactionPage = () => {
  const [mainNav, setMainNav] = useState('details');
  const [feesArr, setFeesArr] = useState<keyable[]>([]);
  const [fees, setFees] = useState<number>(0);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [pass, setPass] = useState('');
  const [feesOptionSelected, setFeesOptionSelected] = useState<number>();
  const activeAccountAddress = useCurrentDappAddress();
  console.log(activeAccountAddress);
  const selectedAccount = useSelector(selectAccountById(activeAccountAddress));
  const controller = useController();
  const dapp = useCurrentDapp();
  const request = controller.dapp.getSignatureRequest();

  const onPassChange = useCallback(
    (password: string) => {
      setPass(password);
      setError('');

      let secret = '';
      try {
        secret =
          selectedAccount?.symbol !== 'ICP'
            ? decryptString(selectedAccount?.vault.encryptedMnemonic, password)
            : decryptString(selectedAccount?.vault.encryptedJson, password);
      } catch (error) {
        setError('Wrong password! Please try again');
      }
      if (
        selectedAccount?.symbol === 'ICP'
          ? !isJsonString(secret)
          : !validateMnemonic(secret)
      ) {
        setError('Wrong password! Please try again');
      } else {
        setError('NO_ERROR');
      }
    },
    [selectedAccount]
  );

  const changeFees = useCallback(
    (index: number) => {
      setFeesOptionSelected(index);
      setFees(feesArr[index]?.gas);
    },
    [feesArr[0]]
  );

  const handleConfirm = async () => {
    setIsBusy(true);

    const mnemonic = decryptString(
      selectedAccount?.vault.encryptedMnemonic,
      pass
    );
    const provider = new ethers.providers.JsonRpcProvider(
      'https://eth-mainnet.g.alchemy.com/v2/WQY8CJqsPNCqhjPqPfnPApgc_hXpnzGc'
    );
    const wallet = ethers.Wallet.fromMnemonic(mnemonic);
    const signer = new ethers.Wallet(wallet.privateKey, provider);

    const result = await signer.sendTransaction(request);

    controller.dapp.setApprovedIdentityJSON(JSON.stringify(result));

    setIsBusy(false);
  };

  useEffect(() => {
    getFeesExtended('ETH').then((_feesArr: keyable[]) => {
      console.log('feesOptionSelected', feesOptionSelected);
      feesOptionSelected &&
        _feesArr[feesOptionSelected] &&
        setFees(_feesArr[feesOptionSelected]?.gas);
      setFeesArr(_feesArr);
    });
  }, []);

  useEffect(() => {
    const type = request.type
      ? Number(BigNumber.from(request.type).toString())
      : 1;
    // standard tx request
    if (type === 0) {
      if (request?.gasPrice && request?.gasLimit) {
        setFeesOptionSelected(4);
        const customFee = Number(
          formatUnits(
            BigNumber.from(request.gasPrice).mul(
              BigNumber.from(request.gasLimit)
            ),
            18
          )
        );
        setFees(customFee);
      }
    } else if (type === 1) {
      if (request?.maxPriorityFeePerGas && request?.gasLimit) {
        setFeesOptionSelected(4);
        const customFee = Number(
          formatUnits(
            BigNumber.from(request.maxPriorityFeePerGas).mul(
              BigNumber.from(request.gasLimit)
            ),
            18
          )
        );
        setFees(customFee);
      }
    }
  }, [request]);

  return (
    <div className={styles.page}>
      <div className={styles.page}>
        <div className={styles.inner}>
          <section className={styles.header}>
            <NavButton>
              <ChevronLeftIcon />
              Back
            </NavButton>
            <NavButton>
              <img src={ICON_ETH} />
              Ethereum
            </NavButton>
          </section>
          <section className={styles.content}>
            <div className={styles.subhead}>
              <div className={styles.left}>
                <img src={ICON_ETH} />
                <span>{formatEther(BigNumber.from(request.value))}</span>
              </div>
              <div className={styles.right}>
                <img src={ICON_ETH} />
                <span>{shortenAddress(request.to)}</span>
              </div>
              <ChevronRightIcon className={styles.arrow} />
            </div>
            <div className={styles.basic}>
              <span className={styles.url}>{dapp.title}</span>
              <div className={styles.function}>Sending ETH</div>
              <div className={styles.fee}>{fees}</div>
            </div>
            <div className={styles.nav}>
              <div
                onClick={() => setMainNav('details')}
                className={clsx(
                  styles.tabnav,
                  mainNav === 'details' && styles.tabnav_active
                )}
              >
                Details
              </div>
              {/* <div
                onClick={() => setMainNav('data')}
                className={clsx(
                  styles.tabnav,
                  mainNav === 'data' && styles.tabnav_active
                )}
              >
                Data
              </div> */}
            </div>
            <div className={styles.layout}>
              {mainNav === 'details' && (
                <div className={styles.feeSelector}>
                  {feesArr.map((feeObj: keyable, index: number) => (
                    <div
                      onClick={() => changeFees(index)}
                      key={feeObj?.label}
                      className={clsx(
                        styles.feeSelectCont,
                        feesOptionSelected == index &&
                          styles.feeSelectCont_selected
                      )}
                    >
                      <div className={styles.feeLabel}>{feeObj?.label}</div>
                      <div className={styles.feePrice}>
                        {feeObj?.gas?.toFixed(7)} ETH
                      </div>
                      <FeesPriceInUSD gas={feeObj?.gas} symbol={'ETH'} />
                    </div>
                  ))}
                </div>
              )}
              {/* {mainNav === 'data' && (
                <div className={styles.data}>
                  Data
                </div>
              )} */}
            </div>
            <div className={styles.footer}>
              <InputWithLabel
                data-export-password
                disabled={isBusy}
                isError={pass.length < MIN_LENGTH || !!error}
                label={'password for this account'}
                onChange={onPassChange}
                placeholder="REQUIRED"
                type="password"
              />
              {false && error && error != 'NO_ERROR' && (
                <Warning isBelowInput isDanger>
                  {error}
                </Warning>
              )}
              <div className={styles.actions}>
                <ActionButton
                  actionType="secondary"
                  onClick={() => window.close()}
                >
                  Cancel
                </ActionButton>
                <ActionButton
                  disabled={error != 'NO_ERROR'}
                  onClick={handleConfirm}
                >
                  Confirm
                </ActionButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default RequestTransactionPage;
