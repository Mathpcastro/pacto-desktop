export function filterReferences(items, query = '', niche = 'all', goal = 'all') {
  const q = query.trim().toLocaleLowerCase('pt-BR');
  return items.filter(item => {
    const haystack = [item.theme, item.hook, item.deliverable, item.reason, item.niche, item.author]
      .join(' ')
      .toLocaleLowerCase('pt-BR');
    return (!q || haystack.includes(q))
      && (niche === 'all' || item.niche === niche)
      && (goal === 'all' || item.goal === goal);
  });
}

export function replaceReferenceAttachment(attachments, item, dataUrl) {
  const kept = attachments.filter(attachment => !attachment.referenceId);
  if (kept.length >= 6) return { attachments, added: false };
  return {
    attachments: [...kept, {
      name: `Referência ${item.sourceId} · ${item.author}.webp`,
      dataUrl,
      referenceId: item.id,
    }],
    added: true,
  };
}
