alter table public.comanda_pagamentos
  drop constraint if exists comanda_pagamentos_forma_check;

alter table public.comanda_pagamentos
  add constraint comanda_pagamentos_forma_check
  check (
    forma_pagamento = any (
      array[
        'dinheiro'::text,
        'pix'::text,
        'debito'::text,
        'credito'::text,
        'transferencia'::text,
        'boleto'::text,
        'outro'::text,
        'credito_cliente'::text
      ]
    )
  );
