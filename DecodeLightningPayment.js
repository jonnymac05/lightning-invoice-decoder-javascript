/* eslint-disable no-mixed-operators */
/* eslint-disable arrow-body-style */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */
/* eslint-disable no-throw-literal */
/* eslint-disable consistent-return */
/* eslint-disable no-case-declarations */
/* eslint-disable camelcase */
/* eslint-disable prefer-template */
/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
/* eslint-disable max-len */
// TODO - A reader MUST check that the signature is valid (see the n tagged field)
// TODO - Tagged part of type f: the fallback on-chain address should be decoded into an address format
// TODO - A reader MUST check that the SHA-2 256 in the h field exactly matches the hashed description.
// TODO - A reader MUST use the n field to validate the signature instead of performing signature recovery if a valid n field is provided.

const bech32CharValues = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

let errors = [];

const byteArrayToInt = (byteArray) => {
    let value = 0;
    for (let i = 0; i < byteArray.length; ++i) {
        value = (value << 8) + byteArray[i];
    }
    return value;
}

const bech32ToInt = (str) => {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
        sum *= 32;
        sum += bech32CharValues.indexOf(str.charAt(i));
    }
    return sum;
}

const bech32ToFiveBitArray = (str) => {
    const array = [];
    for (let i = 0; i < str.length; i++) {
        array.push(bech32CharValues.indexOf(str.charAt(i)));
    }
    return array;
}

const fiveBitArrayTo8BitArray = (int5Array, includeOverflow) => {
    let count = 0;
    let buffer = 0;
    const byteArray = [];
    int5Array.forEach((value) => {
        buffer = (buffer << 5) + value;
        count += 5;
        if (count >= 8) {
            byteArray.push(buffer >> (count - 8) & 255);
            count -= 8;
        }
    });
    if (includeOverflow && count > 0) {
        byteArray.push(buffer << (8 - count) & 255);
    }
    return byteArray;
}

const bech32ToUTF8String = (str) => {
    const int5Array = bech32ToFiveBitArray(str);
    const byteArray = fiveBitArrayTo8BitArray(int5Array);

    let utf8String = '';
    for (let i = 0; i < byteArray.length; i++) {
        utf8String += '%' + ('0' + byteArray[i].toString(16)).slice(-2);
    }
    return decodeURIComponent(utf8String);
}

