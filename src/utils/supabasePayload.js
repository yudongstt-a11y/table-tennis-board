export function cleanInsertPayload(payload) {
  const copy = { ...payload };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.createdAt;
  delete copy.updatedAt;

  Object.keys(copy).forEach((key) => {
    if (copy[key] === undefined) {
      delete copy[key];
    }
  });

  return copy;
}

export function cleanUpdatePayload(payload) {
  return cleanInsertPayload(payload);
}
