import assert from "node:assert/strict";
import test from "node:test";
const placeholder = /^(?:公开资料待补全|平台请以官方公告为准|暂无简介|暂无|未知|待补全|未公开|n\/a|无)$/i;
const isPlaceholder = (value) => !String(value ?? "").trim() || placeholder.test(String(value).trim());
const auditRecord = (record, fields) => {
  const missing = fields.filter((field) => isPlaceholder(record[field]));
  return { valid: Boolean(record.id) && missing.length < fields.length, missing, coverage: 1 - missing.length / fields.length };
};

test("quality rejects forbidden placeholder values and reports coverage", () => {
  assert.equal(isPlaceholder("公开资料待补全"), true);
  assert.equal(isPlaceholder("平台请以官方公告为准"), true);
  assert.equal(isPlaceholder("真实标题"), false);
  const result = auditRecord({ id: "age-1", title: "真实标题", sourceNote: "AGE" }, ["id", "title", "coverImage", "sourceNote"]);
  assert.equal(result.valid, true);
  assert.equal(result.coverage, 0.75);
  assert.deepEqual(result.missing, ["coverImage"]);
});
