// Compatibilidade temporaria: as telas legadas ainda importam este modulo,
// mas toda leitura/escrita e encaminhada ao gateway Neon do painel.
// Nao ha SDK, URL, chave, Auth, Realtime ou Storage do Supabase aqui.
export { database as supabase } from "./database";
