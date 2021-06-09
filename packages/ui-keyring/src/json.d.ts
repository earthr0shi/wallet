// Copyright 2017-2021 @polkadot/util authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Be able to import json in TS
// https://stackoverflow.com/questions/49996456/importing-json-file-in-typescript
// eslint-disable-next-line header/header
declare module '*.json' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any;

  export default value;
}
