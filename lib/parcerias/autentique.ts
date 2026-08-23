const AUTENTIQUE_GRAPHQL_URL = "https://api.autentique.com.br/v2/graphql";

function getAutentiqueToken() {
  const token = process.env.AUTENTIQUE_API_TOKEN?.trim();
  if (!token) {
    throw new Error("AUTENTIQUE_API_TOKEN não configurado no ambiente do servidor.");
  }
  return token;
}

type AutentiqueGraphqlError = {
  message?: string;
};

type CreateDocumentResponse = {
  data?: {
    createDocument?: {
      id: string;
      name?: string | null;
      signatures?: Array<{
        public_id?: string | null;
        email?: string | null;
        link?: { short_link?: string | null } | null;
      }> | null;
    } | null;
  };
  errors?: AutentiqueGraphqlError[];
};

type DocumentStatusResponse = {
  data?: {
    document?: {
      id: string;
      name?: string | null;
      files?: { original?: string | null; signed?: string | null; pades?: string | null } | null;
      signatures?: Array<{
        public_id?: string | null;
        email?: string | null;
        link?: { short_link?: string | null } | null;
        viewed?: { created_at?: string | null } | null;
        signed?: { created_at?: string | null } | null;
        rejected?: { created_at?: string | null } | null;
      }> | null;
    } | null;
  };
  errors?: AutentiqueGraphqlError[];
};

function graphqlErrorMessage(errors?: AutentiqueGraphqlError[]) {
  return errors?.map((item) => item.message).filter(Boolean).join("; ") || null;
}

export function autentiqueConfigurado() {
  return Boolean(process.env.AUTENTIQUE_API_TOKEN?.trim());
}

export async function criarDocumentoAutentique(input: {
  nome: string;
  conteudo: string;
  signatarioEmail: string;
}) {
  const token = getAutentiqueToken();
  const email = input.signatarioEmail.trim().toLowerCase();
  if (!email) throw new Error("O parceiro precisa ter e-mail para receber o contrato.");

  const mutation = `
    mutation CreateDocumentMutation($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
      createDocument(document: $document, signers: $signers, file: $file) {
        id
        name
        signatures {
          public_id
          email
          link { short_link }
        }
      }
    }
  `;

  const form = new FormData();
  form.append(
    "operations",
    JSON.stringify({
      query: mutation,
      variables: {
        document: { name: input.nome },
        signers: [{ email, action: "SIGN" }],
        file: null,
      },
    })
  );
  form.append("map", JSON.stringify({ file: ["variables.file"] }));
  form.append(
    "file",
    new Blob([input.conteudo], { type: "text/plain;charset=utf-8" }),
    `${input.nome.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").slice(0, 80) || "contrato"}.txt`
  );

  const response = await fetch(AUTENTIQUE_GRAPHQL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as CreateDocumentResponse | null;
  const apiError = graphqlErrorMessage(json?.errors);
  if (!response.ok || apiError || !json?.data?.createDocument?.id) {
    throw new Error(apiError || `Autentique respondeu HTTP ${response.status}.`);
  }

  const document = json.data.createDocument;
  const signature = document.signatures?.[0];
  return {
    documentId: document.id,
    signaturePublicId: signature?.public_id || null,
    signatureUrl: signature?.link?.short_link || null,
  };
}

export async function consultarDocumentoAutentique(documentId: string) {
  const token = getAutentiqueToken();
  const query = `
    query DocumentStatus($id: UUID!) {
      document(id: $id) {
        id
        name
        files { original signed pades }
        signatures {
          public_id
          email
          link { short_link }
          viewed { created_at }
          signed { created_at }
          rejected { created_at }
        }
      }
    }
  `;

  const response = await fetch(AUTENTIQUE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { id: documentId } }),
    cache: "no-store",
  });

  const json = (await response.json().catch(() => null)) as DocumentStatusResponse | null;
  const apiError = graphqlErrorMessage(json?.errors);
  if (!response.ok || apiError || !json?.data?.document) {
    throw new Error(apiError || `Não foi possível consultar o documento no Autentique (HTTP ${response.status}).`);
  }

  const document = json.data.document;
  const signature = document.signatures?.[0];
  return {
    signedAt: signature?.signed?.created_at || null,
    rejectedAt: signature?.rejected?.created_at || null,
    viewedAt: signature?.viewed?.created_at || null,
    signatureUrl: signature?.link?.short_link || null,
    signedFileUrl: document.files?.signed || document.files?.pades || null,
  };
}
