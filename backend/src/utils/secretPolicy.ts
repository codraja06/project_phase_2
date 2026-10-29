export const usableSigningSecret = (value: string | undefined): value is string =>
  Boolean(value && Buffer.byteLength(value, 'utf8') >= 32 &&
    !/^(?:your[_ -]|replace[_ -]|change[_ -]|changeme|example[_ -]|<|\$\{)/i.test(value.trim()));
