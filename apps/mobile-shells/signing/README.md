# Android signing files

Esta pasta guarda a keystore e o arquivo local de senhas para assinar APK/AAB de producao.

Os arquivos sensiveis sao ignorados pelo Git:

- `*.jks`
- `release-signing.properties`

Guarde backup destes arquivos em local seguro:

- `salaopremiun-upload-key-prod.jks`
- `release-signing.properties`

Sem a mesma keystore, nao e possivel publicar atualizacoes do mesmo app instalado ou enviado para a Google Play.
