# Portal SalãoPremium Cursos

## Rotas

- `/cursos`: catálogo público e próximas turmas.
- `/cursos/cadastro`: cadastro completo da aluna e responsável legal.
- `/cursos/login`: acesso da aluna.
- `/cursos/contrato`: termo inicial da conta.
- `/meuscursos`: matrículas, turmas disponíveis e progresso.
- `/meuscursos/[matriculaId]/contrato`: contrato específico da matrícula.
- `/meuscursos/[matriculaId]/painel`: módulos, apostilas, vídeos e certificado.
- `/admin-cursos`: gestão de cursos, turmas, materiais e conclusão.
- `/certificados/verificar/[codigo]`: certificado público verificável.

## Ativação

1. Aplicar `supabase/migrations/20260910120000_portal_cursos.sql` no projeto Supabase de produção.
2. Configurar `CURSOS_SESSION_SECRET` com um segredo aleatório de pelo menos 32 caracteres.
3. Configurar `CURSOS_ADMIN_EMAILS` com os e-mails das professoras e administradoras separados por vírgula.
4. A administradora cria primeiro uma conta comum em `/cursos/cadastro`. Se seu e-mail estiver em `CURSOS_ADMIN_EMAILS`, o próximo login abrirá `/admin-cursos`.
5. No painel, cadastrar o curso, abrir ao menos uma turma e publicar os materiais.

## Segurança e dados

As tabelas possuem RLS ativada e não têm políticas públicas. Toda operação passa pelas ações de servidor e utiliza sessão HTTP-only assinada. Arquivos ficam em bucket privado e são entregues por URLs temporárias após a conferência da matrícula.

Antes da abertura comercial, o texto definitivo do contrato, política de cancelamento, autorização de imagem e política de privacidade devem ser revisados por assessoria jurídica. O texto atual funciona como estrutura técnica e demonstração do fluxo, não como parecer jurídico.
