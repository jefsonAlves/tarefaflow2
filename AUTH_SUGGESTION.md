# Sugestão de Implementação: Login Social Adicional

Abaixo descrevemos a sugestão arquitetural para incluir os fluxos de login com Facebook, GitHub e Twitter no TarefaFlow via Firebase Auth, além da orientação sobre sincronização com Google Agenda.

## 1. Configuração no Firebase Console
1. Acesse o [Firebase Console](https://console.firebase.google.com).
2. Va em **Authentication** -> **Sign-in method**.
3. Ative os provedores desejados (Facebook, GitHub, Twitter).
4. Para cada um deles, você precisará criar um aplicativo em seus respectivos painéis de desenvolvedor (Meta for Developers, GitHub Developer Settings, Twitter Developer Portal) e obter as credenciais (`App ID` / `Client ID` e `App Secret` / `Client Secret`).
5. Configure as URLs de callback do OAuth em cada provedor para apontar para o domínio do seu projeto Firebase (ex: `https://<seu-projeto>.firebaseapp.com/__/auth/handler`).

## 2. Ajustes no Código-Fonte (`src/firebase.ts`)
Você precisará instanciar os provedores e configurar os escopos se quiser permissões adicionais.

```typescript
import { 
  FacebookAuthProvider, 
  GithubAuthProvider, 
  TwitterAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  linkWithPopup
} from 'firebase/auth';

export const facebookProvider = new FacebookAuthProvider();
// Exemplo de permissões extras pro Facebook
// facebookProvider.addScope('user_birthday');

export const githubProvider = new GithubAuthProvider();
// githubProvider.addScope('repo');

export const twitterProvider = new TwitterAuthProvider();

// O fluxo de entrada segue a lógica de identificar se é aplicativo nativo ou não
export const signInWithProvider = async (providerName: 'facebook' | 'github' | 'twitter') => {
  let provider;
  switch (providerName) {
    case 'facebook': provider = facebookProvider; break;
    case 'github': provider = githubProvider; break;
    case 'twitter': provider = twitterProvider; break;
  }

  if (isNativeApp()) {
    await signInWithRedirect(auth, provider);
    return;
  }

  const result = await signInWithPopup(auth, provider);
  return result.user;
};
```

## 3. Aviso Importante sobre Google Agenda (Calendar) / Classroom
Como seu aplicativo tem integrações com as APIs de Calendar, Tasks e Classroom do Google, provedores diferentes (Facebook, GitHub) **não fornecerão tokens de acesso a esses serviços**.

Por isso, e para não confundir o usuário:
- Ao permitir o login com outras redes sociais, exiba um alerta como o que foi adicionado na interface atual.
- Caso o usuário tente sincronizar o Calendar logado via Facebook/GitHub, ele terá que **vincular (`linkWithPopup`) a conta do Google** ao perfil autenticado existente ou sua aplicação deverá barrar o recurso avisando que só está disponível para quem logou com Google.

## 4. Tratamento de Redirects e Múltiplas Contas
O Capacitor tem uma particularidade onde o `signInWithRedirect` é recomendado para evitar popups bloqueados em WebViews. O próprio SDK do Firebase consegue interceptar a volta da rede social via App Links / Universal Links, ou usando plugins adicionais de App Auth como o `@capacitor-firebase/authentication` que oferecem integrações em nível mais nativo (C++ e bibliotecas Android nativas / iOS), conferindo maior estabilidade no login de terceiros.
