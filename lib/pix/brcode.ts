function onlyAscii(value: string, maxLength: number) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, maxLength);
}

function field(id: string, value: string) {
  const length = String(value.length).padStart(2, "0");
  return `${id}${length}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(params: {
  chave: string;
  nomeRecebedor: string;
  cidade: string;
  valor: number;
  descricao?: string | null;
  txid?: string | null;
}) {
  const chave = onlyAscii(params.chave, 77);
  const nome = onlyAscii(params.nomeRecebedor || "SalaoPremium", 25);
  const cidade = onlyAscii(params.cidade || "Brasil", 15);
  const txid = onlyAscii(params.txid || "***", 25) || "***";
  const descricao = onlyAscii(params.descricao || "", 72);
  const amount = Math.max(0, Number(params.valor || 0)).toFixed(2);

  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", chave) + (descricao ? field("02", descricao) : "");
  const payload =
    field("00", "01") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986") +
    field("54", amount) +
    field("58", "BR") +
    field("59", nome) +
    field("60", cidade) +
    field("62", field("05", txid));
  const withCrcHeader = `${payload}6304`;
  return `${withCrcHeader}${crc16(withCrcHeader)}`;
}
