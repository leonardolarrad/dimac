/** @odoo-module **/
// Punto de entrada del webclient D21.
// Reemplaza web/static/src/main.js para iniciar D21WebClient en lugar de WebClient.
import { startWebClient } from "@web/start";
import { D21WebClient } from "./webclient/webclient";

startWebClient(D21WebClient);