const byteArrayToHexString = (byteArray) => {
    return Array.prototype.map.call(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

const bech32ToBinaryString = (byteArray) => {
    return Array.prototype.map.call(byteArray, function (byte) {
        return ('000000' + byte.toString(2)).slice(-5);
    }).join('');
}

const textToHexString = (text) => {
    let hexString = '';
    for (let i = 0; i < text.length; i++) {
        hexString += text.charCodeAt(i).toString(16);
    }
    return hexString;
}

const isDigit = (str) => str >= '0' && str <= '9'

const decodeAmount = (str) => {
  // eslint-disable-next-line eqeqeq
  if (str.length == 0) {
      return 'Any amount' // A reader SHOULD indicate if amount is unspecified
  }
  const multiplier = isDigit(str.charAt(str.length - 1)) ? '-' : str.charAt(str.length - 1);
  let amount = multiplier === '-' ? str : str.substring(0, str.length - 1);
  if (amount.substring(0, 1) === '0') {
      errors.push('Malformed request: amount cannot contain leading zeros');
      return 0;
  }
  amount = Number(amount);
  if (amount < 0 || !Number.isInteger(amount)) {
      errors.push('Malformed request: amount must be a positive decimal integer');
      return 0;
    }

  switch (multiplier) {
      case 'p':
          return amount / 10;
      case 'n':
          return amount * 100;
      case 'u':
          return amount * 100000;
      case 'm':
          return amount * 100000000;
      case '-':
          return amount * 100000000000;
      default:
          // A reader SHOULD fail if amount is followed by anything except a defined multiplier.
          errors.push('Malformed request: undefined amount multiplier');
          return 0;
  }
}

const decodeHumanReadablePart = (humanReadablePart) => {
  const prefixes = ['lnbc', 'lntb', 'lnbcrt', 'lnsb'];
  let prefix;
  prefixes.forEach((value) => {
      if (humanReadablePart.substring(0, value.length) === value) {
          prefix = value;
      }
  });

  // eslint-disable-next-line eqeqeq
  if (prefix == null) {
    errors.push('Malformed request: unknown prefix');
    // A reader MUST fail if it does not understand the prefix.
    return { prefix: 'null', amount: 0 }
  }
  const amount = decodeAmount(humanReadablePart.substring(prefix.length, humanReadablePart.length));
  return {
      prefix,
      amount,
  }
}

const decodeSignature = (signature) => {
  const data = fiveBitArrayTo8BitArray(bech32ToFiveBitArray(signature));
  const recoveryFlag = data[data.length - 1];
  const r = byteArrayToHexString(data.slice(0, 32));
  const s = byteArrayToHexString(data.slice(32, data.length - 1));
  return {
      r,
      s,
      recovery_flag: recoveryFlag,
  }
}

const decodeTag = (type, length, data) => {
  switch (type) {
      case 'p':
          if (length !== 52) break; // A reader MUST skip over a 'p' field that does not have data_length 52
          return {
              type,
              length,
              description: 'payment_hash',
              value: byteArrayToHexString(fiveBitArrayTo8BitArray(bech32ToFiveBitArray(data))),
          };
      case 's':
          if (length !== 52) break; // A reader MUST skip over a 's' field that does not have data_length 52
          return {
              type,
              length,
              description: 'payment_secret',
              value: byteArrayToHexString(fiveBitArrayTo8BitArray(bech32ToFiveBitArray(data))),
          };
      case 'd':
          return {
              type,
              length,
              description: 'description',
              value: bech32ToUTF8String(data),
          };
      case 'n':
          if (length !== 53) break; // A reader MUST skip over a 'n' field that does not have data_length 53
          return {
              type,
              length,
              description: 'payee_public_key',
              value: byteArrayToHexString(fiveBitArrayTo8BitArray(bech32ToFiveBitArray(data))),
          };
      case 'h':
          if (length !== 52) break; // A reader MUST skip over a 'h' field that does not have data_length 52
          return {
              type,
              length,
              description: 'description_hash',
              value: data,
          };
      case 'x':
          return {
              type,
              length,
              description: 'expiry',
              value: bech32ToInt(data),
          };
      case 'c':
          return {
              type,
              length,
              description: 'min_final_cltv_expiry',
              value: bech32ToInt(data),
          };
      case 'f':
          const version = bech32ToFiveBitArray(data.charAt(0))[0];
          if (version < 0 || version > 18) break; // a reader MUST skip over an f field with unknown version.
          data = data.substring(1, data.length);
          return {
              type,
              length,
              description: 'fallback_address',
              value: {
                  version,
                  fallback_address: data,
              },
          };
      case 'r':
          data = fiveBitArrayTo8BitArray(bech32ToFiveBitArray(data));
          const pubkey = data.slice(0, 33);
          const shortChannelId = data.slice(33, 41);
          const feeBaseMsat = data.slice(41, 45);
          const feeProportionalMillionths = data.slice(45, 49);
          const cltvExpiryDelta = data.slice(49, 51);
          return {
              type,
              length,
              description: 'routing_information',
              value: {
                  public_key: byteArrayToHexString(pubkey),
                  short_channel_id: byteArrayToHexString(shortChannelId),
                  fee_base_msat: byteArrayToInt(feeBaseMsat),
                  fee_proportional_millionths: byteArrayToInt(feeProportionalMillionths),
                  cltv_expiry_delta: byteArrayToInt(cltvExpiryDelta),
              },
          };
      case '9':
          return {
              type,
              length,
              description: 'feature_bits',
              value: bech32ToBinaryString(bech32ToFiveBitArray(data)),
          };
      default:
      // reader MUST skip over unknown fields
  }
}

const extractTags = (str) => {
  const tags = [];
  while (str.length > 0) {
      const type = str.charAt(0);
      const dataLength = bech32ToInt(str.substring(1, 3));
      const data = str.substring(3, dataLength + 3);
      tags.push({
          type,
          length: dataLength,
          data,
      });
      str = str.substring(3 + dataLength, str.length);
  }
  return tags;
}

const decodeTags = (tagData) => {
  const tags = extractTags(tagData);
  const decodedTags = [];
  tags.forEach((value) => decodedTags.push(decodeTag(value.type, value.length, value.data)));
  return decodedTags.filter((t) => t !== undefined);
}

const decodeData = (data, humanReadablePart) => {
  const date32 = data.substring(0, 7);
  const dateEpoch = bech32ToInt(date32);
  const signature = data.substring(data.length - 104, data.length);
  const tagData = data.substring(7, data.length - 104);
  const decodedTags = decodeTags(tagData);
  let value = bech32ToFiveBitArray(date32 + tagData);
  value = fiveBitArrayTo8BitArray(value, true);
  value = textToHexString(humanReadablePart).concat(byteArrayToHexString(value));
  return {
      time_stamp: dateEpoch,
      tags: decodedTags,
      signature: decodeSignature(signature),
      signing_data: value,
  }
}

const polymod = (values) => {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  values.forEach((value) => {
      const b = (chk >> 25);
      chk = (chk & 0x1ffffff) << 5 ^ value;
      for (let i = 0; i < 5; i++) {
          if (((b >> i) & 1) === 1) {
              chk ^= GEN[i];
          } else {
              chk ^= 0;
          }
      }
  });
  return chk;
}

const expand = (str) => {
  const array = [];
  for (let i = 0; i < str.length; i++) {
      array.push(str.charCodeAt(i) >> 5);
  }
  array.push(0);
  for (let i = 0; i < str.length; i++) {
      array.push(str.charCodeAt(i) & 31);
  }
  return array;
}

const verifyChecksum = (hrp, data) => {
  hrp = expand(hrp);
  const all = hrp.concat(data);
  const bool = polymod(all);
  return bool === 1;
}

const removeDuplicates = (a) => {
  return Array.from(new Set(a));
}

const decode = (paymentRequest) => {
  errors = []; // make sure errors starts clean
  const input = paymentRequest.toLowerCase();
  const splitPosition = input.lastIndexOf('1');
  const humanReadablePart = input.substring(0, splitPosition);
  const data = input.substring(splitPosition + 1, input.length - 6);
  const checksum = input.substring(input.length - 6, input.length);
  if (!verifyChecksum(humanReadablePart, bech32ToFiveBitArray(data + checksum))) {
      errors.push('Malformed request: checksum is incorrect')
      // A reader MUST fail if the checksum is incorrect.
  }
  return {
      human_readable_part: decodeHumanReadablePart(humanReadablePart),
      data: decodeData(data, humanReadablePart),
      checksum,
      errors: removeDuplicates(errors),
  }
}

export { decode };
