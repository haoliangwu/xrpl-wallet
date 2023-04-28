export const generateNFTokenTaxon = () =>
  Number.parseInt(String(Math.random() * 2 ** 32));

export const hexEncode = (data: string) => {
  let hex, i;

  let result = "";
  for (i = 0; i < data.length; i++) {
    result += data.charCodeAt(i).toString(16);
  }

  return result;
};

export const hexDecode = (hexStr: string) => {
  let j;
  let hexes = hexStr.match(/.{1,2}/g) || [];
  let back = "";
  for (j = 0; j < hexes.length; j++) {
    back += String.fromCharCode(parseInt(hexes[j], 16));
  }

  return back;
};
