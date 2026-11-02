const modules = import.meta.glob("../assets/references/*.webp", {
  eager: true,
  query: "?inline",
  import: "default",
});

export const REFERENCE_IMAGES = Object.fromEntries(
  Object.entries(modules).map(([path, dataUrl]) => [path.split("/").pop().replace(".webp", ""), dataUrl]),
);
