export function addTagToState(tags: any[], newTag: any) {
  if (tags.some((t) => t.id === newTag.id || t.name === newTag.name)) return tags;
  return [...tags, newTag];
}

export function removeTagFromState(tags: any[], tagId: number) {
  return tags.filter((t) => t.id !== tagId);
} 