import { safeStorage } from 'electron';
import { createSecretStore } from '../core/secrets-store.mjs';

// Chave do Composio cifrada pelo sistema (DPAPI no Windows, Keychain no Mac) em integrations.json,
// fora da biblioteca de projetos. Nunca vai para o estado da janela, para a CLI nem para logs.
export const createSecrets=userData=>createSecretStore(userData,safeStorage);
