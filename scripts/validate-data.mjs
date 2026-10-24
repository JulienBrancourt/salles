// Contrôle des fichiers de données : node scripts/validate-data.mjs [dossier]
// Sans dépendance. Lit les schémas de schemas/ (sous-ensemble de JSON Schema :
// type, required, properties, additionalProperties, items, minItems, minLength,
// minimum, pattern, $ref) et ajoute des contrôles métier.
// Code de sortie : 1 s'il y a des erreurs, 0 sinon (les avertissements ne bloquent pas).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const errors = [];
const warnings = [];

function load(path) {
  const text = readFileSync(join(root, path), "utf8");
  try {
    return JSON.parse(text);
  } catch (e) {
    const pos = /position (\d+)/.exec(e.message)?.[1];
    const line = pos ? ` (ligne ${text.slice(0, Number(pos)).split("\n").length})` : "";
    errors.push(`${path} : JSON invalide${line} — ${e.message}`);
    return null;
  }
}

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);

function check(schema, value, path, rootSchema) {
  if (schema.$ref) schema = { ...schema.$ref.slice(2).split("/").reduce((o, k) => o[k], rootSchema), ...schema, $ref: undefined };
  const t = typeOf(value);
  const allowed = [].concat(schema.type ?? []);
  if (allowed.length && !allowed.some((a) => a === t || (a === "number" && t === "integer"))) {
    errors.push(`${path} : type « ${t} » au lieu de ${allowed.join(" ou ")}`);
    return;
  }
  if (t === "string") {
    if (schema.minLength && value.length < schema.minLength) errors.push(`${path} : valeur vide`);
    else if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push(`${path} : « ${value} » ne respecte pas le format attendu${schema.description ? ` — ${schema.description}` : ""}`);
    }
  }
  if (t === "integer" && schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} : ${value} < ${schema.minimum}`);
  if (t === "array") {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${path} : tableau vide`);
    value.forEach((item, i) => {
      const id = item && typeof item === "object" ? item.code ?? item.prenom ?? item.nom : undefined;
      check(schema.items ?? {}, item, `${path}[${i}]${id ? ` « ${id} »` : ""}`, rootSchema);
    });
  }
  if (t === "object") {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${path} : clé « ${k} » manquante`);
    for (const k of Object.keys(value)) {
      if (schema.properties?.[k]) check(schema.properties[k], value[k], `${path}.${k}`, rootSchema);
      else if (schema.additionalProperties === false) errors.push(`${path} : clé inconnue « ${k} » (faute de frappe ?)`);
    }
  }
}

function validate(file, schemaFile, extra) {
  const data = load(file);
  const schema = load(schemaFile);
  if (!data || !schema) return;
  check(schema, data, file, schema);
  if (Array.isArray(data)) extra(data);
  console.log(`${file} : ${Array.isArray(data) ? data.length + " entrées" : "contenu inattendu"}`);
}

const doublons = (liste, cle) => {
  const vus = new Set();
  return liste.filter((x) => typeof x[cle] === "string" && (vus.has(x[cle]) ? true : (vus.add(x[cle]), false)));
};

validate("data.json", "schemas/salles.schema.json", (salles) => {
  for (const s of doublons(salles, "code")) errors.push(`data.json : code en double « ${s.code} »`);
  for (const s of doublons(salles, "nom")) warnings.push(`data.json : nom en double « ${s.nom} »`);
  for (const s of salles) {
    if (typeof s.code === "string" && !/^(CITA|SC)/.test(s.code)) {
      warnings.push(`data.json « ${s.code} » : le code ne commence ni par CITA ni par SC, la salle n'apparaît que sous « Tous les sites »`);
    }
    if (s.categorie === "") warnings.push(`data.json « ${s.code} » : catégorie vide`);
    if (s.batiment === "") warnings.push(`data.json « ${s.code} » : bâtiment vide`);
  }
});

validate("annuaireData.json", "schemas/annuaire.schema.json", (contacts) => {
  for (const c of doublons(contacts.filter((x) => x.mail), "mail")) warnings.push(`annuaireData.json : mail en double « ${c.mail} »`);
});

warnings.forEach((w) => console.warn(`⚠  ${w}`));
errors.forEach((e) => console.error(`✗  ${e}`));
console.log(errors.length ? `\n${errors.length} erreur(s), ${warnings.length} avertissement(s).` : `\nOK : aucune erreur, ${warnings.length} avertissement(s).`);
process.exit(errors.length ? 1 : 0);
