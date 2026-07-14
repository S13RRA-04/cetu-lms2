export function isScenarioDropContent(item) {
  return item?.drop_number != null || item?.source_drop_number != null;
}
