// Copyright 2017-2020 @polkadot/app-staking authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Option } from '@polkadot/types';
import type { Balance, EraIndex, SlashingSpans, ValidatorPrefs } from '@polkadot/types/interfaces';
import type { ValidatorInfo } from '../../types';

import BN from 'bn.js';
import React, { useCallback, useMemo } from 'react';
import { ApiPromise } from '@polkadot/api';
import { AddressSmall, Icon, LinkExternal } from '@polkadot/react-components';
import { checkVisibility } from '@polkadot/react-components/util';
import { useAccountInfoCache, useApi, useCall } from '@polkadot/react-hooks';
import { FormatBalance } from '@polkadot/react-query';

import Favorite from './Favorite';
import NominatedBy from './NominatedBy';
import Status from './Status';
import StakeOther from './StakeOther';

interface Props {
  address: string;
  className?: string;
  filterName: string;
  hasQueries: boolean;
  isElected: boolean;
  isFavorite: boolean;
  isMain?: boolean;
  lastBlock?: string;
  nominatedBy?: [string, EraIndex, number][];
  onlineCount?: false | BN;
  onlineMessage?: boolean;
  points?: string;
  toggleFavorite: (accountId: string) => void;
  validatorInfo?: ValidatorInfo;
  withIdentity: boolean;
}

interface StakingState {
  commission?: string;
  nominators: [string, Balance][];
  stakeTotal?: BN;
  stakeOther?: BN;
  stakeOwn?: BN;
}

function expandInfo ({ exposure, validatorPrefs }: ValidatorInfo): StakingState {
  let nominators: [string, Balance][] = [];
  let stakeTotal: BN | undefined;
  let stakeOther: BN | undefined;
  let stakeOwn: BN | undefined;

  if (exposure) {
    nominators = exposure.others.map(({ value, who }): [string, Balance] => [who.toString(), value.unwrap()]);
    stakeTotal = exposure.total.unwrap();
    stakeOwn = exposure.own.unwrap();
    stakeOther = stakeTotal.sub(stakeOwn);
  }

  const commission = (validatorPrefs as ValidatorPrefs)?.commission?.unwrap();

  return {
    commission: commission?.toHuman(),
    nominators,
    stakeOther,
    stakeOwn,
    stakeTotal
  };
}

const transformSlashes = {
  transform: (opt: Option<SlashingSpans>) => opt.unwrapOr(null)
};

function redirect (address: string): void {
  window.location.hash = `/staking/query/${address}`;
}

function useAddressCalls (api: ApiPromise, address: string, isMain?: boolean) {
  const params = useMemo(() => [address], [address]);
  const accountInfo = useAccountInfoCache(address, true);
  const slashingSpans = useCall<SlashingSpans | null>(!isMain && api.query.staking.slashingSpans, params, transformSlashes);

  return { accountInfo, slashingSpans };
}

function Address ({ address, className = '', filterName, hasQueries, isElected, isFavorite, isMain, lastBlock, nominatedBy, onlineCount, onlineMessage, points, toggleFavorite, validatorInfo, withIdentity }: Props): React.ReactElement<Props> | null {
  const { api } = useApi();
  const { accountInfo, slashingSpans } = useAddressCalls(api, address, isMain);

  const { commission, nominators, stakeOther, stakeOwn } = useMemo(
    () => validatorInfo ? expandInfo(validatorInfo) : { nominators: [] },
    [validatorInfo]
  );

  const isVisible = useMemo(
    () => accountInfo ? checkVisibility(api, address, accountInfo, filterName, withIdentity) : true,
    [api, accountInfo, address, filterName, withIdentity]
  );

  const _onQueryStats = useCallback(
    () => redirect(address),
    [address]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <tr className={className}>
      <td className='badge together'>
        <Favorite
          address={address}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
        />
        <Status
          isElected={isElected}
          isMain={isMain}
          nominators={nominatedBy || nominators}
          onlineCount={onlineCount}
          onlineMessage={onlineMessage}
        />
      </td>
      <td className='address'>
        <AddressSmall value={address} />
      </td>
      {isMain
        ? (
          <StakeOther
            nominators={nominators}
            stakeOther={stakeOther}
          />
        )
        : (
          <NominatedBy
            nominators={nominatedBy}
            slashingSpans={slashingSpans}
          />
        )
      }
      {isMain && (
        <td className='number media--1100'>
          {stakeOwn?.gtn(0) && (
            <FormatBalance value={stakeOwn} />
          )}
        </td>
      )}
      <td className='number'>
        {commission}
      </td>
      {isMain && (
        <>
          <td className='number'>
            {points}
          </td>
          <td className='number'>
            {lastBlock}
          </td>
        </>
      )}
      <td>
        {hasQueries && (
          <Icon
            className='highlight--color'
            icon='chart-line'
            onClick={_onQueryStats}
          />
        )}
      </td>
      <td className='links media--1200'>
        <LinkExternal
          data={address}
          isLogo
          type={isMain ? 'validator' : 'intention'}
        />
      </td>
    </tr>
  );
}

export default React.memo(Address);
