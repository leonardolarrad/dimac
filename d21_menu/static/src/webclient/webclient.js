/** @odoo-module **/
// WebClient extendido para usar D21NavBar y el servicio home_menu.
// Reemplaza la navbar por defecto con la versión Enterprise-like y
// muestra el HomeMenu como pantalla por defecto cuando no hay acción.
import { WebClient } from "@web/webclient/webclient";
import { useService } from "@web/core/utils/hooks";
import { D21NavBar } from "./navbar/navbar";

export class D21WebClient extends WebClient {
    static components = {
        ...WebClient.components,
        NavBar: D21NavBar,
    };

    setup() {
        /** Inicializa el webclient D21 con el servicio home_menu. */
        super.setup();
        this.hm = useService("home_menu");
    }

    _loadDefaultApp() {
        /** Muestra el HomeMenu cuando no hay acción por defecto. */
        return this.hm.toggle(true);
    }
}
