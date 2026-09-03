import oauth2 from '@fastify/oauth2';
import fp from 'fastify-plugin';

export default fp(async function googleOAuthPlugin(app: any) {
  await app.register(oauth2, {
    name: 'googleOAuth2',
    scope: ['email', 'profile'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: oauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/google',
    callbackUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback',
  });
});