import { parentPort, workerData } from 'node:worker_threads';
import { unpackReferencePack } from './reference-pack.mjs';

try {
  parentPort.postMessage({ pack: await unpackReferencePack(workerData.file, workerData.target) });
} catch (error) {
  parentPort.postMessage({ error: error.code === 'ENOSPC'
    ? 'Não há espaço em disco para importar o Swipe File.'
    : error.code ? 'Não foi possível ler ou salvar o Swipe File.' : error.message });
}
