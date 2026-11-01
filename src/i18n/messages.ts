/* Généré une fois : un fichier JSON par langue et par espace de noms (messages/{langue}/{espace}.json). */
import type { Locale } from "./routing";

import en_meta from "../../messages/en/meta.json";
import en_common from "../../messages/en/common.json";
import en_nav from "../../messages/en/nav.json";
import en_shell from "../../messages/en/shell.json";
import en_home from "../../messages/en/home.json";
import en_how from "../../messages/en/how.json";
import en_onboarding from "../../messages/en/onboarding.json";
import en_login from "../../messages/en/login.json";
import en_evidence from "../../messages/en/evidence.json";
import en_chat from "../../messages/en/chat.json";
import en_results from "../../messages/en/results.json";
import en_search from "../../messages/en/search.json";
import en_booking from "../../messages/en/booking.json";
import en_network from "../../messages/en/network.json";
import en_guest from "../../messages/en/guest.json";
import en_memory from "../../messages/en/memory.json";
import en_circle from "../../messages/en/circle.json";
import en_sources from "../../messages/en/sources.json";
import en_privacy from "../../messages/en/privacy.json";
import en_profile from "../../messages/en/profile.json";
import en_edge from "../../messages/en/edge.json";
import en_import from "../../messages/en/import.json";
import en_api from "../../messages/en/api.json";
import fr_meta from "../../messages/fr/meta.json";
import fr_common from "../../messages/fr/common.json";
import fr_nav from "../../messages/fr/nav.json";
import fr_shell from "../../messages/fr/shell.json";
import fr_home from "../../messages/fr/home.json";
import fr_how from "../../messages/fr/how.json";
import fr_onboarding from "../../messages/fr/onboarding.json";
import fr_login from "../../messages/fr/login.json";
import fr_evidence from "../../messages/fr/evidence.json";
import fr_chat from "../../messages/fr/chat.json";
import fr_results from "../../messages/fr/results.json";
import fr_search from "../../messages/fr/search.json";
import fr_booking from "../../messages/fr/booking.json";
import fr_network from "../../messages/fr/network.json";
import fr_guest from "../../messages/fr/guest.json";
import fr_memory from "../../messages/fr/memory.json";
import fr_circle from "../../messages/fr/circle.json";
import fr_sources from "../../messages/fr/sources.json";
import fr_privacy from "../../messages/fr/privacy.json";
import fr_profile from "../../messages/fr/profile.json";
import fr_edge from "../../messages/fr/edge.json";
import fr_import from "../../messages/fr/import.json";
import fr_api from "../../messages/fr/api.json";
import he_meta from "../../messages/he/meta.json";
import he_common from "../../messages/he/common.json";
import he_nav from "../../messages/he/nav.json";
import he_shell from "../../messages/he/shell.json";
import he_home from "../../messages/he/home.json";
import he_how from "../../messages/he/how.json";
import he_onboarding from "../../messages/he/onboarding.json";
import he_login from "../../messages/he/login.json";
import he_evidence from "../../messages/he/evidence.json";
import he_chat from "../../messages/he/chat.json";
import he_results from "../../messages/he/results.json";
import he_search from "../../messages/he/search.json";
import he_booking from "../../messages/he/booking.json";
import he_network from "../../messages/he/network.json";
import he_guest from "../../messages/he/guest.json";
import he_memory from "../../messages/he/memory.json";
import he_circle from "../../messages/he/circle.json";
import he_sources from "../../messages/he/sources.json";
import he_privacy from "../../messages/he/privacy.json";
import he_profile from "../../messages/he/profile.json";
import he_edge from "../../messages/he/edge.json";
import he_import from "../../messages/he/import.json";
import he_api from "../../messages/he/api.json";

export const NAMESPACES = ["meta", "common", "nav", "shell", "home", "how", "onboarding", "login", "evidence", "chat", "results", "search", "booking", "network", "guest", "memory", "circle", "sources", "privacy", "profile", "edge", "import", "api"] as const;

export type Messages = Record<(typeof NAMESPACES)[number], Record<string, unknown>>;

export const MESSAGES: Record<Locale, Messages> = {
  en: { meta: en_meta, common: en_common, nav: en_nav, shell: en_shell, home: en_home, how: en_how, onboarding: en_onboarding, login: en_login, evidence: en_evidence, chat: en_chat, results: en_results, search: en_search, booking: en_booking, network: en_network, guest: en_guest, memory: en_memory, circle: en_circle, sources: en_sources, privacy: en_privacy, profile: en_profile, edge: en_edge, import: en_import, api: en_api },
  fr: { meta: fr_meta, common: fr_common, nav: fr_nav, shell: fr_shell, home: fr_home, how: fr_how, onboarding: fr_onboarding, login: fr_login, evidence: fr_evidence, chat: fr_chat, results: fr_results, search: fr_search, booking: fr_booking, network: fr_network, guest: fr_guest, memory: fr_memory, circle: fr_circle, sources: fr_sources, privacy: fr_privacy, profile: fr_profile, edge: fr_edge, import: fr_import, api: fr_api },
  he: { meta: he_meta, common: he_common, nav: he_nav, shell: he_shell, home: he_home, how: he_how, onboarding: he_onboarding, login: he_login, evidence: he_evidence, chat: he_chat, results: he_results, search: he_search, booking: he_booking, network: he_network, guest: he_guest, memory: he_memory, circle: he_circle, sources: he_sources, privacy: he_privacy, profile: he_profile, edge: he_edge, import: he_import, api: he_api },
};
