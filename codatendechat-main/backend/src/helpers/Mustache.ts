import Mustache from "mustache";
import Contact from "../models/Contact";
import MessageVariable from "../models/MessageVariable";

export const greeting = (): string => {
  const greetings = ["Buenas madrugadas", "Buenos días", "Buenas tardes", "Buenas noches"];
  const h = new Date().getHours();
  // eslint-disable-next-line no-bitwise
  return greetings[(h / 6) >> 0];
};

export const firstName = (contact?: Contact): string => {
  if (contact && contact?.name) {
    const nameArr = contact?.name.split(' ');
    return nameArr[0];
  }
  return '';
};

// In-memory cache for custom variables per company (refreshes every 60s)
const customVarCache: Map<number, { vars: Record<string, string>; ts: number }> = new Map();
const CACHE_TTL = 60000;

const getCustomVars = (companyId: number): Record<string, string> => {
  const cached = customVarCache.get(companyId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.vars;
  }
  // Refresh cache in background
  MessageVariable.findAll({ where: { companyId } })
    .then(vars => {
      const varMap: Record<string, string> = {};
      for (const v of vars) {
        varMap[v.key] = v.value || "";
      }
      customVarCache.set(companyId, { vars: varMap, ts: Date.now() });
    })
    .catch(() => {});
  return cached ? cached.vars : {};
};

export const clearCustomVarCache = (companyId: number): void => {
  customVarCache.delete(companyId);
};

export default (body: string, contact: Contact): string => {
  let ms = "";

  const Hr = new Date();

  const dd: string = `0${Hr.getDate()}`.slice(-2);
  const mm: string = `0${Hr.getMonth() + 1}`.slice(-2);
  const yy: string = Hr.getFullYear().toString();
  const hh: number = Hr.getHours();
  const min: string = `0${Hr.getMinutes()}`.slice(-2);
  const ss: string = `0${Hr.getSeconds()}`.slice(-2);

  if (hh >= 6) {
    ms = "Buenos días";
  }
  if (hh > 11) {
    ms = "Buenas tardes";
  }
  if (hh > 17) {
    ms = "Buenas noches";
  }
  if (hh > 23 || hh < 6) {
    ms = "Buenas madrugadas";
  }

  const protocol = yy + mm + dd + String(hh) + min + ss;

  const hora = `${hh}:${min}:${ss}`;
  const fecha = `${dd}/${mm}/${yy}`;

  const view: Record<string, string> = {
    firstName: firstName(contact),
    name: contact ? contact.name : "",
    gretting: greeting(),
    ms,
    protocol,
    hora,
    fecha,
    phoneNumber: contact ? contact.number : "",
    email: contact ? contact.email : "",
    companyName: contact ? (contact.companyName || "") : "",
  };

  // Merge custom variables from cache
  if (contact && contact.companyId) {
    const customVars = getCustomVars(contact.companyId);
    Object.assign(view, customVars);
  }

  return Mustache.render(body, view);
};