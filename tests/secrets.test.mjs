import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('encrypted Telegram and Composio credentials survive concurrent writes and separate removal',async t=>{
  const {createSecretStore}=await import('../core/secrets-store.mjs');
  const root=await mkdtemp(join(tmpdir(),'carrossell-secrets-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const encryption={isEncryptionAvailable:()=>true,encryptString:value=>Buffer.from([...value].reverse().join('')),decryptString:bytes=>[...bytes.toString()].reverse().join('')};
  const secrets=createSecretStore(root,encryption),installId=secrets.installId();
  await Promise.all([secrets.setKey('composio-synthetic-key'),secrets.setTelegramToken('telegram-synthetic-token'),secrets.saveAccounts([{id:'account1'}])]);
  const saved=await readFile(join(root,'integrations.json'),'utf8');assert.doesNotMatch(saved,/composio-synthetic-key|telegram-synthetic-token/);
  const reopened=createSecretStore(root,encryption);assert.equal(reopened.getKey(),'composio-synthetic-key');assert.equal(reopened.getTelegramToken(),'telegram-synthetic-token');assert.equal(reopened.installId(),installId);
  await reopened.clearTelegramToken();assert.equal(reopened.getKey(),'composio-synthetic-key');assert.deepEqual(reopened.accounts(),[{id:'account1'}]);
});

test('an unreadable credential file is preserved rather than overwritten',async t=>{
  const {createSecretStore}=await import('../core/secrets-store.mjs');const {writeFile}=await import('node:fs/promises');
  const root=await mkdtemp(join(tmpdir(),'carrossell-secrets-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(join(root,'integrations.json'),'corrupted');assert.throws(()=>createSecretStore(root,{}),/preservad/);
  assert.equal(await readFile(join(root,'integrations.json'),'utf8'),'corrupted');
});
