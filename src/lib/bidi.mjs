// Bidi helper for values that must read left-to-right inside Arabic (RTL) text.
//
// A phone number such as "+9715..." is bidi-neutral at its leading "+": with an
// RTL paragraph around it the plus takes the paragraph direction and renders
// after the digits ("9715...+"). Wrapping the value in LRM marks (U+200E) pins
// it to its own LTR run so it reads the way it was typed.
//
// Use this in plain-text mail bodies and in email/PDF HTML, where a client may
// strip dir attributes or CSS. In React UI prefer <bdi dir="ltr">{value}</bdi>,
// which browsers already isolate. Display only - never store the marked value.
export function ltrIsolate(value) {
  const text = String(value ?? "");
  return text ? `\u200E${text}\u200E` : text;
}
