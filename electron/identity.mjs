import { join, resolve } from 'node:path';

export function configureIdentity(app, override) {
  // Verified in packaged 0.2.1: app.getName() was pacto-desktop.
  const legacy = join(app.getPath('appData'), 'pacto-desktop');
  app.setPath('userData', override ? resolve(override) : legacy);
  app.setName('Carrossell');
}
