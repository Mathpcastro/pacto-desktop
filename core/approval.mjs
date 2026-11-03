import { createHash } from 'node:crypto';

// A aprovação vale para a copy e para os pixels vistos, inclusive no horário
// futuro de uma publicação agendada. Datas/status do agendamento não a alteram.
export const approvalFingerprint=project=>createHash('sha256').update(JSON.stringify({caption:project.caption,approved:project.textApproved,slides:project.slides.map(s=>({id:s.id,title:s.title,body:s.body,image:s.image,state:s.state}))})).digest('hex');
